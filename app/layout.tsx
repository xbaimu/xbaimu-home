import type { Metadata } from "next";
import { connection } from "next/server";
import { getHomeContent } from "@/lib/server/home-content";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/comfortaa/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { site } = await getHomeContent();
  return { title: site.title, description: site.description || undefined };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
