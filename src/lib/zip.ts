// Minimal ZIP file writer (store method only).
// Creates a ZIP with identical folder structure from a map of path -> bytes.

const SIG_LOC = 0x04034b50; // Local file header signature
const SIG_CEN = 0x02014b50; // Central directory header signature
const SIG_EOCD = 0x06054b50; // End of central dir signature

function textEncoder() {
  return new TextEncoder();
}

// CRC32 implementation
let CRC_TABLE: number[] | null = null;
function makeCrcTable() {
  const table = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  CRC_TABLE = table;
}

export function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) makeCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = (CRC_TABLE![(c ^ data[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

type CentralRecord = {
  nameBytes: Uint8Array;
  crc: number;
  csize: number;
  usize: number;
  offset: number;
  isDirectory: boolean;
};

function dosTimeDate() {
  // Optional: pack JS date to DOS time/date fields.
  // Many tools ignore for store-only; we can set zero.
  return { time: 0, date: 0 };
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true);
}
function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

export function zipFromMap(files: Map<string, Uint8Array>): Uint8Array {
  // Ensure directories are present
  const dirSet = new Set<string>();
  for (const path of files.keys()) {
    const parts = path.split("/");
    let acc = "";
    for (let i = 0; i < parts.length - 1; i++) {
      acc += (i ? "/" : "") + parts[i];
      dirSet.add(acc + "/");
    }
  }
  const dirList = Array.from(dirSet).sort();

  type Chunk = Uint8Array;
  const chunks: Chunk[] = [];
  const central: CentralRecord[] = [];
  let offset = 0;
  const te = textEncoder();

  const writeLocal = (name: string, data: Uint8Array | null) => {
    const nameBytes = te.encode(name);
    const isDirectory = name.endsWith("/");
    const content = data ?? new Uint8Array(0);
    const { time, date } = dosTimeDate();
    const crc = isDirectory ? 0 : crc32(content);
    const usize = content.byteLength;
    const csize = usize; // store method
    const header = new Uint8Array(30);
    const hv = new DataView(header.buffer);
    writeUint32LE(hv, 0, SIG_LOC);
    writeUint16LE(hv, 4, 20); // version needed
    writeUint16LE(hv, 6, 0x0800); // gp flag: UTF-8
    writeUint16LE(hv, 8, 0); // method store
    writeUint16LE(hv, 10, time);
    writeUint16LE(hv, 12, date);
    writeUint32LE(hv, 14, crc);
    writeUint32LE(hv, 18, csize);
    writeUint32LE(hv, 22, usize);
    writeUint16LE(hv, 26, nameBytes.byteLength);
    writeUint16LE(hv, 28, 0); // extra len

    const locOffset = offset;
    chunks.push(header);
    offset += header.byteLength;
    chunks.push(nameBytes);
    offset += nameBytes.byteLength;
    if (!isDirectory) {
      chunks.push(content);
      offset += content.byteLength;
    }
    central.push({
      nameBytes,
      crc,
      csize,
      usize,
      offset: locOffset,
      isDirectory,
    });
  };

  // Write directories first
  for (const d of dirList) {
    writeLocal(d, null);
  }
  // Then files
  for (const [name, data] of Array.from(files.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    writeLocal(name, data);
  }

  const centralStart = offset;
  // Central directory records
  for (const rec of central) {
    const {
      nameBytes,
      crc,
      csize,
      usize,
      offset: locOffset,
      isDirectory,
    } = rec;
    const { time, date } = dosTimeDate();
    const hdr = new Uint8Array(46);
    const dv = new DataView(hdr.buffer);
    writeUint32LE(dv, 0, SIG_CEN);
    writeUint16LE(dv, 4, 20); // version made by
    writeUint16LE(dv, 6, 20); // version needed
    writeUint16LE(dv, 8, 0x0800); // gp flag: UTF-8
    writeUint16LE(dv, 10, 0); // method
    writeUint16LE(dv, 12, time);
    writeUint16LE(dv, 14, date);
    writeUint32LE(dv, 16, crc);
    writeUint32LE(dv, 20, csize);
    writeUint32LE(dv, 24, usize);
    writeUint16LE(dv, 28, nameBytes.byteLength);
    writeUint16LE(dv, 30, 0); // extra len
    writeUint16LE(dv, 32, 0); // comment len
    writeUint16LE(dv, 34, 0); // disk number
    writeUint16LE(dv, 36, 0); // internal attrs
    // external attrs: set directory bit for directories (optional)
    writeUint32LE(dv, 38, isDirectory ? 0x10 : 0);
    writeUint32LE(dv, 42, locOffset);
    chunks.push(hdr);
    offset += hdr.byteLength;
    chunks.push(nameBytes);
    offset += nameBytes.byteLength;
  }
  const centralEnd = offset;
  const centralSize = centralEnd - centralStart;

  // EOCD
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeUint32LE(ev, 0, SIG_EOCD);
  writeUint16LE(ev, 4, 0); // disk
  writeUint16LE(ev, 6, 0); // disk where central dir starts
  writeUint16LE(ev, 8, central.length); // entries this disk
  writeUint16LE(ev, 10, central.length); // total entries
  writeUint32LE(ev, 12, centralSize);
  writeUint32LE(ev, 16, centralStart);
  writeUint16LE(ev, 20, 0); // comment len
  chunks.push(eocd);
  offset += eocd.byteLength;

  // Merge chunks
  const out = new Uint8Array(offset);
  let p = 0;
  for (const ch of chunks) {
    out.set(ch, p);
    p += ch.byteLength;
  }
  return out;
}
