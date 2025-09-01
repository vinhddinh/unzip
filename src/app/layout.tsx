import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unzip | vinhddinh",
  description: "Client-side ZIP unzipper with recursive extraction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh flex flex-col overflow-hidden overscroll-y-none`}
      >
        {children}
        <footer className="shrink-0 border-t border-border py-2 text-center text-xs text-muted-foreground">
          Made by
          <a
            href="https://github.com/vinhddinh"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {" "}
            vinhddinh
          </a>
        </footer>
      </body>
    </html>
  );
}
