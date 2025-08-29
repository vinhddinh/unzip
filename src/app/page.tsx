"use client";

import ZipUnzipper from "@/components/zip-unzipper";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <h1 className="text-2xl font-bold mb-6">Unzip</h1>
      <ZipUnzipper />
    </div>
  );
}
