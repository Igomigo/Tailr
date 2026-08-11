import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tailr — the AI resume builder you talk to",
  description:
    "Paste a job description, refine your resume through conversation, and generate a polished, ATS-ready PDF.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
