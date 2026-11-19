import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grainox — Universal Web Toolkit",
  description: "AI Image Upscaler, Social Media Downloader, Universal File Converter. Fast, client-side first, no signup required.",
  icons: {
    icon: [
      { url: "/grainox-icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/grainox-icon.png",
    apple: "/grainox-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-grain-bg text-slate-100 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
