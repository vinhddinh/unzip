"use client";

import ZipUnzipper from "@/components/zip-unzipper";

export default function Home() {
  return (
    <main className="flex-1 min-h-0 overflow-hidden bg-background text-foreground p-6 sm:p-10">
      <div className="h-full min-h-0">
        <ZipUnzipper />
      </div>
    </main>
  );
}
