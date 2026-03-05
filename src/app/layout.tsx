import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UODP 2.0 — Urban Climate Intelligence Platform · Delhi NCR",
  description: "Next-generation satellite-driven environmental monitoring platform. AI-powered oxygen stress prediction, tree survival modeling, budget optimization, and 4-year climate impact simulation for Delhi NCR.",
  keywords: ["Delhi", "environmental monitoring", "satellite", "AI", "tree plantation", "OSI", "climate"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: 'Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
