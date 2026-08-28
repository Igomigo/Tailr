import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const TITLE = "Tailr - the AI resume builder you talk to";

const DESCRIPTION =
  "Paste a job description, chat with AI to refine your resume, and generate a polished, ATS-ready PDF.";

/**
 * Absolute base for social images.
 *
 * Facebook, LinkedIn, and X fetch preview images from their own servers, so a
 * relative path cannot be resolved. Without this, Next falls back to localhost
 * and every shared link renders without an image.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tailr.igomigofatai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // The icons and the share image are picked up from app/icon.png,
  // app/apple-icon.png, and app/opengraph-image.png by filename, so declaring
  // them here as well would emit a second, unhashed tag pointing at a path
  // that does not exist.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Tailr",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  // Prevents iOS from zooming when the message input receives focus.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
