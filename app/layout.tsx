import type { Metadata } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  const title = "AI Workshop Hub";
  const description = "A teacher-led community for student AI projects and teacher-made learning tools.";
  return {
    title: { default: title, template: "%s · AI Workshop Hub" },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { type: "website", siteName: title, title, description, images: [{ url: socialImage, width: 1200, height: 800, alt: "AI Workshop Hub — Ideas become interactive." }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
