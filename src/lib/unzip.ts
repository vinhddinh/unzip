// Minimal ZIP reader using Web APIs (DecompressionStream) for methods 0 and 8.
// Parses central directory to locate entries, then reads and (if needed) inflates payloads.

export type ZipEntry = {
  name: string;
  method: number; // 0 = store, 8 = deflate
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  isDirectory: boolean;
};

const SIG_EOCD = 0x06054b50; // End of Central Directory
const SIG_CEN = 0x02014b50; // Central Directory File Header
const SIG_LOC = 0x04034b50; // Local File Header

function findEOCD(view: DataView): { cdirOffset: number; cdirSize: number } {
  // Search last 64k for EOCD signature
  const len = view.byteLength;
  const maxBack = Math.min(0x10000 + 22, len); // comment up to 65535 + min EOCD size 22
  for (let i = len - 22; i >= len - maxBack; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      const cdirSize = view.getUint32(i + 12, true);
      const cdirOffset = view.getUint32(i + 16, true);
      return { cdirOffset, cdirSize };
    }
  }
  throw new Error("EOCD (end of central directory) not found. Not a valid ZIP?");
}

function readCString(view: DataView, offset: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  // decode as UTF-8
  return new TextDecoder().decode(bytes);
}

function parseCentralDirectory(view: DataView, cdirOffset: number, cdirSize: number): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let p = cdirOffset;
  const end = cdirOffset + cdirSize;
  while (p < end) {
    const sig = view.getUint32(p, true);
    if (sig !== SIG_CEN) throw new Error("Central directory corrupted at offset " + p);
    const generalPurpose = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    // const lastModTime = view.getUint16(p + 12, true);
    // const lastModDate = view.getUint16(p + 14, true);
    // We use sizes from central directory to handle data-descriptor cases
    const crc32 = view.getUint32(p + 16, true);
    const compressedSize = view.getUint32(p + 20, true);
    const uncompressedSize = view.getUint32(p + 24, true);
    const fileNameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    // const diskNoStart = view.getUint16(p + 34, true);
    // const intAttr = view.getUint16(p + 36, true);
    // const extAttr = view.getUint32(p + 38, true);
    const localHeaderOffset = view.getUint32(p + 42, true);
    const name = readCString(view, p + 46, fileNameLen);
    const isDirectory = name.endsWith("/");
    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      isDirectory,
    });
    p += 46 + fileNameLen + extraLen + commentLen;
  }
  return entries;
}

function dataOffsetFromLocalHeader(view: DataView, localHeaderOffset: number): number {
  // local header structure: sig(4) ver(2) flag(2) method(2) time(2) date(2) crc(4) csize(4) usize(4) fnlen(2) extralen(2)
  if (view.getUint32(localHeaderOffset, true) !== SIG_LOC) {
    throw new Error("Local file header not found at offset " + localHeaderOffset);
  }
  const nameLen = view.getUint16(localHeaderOffset + 26, true);
  const extraLen = view.getUint16(localHeaderOffset + 28, true);
  return localHeaderOffset + 30 + nameLen + extraLen;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // Try deflate-raw first; fallback to deflate if needed
  const inflateWith = async (format: "deflate-raw" | "deflate") => {
    const ds = new DecompressionStream(format);
    const part = data.slice().buffer;
    const stream = new Blob([part]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  };
  try {
    return await inflateWith("deflate-raw");
  } catch {
    return await inflateWith("deflate");
  }
}

export async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer);
  const { cdirOffset, cdirSize } = findEOCD(view);
  const entries = parseCentralDirectory(view, cdirOffset, cdirSize);
  const out = new Map<string, Uint8Array>();
  for (const e of entries) {
    if (e.isDirectory) continue;
    const dataStart = dataOffsetFromLocalHeader(view, e.localHeaderOffset);
    const comp = new Uint8Array(view.buffer, view.byteOffset + dataStart, e.compressedSize);
    let content: Uint8Array;
    if (e.method === 0) {
      content = new Uint8Array(comp);
    } else if (e.method === 8) {
      content = await inflateRaw(comp);
    } else {
      // Unsupported method — skip file
      // You may extend with other methods if needed.
      continue;
    }
    out.set(e.name, content);
  }
  return out;
}

export async function unzipRecursively(
  rootBytes: ArrayBuffer,
  options?: { zipFolderNameSuffix?: string }
): Promise<Map<string, Uint8Array>> {
  const suffix = options?.zipFolderNameSuffix ?? "";
  const result = new Map<string, Uint8Array>();

  async function processZip(bytes: ArrayBuffer, basePath: string) {
    const entries = await unzip(bytes);
    for (const [name, data] of entries) {
      const normalized = name.replace(/^\/+/, "");
      if (normalized.endsWith("/")) continue; // skip dirs
      if (normalized.toLowerCase().endsWith(".zip")) {
        const nestedBase = normalized.replace(/\/[^/]+$/, "/") +
          normalized.split("/").pop()!.replace(/\.zip$/i, suffix || "");
        const folder = nestedBase.replace(/\/$/, "");
        const copy = data.slice();
        await processZip(copy.buffer, basePath ? `${basePath}/${folder}` : folder);
      } else {
        const fullPath = basePath ? `${basePath}/${normalized}` : normalized;
        result.set(fullPath, data);
      }
    }
  }

  await processZip(rootBytes, "");
  return result;
}

export function groupByFolders(paths: string[]): { folders: Set<string>; files: string[] } {
  const folders = new Set<string>();
  for (const p of paths) {
    const parts = p.split("/");
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  return { folders, files: paths };
}
