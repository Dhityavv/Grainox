export interface ToolItem {
  id: string;
  name: string;
  description: string;
  path: string;
  category: "ai" | "media" | "convert";
  icon: string;
  badge?: string;
  keywords: string[];
}

export const TOOLS_DATA: ToolItem[] = [
  {
    id: "upscale",
    name: "AI Image Upscaler",
    description: "Jernihkan foto buram & naikkan resolusi hingga 4x tanpa kehilangan detail.",
    path: "/tools/upscale",
    category: "ai",
    icon: "Sparkles",
    badge: "2x / 4x HD",
    keywords: ["hd foto", "upscale", "ai enhance", "gambar blur", "perjelas foto"],
  },
  {
    id: "downloader",
    name: "Social Media Downloader",
    description: "Unduh video TikTok no watermark, IG Reels, dan YouTube Shorts instan.",
    path: "/tools/downloader",
    category: "media",
    icon: "Download",
    badge: "No Watermark",
    keywords: ["tiktok", "instagram", "youtube", "reels", "shorts", "download video", "mp3"],
  },
  {
    id: "converter",
    name: "Universal File Converter",
    description: "Konversi format gambar, dokumen, dan audio langsung di browsermu.",
    path: "/tools/converter",
    category: "convert",
    icon: "ArrowRightLeft",
    badge: "Multi Format",
    keywords: ["convert", "png ke webp", "heic to jpg", "mp4 to mp3", "pdf", "konversi"],
  },
];
