import type { Metadata } from "next";
import { serverEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "NVLingo - Learn English Through Visual Novels",
  description:
    "Translate words and phrases directly in Ren'Py visual novels, save them to your personal dictionary, and practice on the website with progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  void serverEnv;

  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
