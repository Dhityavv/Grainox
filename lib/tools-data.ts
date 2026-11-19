export interface ToolItem {
  id: string;
  name: string;
  description: string;
  path: string;
  category: "ai" | "media" | "convert" | "pdf";
  icon: string;
  badge?: string;
  keywords: string[];
}

export const TOOLS_DATA: ToolItem[] = [
  {
    id: "upscale",
    name: "AI Image Upscaler",
    description: "Jernihkan foto anime & foto buram dengan Real-ESRGAN on-device hingga 4x.",
    path: "/tools/upscale",
    category: "ai",
    icon: "Sparkles",
    badge: "Real-ESRGAN",
    keywords: ["hd foto", "upscale", "ai enhance", "gambar blur", "perjelas foto", "anime"],
  },
  {
    id: "downloader",
    name: "Universal Media Downloader",
    description: "Unduh video TikTok no watermark, IG Reels (MP4 & MP3), dan YouTube instan.",
    path: "/tools/downloader",
    category: "media",
    icon: "Download",
    badge: "MP4 & MP3",
    keywords: ["tiktok", "instagram", "youtube", "reels", "shorts", "download video", "mp3"],
  },
  {
    id: "pdf-tools",
    name: "PDF Tools Suite",
    description: "Image to PDF (batch), PDF to Image, Protect PDF, Unlock PDF, dan Text to PDF.",
    path: "/tools/pdf",
    category: "pdf",
    icon: "FileText",
    badge: "5 Tools",
    keywords: ["pdf", "image to pdf", "pdf to image", "protect pdf", "unlock pdf", "text to pdf", "password pdf"],
  },
  {
    id: "converter",
    name: "Universal File & Data Converter",
    description: "Konversi format gambar, dokumen, video to MP3, data JSON/CSV, dan arsip ZIP.",
    path: "/tools/converter",
    category: "convert",
    icon: "ArrowRightLeft",
    badge: "Studio Suite",
    keywords: ["convert", "png ke webp", "video to mp3", "json to csv", "zip", "konversi"],
  },
];
