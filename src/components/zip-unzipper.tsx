"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { unzipRecursively } from "@/lib/unzip";
import { zipFromMap } from "@/lib/zip";

type Extracted = Map<string, Uint8Array>;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// no-op helper removed (save-to-folder replaced by ZIP download)

export default function ZipUnzipper() {
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<Extracted | null>(null);
  const [totalBytes, setTotalBytes] = React.useState(0);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onFiles = async (file: File) => {
    setError(null);
    setBusy(true);
    setFiles(null);
    setFileName(file.name);
    try {
      const ab = await file.arrayBuffer();
      const extracted = await unzipRecursively(ab);
      let sum = 0;
      for (const [, data] of extracted) sum += data.byteLength;
      setTotalBytes(sum);
      setFiles(extracted);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const item = e.dataTransfer?.items?.[0];
    if (item && item.kind === "file") {
      const f = e.dataTransfer.files[0];
      if (f) onFiles(f);
    }
  };

  const handleDownloadZip = async () => {
    if (!files) return;
    try {
      const zipBytes = zipFromMap(files);
      const blob = new Blob([zipBytes.slice().buffer], {
        type: "application/zip",
      });
      const a = document.createElement("a");
      const name = fileName ? fileName.replace(/\.zip$/i, "") : "archive";
      a.download = `unzipped-${name}.zip`;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const entries = files
    ? Array.from(files.keys()).sort((a, b) => a.localeCompare(b))
    : [];

  return (
    <div className="h-full max-h-full w-full max-w-4xl mx-auto">
      <Card className="max-h-full flex flex-col">
        <CardHeader>
          <CardTitle>Recursive ZIP Unzipper</CardTitle>
          <CardDescription>
            Client-side only. Drop a .zip; nested zips auto-extract into a flat
            folder structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-full flex-auto min-h-0 flex flex-col">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors " +
              (dragOver
                ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
                : "border-neutral-300 dark:border-neutral-700")
            }
          >
            <p className="mb-3 font-medium">Drag and drop a .zip file here</p>
            <p className="text-sm text-neutral-500 mb-4">
              or choose a file below
            </p>
            <div className="flex items-center justify-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFiles(f);
                }}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
            </div>
            {fileName && (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Selected: {fileName}
              </p>
            )}
          </div>

          {busy && (
            <div className="mt-6 text-sm">
              Unzipping… This may take a moment.
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {files && !busy && (
            <div className="mt-3 flex-auto min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Extracted {entries.length} files • Total{" "}
                  {formatBytes(totalBytes)}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleDownloadZip}>Download as ZIP</Button>
                </div>
              </div>
              <div className="mt-3 border rounded-md border-neutral-200 dark:border-neutral-800 flex-auto min-h-0 flex flex-col">
                <ScrollArea className="flex-auto min-h-0 overflow-y-scroll">
                  <ul className="text-sm">
                    {entries.map((p) => (
                      <li
                        key={p}
                        className="flex items-center justify-between border-b last:border-b-0 border-neutral-100 dark:border-neutral-800 px-3 py-2"
                      >
                        <span className="font-mono text-xs break-all">{p}</span>
                        <Button asChild size="sm">
                          <a
                            href={URL.createObjectURL(
                              new Blob([
                                ((): ArrayBuffer => {
                                  const d = files.get(p)!;
                                  const copy = d.slice();
                                  return copy.buffer;
                                })(),
                              ])
                            )}
                            download={p.split("/").pop()!}
                          >
                            Download
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-neutral-500">
            Tip: Use “Download as ZIP” to get a single archive preserving
            structure.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
