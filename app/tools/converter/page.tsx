"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText,
  FileImage,
  Lock,
  Unlock,
  Type,
  Video,
  Music,
  Archive,
  Database,
  ArrowRightLeft,
  ArrowLeft,
  Upload,
  Download,
  Check,
  CheckCircle2,
  Trash2,
  Sliders,
  Sparkles,
  Layers,
  Copy,
  AlertCircle,
  Eye,
  FilePlus,
  RefreshCw,
} from "lucide-react";
import CleanLink from "@/components/ui/CleanLink";
import Button from "@/components/ui/Button";
import ShimmerButton from "@/components/ui/ShimmerButton";
import BorderBeam from "@/components/ui/BorderBeam";
import ToolAnalyticsBar from "@/components/analytics/ToolAnalyticsBar";
import { recordToolUsage } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";
import {
  imagesToPdf,
  protectPdf,
  unlockPdf,
  textToPdf,
  pdfToImages,
  compressPdf,
  type ExtractedPdfPage,
} from "@/lib/pdf-tools";
import {
  compressImage,
  batchCompressImages,
  type CompressedImageResult,
} from "@/lib/image-compressor";
import { jsonToCsv, csvToJson, jsonToYaml } from "@/lib/data-converter";
import {
  extractAudioFromVideo,
  createZipArchive,
  extractZipArchive,
  type ZipEntryItem,
} from "@/lib/media-converter";

type CategoryId = "all" | "pdf" | "image" | "audio-video" | "data" | "archive";

type ToolId =
  | "image-to-pdf"
  | "pdf-to-image"
  | "protect-pdf"
  | "unlock-pdf"
  | "text-to-pdf"
  | "compress-pdf"
  | "image-converter"
  | "compress-image"
  | "video-to-mp3"
  | "data-studio"
  | "zip-studio";

interface ConverterPageProps {
  initialCategory?: CategoryId;
  initialTool?: ToolId;
}

export default function ConverterPage({
  initialCategory = "all",
  initialTool,
}: ConverterPageProps) {
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<CategoryId>(initialCategory);
  const [activeTool, setActiveTool] = useState<ToolId | null>(initialTool || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  // Image to PDF states
  const [imgPdfFiles, setImgPdfFiles] = useState<File[]>([]);
  const [imgPdfResultUrl, setImgPdfResultUrl] = useState<string | null>(null);
  const [imgPdfResultBlob, setImgPdfResultBlob] = useState<Blob | null>(null);
  const [isProcessingImgPdf, setIsProcessingImgPdf] = useState(false);
  const [imgPdfProgress, setImgPdfProgress] = useState<{ current: number; total: number } | null>(null);

  // PDF to Image states
  const [pdfToImgFile, setPdfToImgFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<ExtractedPdfPage[]>([]);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtractProgress, setPdfExtractProgress] = useState<{ current: number; total: number } | null>(null);

  // Protect PDF states
  const [protectFile, setProtectFile] = useState<File | null>(null);
  const [protectPassword, setProtectPassword] = useState("");
  const [protectResultUrl, setProtectResultUrl] = useState<string | null>(null);
  const [isProtecting, setIsProtecting] = useState(false);
  const [protectError, setProtectError] = useState("");

  // Unlock PDF states
  const [unlockFile, setUnlockFile] = useState<File | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockResultUrl, setUnlockResultUrl] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  // Text to PDF states
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textFontSize, setTextFontSize] = useState(11);
  const [textPdfUrl, setTextPdfUrl] = useState<string | null>(null);
  const [isGeneratingTextPdf, setIsGeneratingTextPdf] = useState(false);

  // Universal Image Converter states
  const [imgFormat, setImgFormat] = useState<"webp" | "png" | "jpeg" | "ico">("webp");
  const [imgQuality, setImgQuality] = useState(90);
  const [imageBatch, setImageBatch] = useState<
    { id: string; file: File; preview: string; convertedUrl?: string; convertedSize?: string; status: string }[]
  >([]);
  const [isConvertingImages, setIsConvertingImages] = useState(false);

  // Video to MP3 states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioResultUrl, setAudioResultUrl] = useState<string | null>(null);
  const [audioResultBlob, setAudioResultBlob] = useState<Blob | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Data Studio states
  const [dataMode, setDataMode] = useState<"json-to-csv" | "csv-to-json" | "json-to-yaml">("json-to-csv");
  const [dataInput, setDataInput] = useState("");
  const [dataOutput, setDataOutput] = useState("");
  const [dataError, setDataError] = useState("");
  const [copiedData, setCopiedData] = useState(false);

  // ZIP Studio states
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [zipResultUrl, setZipResultUrl] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipEntries, setZipEntries] = useState<ZipEntryItem[]>([]);

  // PDF Compression states
  const [compressPdfFile, setCompressPdfFile] = useState<File | null>(null);
  const [compressPdfLevel, setCompressPdfLevel] = useState<"low" | "medium" | "high">("medium");
  const [compressPdfResult, setCompressPdfResult] = useState<{
    blob: Blob;
    url: string;
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [isCompressingPdf, setIsCompressingPdf] = useState(false);
  const [compressPdfProgress, setCompressPdfProgress] = useState<{ current: number; total: number } | null>(null);

  // Image Compression states
  const [compressImgFiles, setCompressImgFiles] = useState<File[]>([]);
  const [compressImgQuality, setCompressImgQuality] = useState(75);
  const [compressImgScale, setCompressImgScale] = useState(1.0);
  const [compressImgFormat, setCompressImgFormat] = useState<"auto" | "image/webp" | "image/jpeg" | "image/png">("auto");
  const [compressImgResults, setCompressImgResults] = useState<CompressedImageResult[]>([]);
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const [compressImgProgress, setCompressImgProgress] = useState<{ current: number; total: number } | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { id: CategoryId; label: string; icon: any }[] = [
    { id: "all", label: "Semua Tools", icon: Sparkles },
    { id: "pdf", label: "PDF Tools", icon: FileText },
    { id: "image", label: "Image Studio", icon: FileImage },
    { id: "audio-video", label: "Audio & Video", icon: Video },
    { id: "data", label: "Data & Dokumen", icon: Database },
    { id: "archive", label: "ZIP Archive", icon: Archive },
  ];

  const toolsList: {
    id: ToolId;
    category: CategoryId;
    name: string;
    badge: string;
    desc: string;
    icon: any;
    accent: string;
  }[] = [
    {
      id: "image-to-pdf",
      category: "pdf",
      name: "Image to PDF (Batch)",
      badge: "PDF / Batch",
      desc: "Gabungkan banyak foto (JPG, PNG, WebP) menjadi satu file PDF dokumen rapi.",
      icon: Layers,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "pdf-to-image",
      category: "pdf",
      name: "PDF to Image",
      badge: "PDF / 300 DPI",
      desc: "Ekstrak setiap halaman PDF menjadi gambar PNG/JPG berkualitas tinggi.",
      icon: FileImage,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      id: "protect-pdf",
      category: "pdf",
      name: "Protect PDF (Password)",
      badge: "AES-256",
      desc: "Kunci dan enkripsi dokumen PDF dengan proteksi kata sandi aman.",
      icon: Lock,
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    },
    {
      id: "unlock-pdf",
      category: "pdf",
      name: "Unlock PDF",
      badge: "Decrypt",
      desc: "Hapus kata sandi dari file PDF terproteksi yang sudah kamu ketahui kuncinya.",
      icon: Unlock,
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
    },
    {
      id: "text-to-pdf",
      category: "pdf",
      name: "Text to PDF Formatter",
      badge: "A4 / Docs",
      desc: "Ketik atau paste teks untuk diekspor menjadi dokumen PDF berformat A4.",
      icon: Type,
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/25",
    },
    {
      id: "compress-pdf",
      category: "pdf",
      name: "Smart PDF Compressor",
      badge: "Save 40-80%",
      desc: "Kecilkan ukuran file PDF dokumen atau scan dengan optimasi stream dan resolusi.",
      icon: FileText,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      id: "compress-image",
      category: "image",
      name: "Smart Photo/Image Compressor",
      badge: "Save Up to 90%",
      desc: "Kompres foto JPG, PNG, atau WebP dengan slider kualitas dan pratinjau ukuran file instan.",
      icon: Sliders,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "image-converter",
      category: "image",
      name: "Universal Image Converter",
      badge: "WebP / PNG / JPG",
      desc: "Konversi gambar batch ke WebP, PNG, JPG, atau ICO dengan kompresi kualitas tinggi.",
      icon: ArrowRightLeft,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "video-to-mp3",
      category: "audio-video",
      name: "Video to MP3 / Audio",
      badge: "Lossless Audio",
      desc: "Ekstrak suara atau audio musik dari file video (MP4/WebM) langsung di browser.",
      icon: Music,
      accent: "text-purple-400 bg-purple-500/10 border-purple-500/25",
    },
    {
      id: "data-studio",
      category: "data",
      name: "Data Studio Converter",
      badge: "JSON / CSV / YAML",
      desc: "Transformasi data instan antara format JSON, CSV tabel, dan format YAML.",
      icon: Database,
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
    },
    {
      id: "zip-studio",
      category: "archive",
      name: "ZIP Archive Studio",
      badge: "ZIP / Unzip",
      desc: "Kompres beberapa file menjadi arsip ZIP atau ekstrak isi file ZIP tanpa server.",
      icon: Archive,
      accent: "text-orange-400 bg-orange-500/10 border-orange-500/25",
    },
  ];

  const quickPills = [
    { label: "📸 Images → PDF", tool: "image-to-pdf" as ToolId },
    { label: "🗜️ Kompres Foto", tool: "compress-image" as ToolId },
    { label: "📉 Kompres PDF", tool: "compress-pdf" as ToolId },
    { label: "📄 PDF → Images", tool: "pdf-to-image" as ToolId },
    { label: "🔒 Protect PDF", tool: "protect-pdf" as ToolId },
    { label: "🔓 Unlock PDF", tool: "unlock-pdf" as ToolId },
    { label: "📝 Text → PDF", tool: "text-to-pdf" as ToolId },
    { label: "⚡ Image Converter", tool: "image-converter" as ToolId },
    { label: "🎬 Video → Audio", tool: "video-to-mp3" as ToolId },
    { label: "📊 JSON ↔ CSV", tool: "data-studio" as ToolId },
    { label: "📦 Create ZIP", tool: "zip-studio" as ToolId },
  ];

  const filteredTools = toolsList.filter((tool) => {
    const matchesCategory = activeCategory === "all" || tool.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const triggerDownload = (url: string, filename: string, downloadId: string) => {
    setDownloadedSet((prev) => new Set(prev).add(downloadId));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    recordToolUsage("convert");
  };

  // --- Handlers for Image to PDF ---
  const handleProcessImgToPdf = async () => {
    if (imgPdfFiles.length === 0) return;
    setIsProcessingImgPdf(true);
    setImgPdfProgress({ current: 0, total: imgPdfFiles.length });
    try {
      const blob = await imagesToPdf(imgPdfFiles, (current, total) => {
        setImgPdfProgress({ current, total });
      });
      const url = URL.createObjectURL(blob);
      setImgPdfResultBlob(blob);
      setImgPdfResultUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      alert(err.message || "Gagal mengonversi gambar ke PDF.");
    } finally {
      setIsProcessingImgPdf(false);
      setImgPdfProgress(null);
    }
  };

  // --- Handlers for PDF to Image ---
  const handleExtractPdfPages = async () => {
    if (!pdfToImgFile) return;
    setIsExtractingPdf(true);
    setPdfExtractProgress({ current: 0, total: 1 });
    try {
      const pages = await pdfToImages(pdfToImgFile, (curr, tot) => {
        setPdfExtractProgress({ current: curr, total: tot });
      });
      setPdfPages(pages);
      recordToolUsage("convert");
    } catch (err: any) {
      alert(err.message || "Gagal mengekstrak halaman PDF.");
    } finally {
      setIsExtractingPdf(false);
      setPdfExtractProgress(null);
    }
  };

  const handleDownloadAllPagesZip = async () => {
    if (pdfPages.length === 0) return;
    const files = pdfPages.map((p) => ({
      name: `page-${p.pageNum}.png`,
      data: p.blob,
    }));
    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    triggerDownload(url, `extracted-pdf-pages-${Date.now()}.zip`, "all-pdf-pages-zip");
  };

  // --- Handlers for Protect PDF ---
  const handleProtectPdf = async () => {
    if (!protectFile || !protectPassword) return;
    setIsProtecting(true);
    setProtectError("");
    try {
      const blob = await protectPdf(protectFile, protectPassword);
      const url = URL.createObjectURL(blob);
      setProtectResultUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      setProtectError(err.message || "Gagal mengenkripsi PDF.");
    } finally {
      setIsProtecting(false);
    }
  };

  // --- Handlers for Unlock PDF ---
  const handleUnlockPdf = async () => {
    if (!unlockFile) return;
    setIsUnlocking(true);
    setUnlockError("");
    try {
      const blob = await unlockPdf(unlockFile, unlockPassword);
      const url = URL.createObjectURL(blob);
      setUnlockResultUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      setUnlockError(err.message || "Password salah atau PDF gagal didekripsi.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // --- Handlers for Text to PDF ---
  const handleGenerateTextPdf = async () => {
    if (!textContent.trim()) return;
    setIsGeneratingTextPdf(true);
    try {
      const blob = await textToPdf(textContent, textTitle, textFontSize);
      const url = URL.createObjectURL(blob);
      setTextPdfUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      alert(err.message || "Gagal mengekspor teks ke PDF.");
    } finally {
      setIsGeneratingTextPdf(false);
    }
  };

  // --- Handlers for Universal Image Converter ---
  const handleConvertImages = async () => {
    if (imageBatch.length === 0) return;
    setIsConvertingImages(true);

    const updated = [...imageBatch];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      try {
        const img = new Image();
        img.src = item.preview;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const mime =
          imgFormat === "png"
            ? "image/png"
            : imgFormat === "jpeg"
            ? "image/jpeg"
            : imgFormat === "ico"
            ? "image/x-icon"
            : "image/webp";

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || new Blob()), mime, imgQuality / 100);
        });

        const url = URL.createObjectURL(blob);
        item.convertedUrl = url;
        item.convertedSize = (blob.size / 1024).toFixed(1);
        item.status = "done";
      } catch {
        item.status = "error";
      }
    }

    setImageBatch(updated);
    setIsConvertingImages(false);
    recordToolUsage("convert");
  };

  // --- Handlers for Video to Audio ---
  const handleExtractAudio = async () => {
    if (!videoFile) return;
    setIsExtractingAudio(true);
    setAudioProgress(10);
    try {
      const wavBlob = await extractAudioFromVideo(videoFile, (p) => setAudioProgress(p));
      const url = URL.createObjectURL(wavBlob);
      setAudioResultBlob(wavBlob);
      setAudioResultUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      alert("Gagal mengekstrak audio dari video: " + (err.message || "Format audio tidak didukung"));
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // --- Handlers for Data Studio ---
  const handleTransformData = () => {
    setDataError("");
    try {
      if (dataMode === "json-to-csv") {
        setDataOutput(jsonToCsv(dataInput));
      } else if (dataMode === "csv-to-json") {
        setDataOutput(csvToJson(dataInput));
      } else if (dataMode === "json-to-yaml") {
        setDataOutput(jsonToYaml(dataInput));
      }
      recordToolUsage("convert");
    } catch (err: any) {
      setDataError("Format data input tidak valid: " + err.message);
    }
  };

  // --- Handlers for ZIP Studio ---
  const handleCreateZip = async () => {
    if (zipFiles.length === 0) return;
    setIsZipping(true);
    try {
      const fileData = await Promise.all(
        zipFiles.map(async (f) => ({
          name: f.name,
          data: new Uint8Array(await f.arrayBuffer()),
        }))
      );
      const blob = await createZipArchive(fileData);
      const url = URL.createObjectURL(blob);
      setZipResultUrl(url);
      recordToolUsage("convert");
    } catch (err: any) {
      alert("Gagal membuat arsip ZIP: " + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  const handleInspectZip = async (file: File) => {
    try {
      const entries = await extractZipArchive(file);
      setZipEntries(entries);
    } catch (err: any) {
      alert("Gagal membaca file ZIP: " + err.message);
    }
  };

  // --- Handlers for PDF Compression ---
  const handleProcessCompressPdf = async () => {
    if (!compressPdfFile) return;
    setIsCompressingPdf(true);
    setCompressPdfResult(null);
    try {
      const res = await compressPdf(
        compressPdfFile,
        compressPdfLevel,
        (current, total) => {
          setCompressPdfProgress({ current, total });
        }
      );
      const url = URL.createObjectURL(res.blob);
      setCompressPdfResult({
        ...res,
        url,
      });
      recordToolUsage("convert");
    } catch (err: any) {
      alert(err.message || "Gagal mengompres PDF.");
    } finally {
      setIsCompressingPdf(false);
      setCompressPdfProgress(null);
    }
  };

  // --- Handlers for Image Compression ---
  const handleProcessCompressImages = async () => {
    if (compressImgFiles.length === 0) return;
    setIsCompressingImg(true);
    setCompressImgResults([]);
    try {
      const results = await batchCompressImages(
        compressImgFiles,
        {
          quality: compressImgQuality / 100,
          scaleRatio: compressImgScale,
          format: compressImgFormat === "auto" ? undefined : compressImgFormat,
        },
        (current, total) => {
          setCompressImgProgress({ current, total });
        }
      );
      setCompressImgResults(results);
      recordToolUsage("convert");
    } catch (err: any) {
      alert(err.message || "Gagal mengompres foto.");
    } finally {
      setIsCompressingImg(false);
      setCompressImgProgress(null);
    }
  };

  const handleDownloadAllCompressed = async () => {
    if (compressImgResults.length === 0) return;
    const filesToZip = compressImgResults.map((r) => {
      const ext = r.format.toLowerCase();
      const origName = r.originalFile.name.replace(/\.[^/.]+$/, "");
      return new File([r.compressedBlob], `${origName}-compressed.${ext}`, {
        type: r.compressedBlob.type,
      });
    });
    const zipBlob = await createZipArchive(
      await Promise.all(
        filesToZip.map(async (f) => ({
          name: f.name,
          data: new Uint8Array(await f.arrayBuffer()),
        }))
      )
    );
    const zipUrl = URL.createObjectURL(zipBlob);
    triggerDownload(zipUrl, `grainox-compressed-images-${Date.now()}.zip`, "all-compressed-images");
  };

  return (
    <div className="max-w-[880px] mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4">
      {/* Back Link */}
      <div>
        <CleanLink
          href="/"
          className="gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md py-1 px-2 -ml-2 inline-flex items-center"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t.tools.backHome}
        </CleanLink>
      </div>

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Universal Conversion & PDF Studio
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              100% Client-Side
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-xl">
            Konversi dokumen PDF, gambar, audio, dan data tabel secara instan di browsermu dengan privasi total tanpa batas ukuran.
          </p>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
        {quickPills.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => setActiveTool(pill.tool)}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
              activeTool === pill.tool
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm shadow-amber-500/30"
                : "bg-[#11151D] border-white/10 text-slate-300 hover:border-amber-400/50 hover:text-white"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-xl border border-white/[0.08] overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                if (cat.id !== "all") {
                  const firstOfCat = toolsList.find((t) => t.category === cat.id);
                  if (firstOfCat) setActiveTool(firstOfCat.id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                active
                  ? "bg-[#1A212E] text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE STUDIO WORKSPACE (DYNAMIC BASED ON SELECTED TOOL)                  */}
      {/* ========================================================================= */}
      {activeTool && (
        <div className="rounded-2xl bg-[#11151D] border border-white/10 p-4 sm:p-5 space-y-4 shadow-2xl relative overflow-hidden">
          <BorderBeam size={280} duration={12} colorFrom="#F59E0B" colorTo="#34D399" />

          {/* Active Tool Title Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {toolsList.find((t) => t.id === activeTool)?.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Tutup Studio ✕
            </button>
          </div>

          {/* 1. IMAGE TO PDF STUDIO */}
          {activeTool === "image-to-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Pilih atau drag beberapa gambar (JPG, PNG, WebP) untuk digabungkan menjadi dokumen PDF.
              </p>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="img-to-pdf-input"
                onChange={(e) => {
                  if (e.target.files) {
                    setImgPdfFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                    setImgPdfResultUrl(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("img-to-pdf-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-[#161B26] hover:bg-[#1C2332]"
              >
                <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  Klik untuk Memilih Gambar (Bisa Batch Banyak)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Mendukung JPG, PNG, WebP, GIF, BMP</div>
              </div>

              {imgPdfFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{imgPdfFiles.length} Gambar Terpilih</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImgPdfFiles([]);
                        setImgPdfResultUrl(null);
                      }}
                      className="text-red-400 hover:underline"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {imgPdfFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-[#0B0E14] border border-white/10 flex items-center justify-between text-xs"
                      >
                        <span className="truncate max-w-[120px] text-white">
                          #{idx + 1} {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImgPdfFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-400 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <ShimmerButton
                      disabled={isProcessingImgPdf}
                      onClick={handleProcessImgToPdf}
                      className="h-10 text-xs font-bold"
                    >
                      {isProcessingImgPdf
                        ? `Menggabungkan (${imgPdfProgress?.current || 0}/${imgPdfProgress?.total || 0})...`
                        : "Konversi ke PDF Dokumen"}
                    </ShimmerButton>

                    {imgPdfResultUrl && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          triggerDownload(
                            imgPdfResultUrl,
                            `grainox-document-${Date.now()}.pdf`,
                            "img-to-pdf-download"
                          )
                        }
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("img-to-pdf-download")
                            ? "bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("img-to-pdf-download") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("img-to-pdf-download")
                          ? "Berhasil Diunduh!"
                          : "Download PDF Dokumen"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. PDF TO IMAGE STUDIO */}
          {activeTool === "pdf-to-image" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Upload dokumen PDF untuk merender setiap halamannya menjadi gambar PNG definisi tinggi (300 DPI).
              </p>

              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="pdf-to-img-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPdfToImgFile(f);
                    setPdfPages([]);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("pdf-to-img-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-[#161B26] hover:bg-[#1C2332]"
              >
                <FileText className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  {pdfToImgFile ? pdfToImgFile.name : "Pilih File PDF Dokumen"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Ekstraksi 100% lokal di browser</div>
              </div>

              {pdfToImgFile && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <ShimmerButton
                      disabled={isExtractingPdf}
                      onClick={handleExtractPdfPages}
                      className="h-10 text-xs font-bold"
                    >
                      {isExtractingPdf
                        ? `Mengekstrak Halaman (${pdfExtractProgress?.current || 0}/${pdfExtractProgress?.total || 0})...`
                        : "Ekstrak Semua Halaman"}
                    </ShimmerButton>

                    {pdfPages.length > 1 && (
                      <Button
                        variant="primary"
                        onClick={handleDownloadAllPagesZip}
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("all-pdf-pages-zip")
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("all-pdf-pages-zip") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("all-pdf-pages-zip")
                          ? "ZIP Diunduh!"
                          : `Download Semua Halaman (${pdfPages.length} Halaman ZIP)`}
                      </Button>
                    )}
                  </div>

                  {pdfPages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {pdfPages.map((page) => {
                        const pageKey = `pdf-page-${page.pageNum}`;
                        const isDownloaded = downloadedSet.has(pageKey);
                        return (
                          <div
                            key={page.pageNum}
                            className="p-2.5 rounded-xl bg-[#0B0E14] border border-white/10 space-y-2 text-center"
                          >
                            <img
                              src={page.dataUrl}
                              alt={`Halaman ${page.pageNum}`}
                              className="w-full aspect-[3/4] object-contain rounded bg-white"
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-slate-300">Hal {page.pageNum}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDownload(
                                    page.dataUrl,
                                    `page-${page.pageNum}.png`,
                                    pageKey
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  isDownloaded
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-white/10 text-white hover:bg-amber-500 hover:text-slate-950"
                                }`}
                              >
                                {isDownloaded ? <Check className="w-3 h-3 stroke-[3]" /> : <Download className="w-3 h-3" />}
                                <span>{isDownloaded ? "Done" : "Download"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. PROTECT PDF STUDIO */}
          {activeTool === "protect-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Enkripsi file PDF dengan password menggunakan algoritma standar AES-256.
              </p>

              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="protect-pdf-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setProtectFile(f);
                    setProtectResultUrl(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("protect-pdf-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <Lock className="w-7 h-7 text-rose-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  {protectFile ? protectFile.name : "Pilih File PDF"}
                </div>
              </div>

              {protectFile && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Masukkan Kata Sandi (Password Enkripsi):</label>
                    <input
                      type="password"
                      placeholder="Contoh: Rahasia123!"
                      value={protectPassword}
                      onChange={(e) => setProtectPassword(e.target.value)}
                      className="w-full bg-[#161B26] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none font-mono"
                    />
                  </div>

                  {protectError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                      {protectError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <ShimmerButton
                      disabled={isProtecting || !protectPassword}
                      onClick={handleProtectPdf}
                      className="h-10 text-xs font-bold"
                    >
                      {isProtecting ? "Mengenkrpsi..." : "Kunci & Enkripsi PDF"}
                    </ShimmerButton>

                    {protectResultUrl && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          triggerDownload(
                            protectResultUrl,
                            `grainox-protected-${Date.now()}.pdf`,
                            "protect-pdf-download"
                          )
                        }
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("protect-pdf-download")
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("protect-pdf-download") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("protect-pdf-download")
                          ? "Berhasil Diunduh!"
                          : "Download PDF Terkunci"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. UNLOCK PDF STUDIO */}
          {activeTool === "unlock-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Hapus password dari file PDF terproteksi yang sudah kamu ketahui kuncinya agar tidak perlu memasukkan password lagi saat dibuka.
              </p>

              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="unlock-pdf-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUnlockFile(f);
                    setUnlockResultUrl(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("unlock-pdf-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <Unlock className="w-7 h-7 text-cyan-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  {unlockFile ? unlockFile.name : "Pilih File PDF Terproteksi"}
                </div>
              </div>

              {unlockFile && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Masukkan Password Dokumen:</label>
                    <input
                      type="password"
                      placeholder="Ketik password file ini"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      className="w-full bg-[#161B26] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none font-mono"
                    />
                  </div>

                  {unlockError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                      {unlockError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <ShimmerButton
                      disabled={isUnlocking}
                      onClick={handleUnlockPdf}
                      className="h-10 text-xs font-bold"
                    >
                      {isUnlocking ? "Membuka..." : "Buka Password PDF"}
                    </ShimmerButton>

                    {unlockResultUrl && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          triggerDownload(
                            unlockResultUrl,
                            `grainox-unlocked-${Date.now()}.pdf`,
                            "unlock-pdf-download"
                          )
                        }
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("unlock-pdf-download")
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("unlock-pdf-download") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("unlock-pdf-download")
                          ? "Berhasil Diunduh!"
                          : "Download PDF Unlocked"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. TEXT TO PDF FORMATTER */}
          {activeTool === "text-to-pdf" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Ketik teks atau catatan untuk diekspor menjadi dokumen PDF resmi standar A4.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Judul Dokumen (Opsional)"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full bg-[#161B26] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold outline-none"
                />

                <textarea
                  rows={6}
                  placeholder="Ketik atau paste isi dokumen di sini..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full bg-[#161B26] border border-white/15 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-white outline-none font-sans leading-relaxed resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>Ukuran Font:</span>
                  {[10, 11, 12, 14].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTextFontSize(size)}
                      className={`px-2 py-0.5 rounded text-xs ${
                        textFontSize === size ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/10 text-white"
                      }`}
                    >
                      {size}pt
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <ShimmerButton
                    disabled={isGeneratingTextPdf || !textContent.trim()}
                    onClick={handleGenerateTextPdf}
                    className="h-9 px-4 text-xs font-bold"
                  >
                    {isGeneratingTextPdf ? "Membuat PDF..." : "Generate PDF"}
                  </ShimmerButton>

                  {textPdfUrl && (
                    <Button
                      variant="primary"
                      onClick={() =>
                        triggerDownload(
                          textPdfUrl,
                          `${textTitle.trim() || "document"}-${Date.now()}.pdf`,
                          "text-pdf-download"
                        )
                      }
                      className={`h-9 px-4 text-xs font-bold ${
                        downloadedSet.has("text-pdf-download")
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      }`}
                      leftIcon={
                        downloadedSet.has("text-pdf-download") ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )
                      }
                    >
                      {downloadedSet.has("text-pdf-download")
                        ? "Tersimpan!"
                        : "Download PDF"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* COMPRESS PDF STUDIO */}
          {activeTool === "compress-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Kecilkan ukuran file PDF dokumen atau scan dengan optimasi objek stream dan resolusi halaman.
              </p>

              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="compress-pdf-input"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setCompressPdfFile(e.target.files[0]);
                    setCompressPdfResult(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("compress-pdf-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-emerald-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <FileText className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  {compressPdfFile ? compressPdfFile.name : "Pilih File PDF untuk Dikompres"}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {compressPdfFile
                    ? `Ukuran Awal: ${formatBytes(compressPdfFile.size)}`
                    : "Klik untuk upload dokumen PDF"}
                </div>
              </div>

              {compressPdfFile && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Tingkat Kompresi:</span>
                    {(
                      [
                        { id: "medium", label: "Standar (Rekomendasi)", desc: "-50% s/d -70%" },
                        { id: "high", label: "Maksimal (Paling Ringan)", desc: "-75% s/d -90%" },
                        { id: "low", label: "Ringan (Kualitas Tertinggi)", desc: "-30% s/d -50%" },
                      ] as const
                    ).map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setCompressPdfLevel(lvl.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          compressPdfLevel === lvl.id
                            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                            : "bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>

                  {compressPdfProgress && (
                    <div className="text-xs font-mono text-emerald-400">
                      Memproses halaman {compressPdfProgress.current} dari {compressPdfProgress.total}...
                    </div>
                  )}

                  {compressPdfResult && (
                    <div className="p-3.5 rounded-xl bg-[#0E1A17] border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Ukuran Awal: <strong className="text-slate-300 font-mono">{formatBytes(compressPdfResult.originalSize)}</strong></span>
                          <span>→</span>
                          <span>Hasil Kompres: <strong className="text-emerald-400 font-mono">{formatBytes(compressPdfResult.compressedSize)}</strong></span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Hemat {compressPdfResult.savingsPercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <ShimmerButton
                      disabled={isCompressingPdf}
                      onClick={handleProcessCompressPdf}
                      className="h-10 text-xs font-bold"
                    >
                      {isCompressingPdf ? "Mengompres PDF..." : "Mulai Kompres PDF"}
                    </ShimmerButton>

                    {compressPdfResult && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          triggerDownload(
                            compressPdfResult.url,
                            `grainox-compressed-${Date.now()}.pdf`,
                            "compress-pdf-download"
                          )
                        }
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("compress-pdf-download")
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("compress-pdf-download") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("compress-pdf-download")
                          ? "Berhasil Diunduh!"
                          : "Download PDF Ringan"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SMART PHOTO / IMAGE COMPRESSOR */}
          {activeTool === "compress-image" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Kompres ukuran file foto (JPG, PNG, WebP) tanpa mengurangi ketajaman gambar secara drastis di browser.
              </p>

              {/* Quality & Scale sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#161B26] border border-white/10">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Kualitas Kompresi:</span>
                    <span className="text-amber-400 font-bold">{compressImgQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="95"
                    value={compressImgQuality}
                    onChange={(e) => setCompressImgQuality(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/40 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Maksimal Kecil (15%)</span>
                    <span>Seimbang (75%)</span>
                    <span>Tinggi (95%)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Skala Dimensi:</span>
                    <span className="text-amber-400 font-bold">
                      {compressImgScale === 1.0 ? "100% (Asli)" : `${Math.round(compressImgScale * 100)}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1.0, 0.8, 0.6, 0.5].map((scaleVal) => (
                      <button
                        key={scaleVal}
                        type="button"
                        onClick={() => setCompressImgScale(scaleVal)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex-1 transition-all ${
                          compressImgScale === scaleVal
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "bg-white/10 text-slate-300 hover:bg-white/15"
                        }`}
                      >
                        {scaleVal === 1.0 ? "100%" : `${Math.round(scaleVal * 100)}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="compress-img-input"
                onChange={(e) => {
                  if (e.target.files) {
                    setCompressImgFiles(Array.from(e.target.files));
                    setCompressImgResults([]);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("compress-img-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <Sliders className="w-7 h-7 text-amber-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  Pilih Foto / Gambar untuk Dikompres (Bisa Batch Banyak)
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {compressImgFiles.length > 0
                    ? `${compressImgFiles.length} foto dipilih`
                    : "Mendukung JPG, PNG, WebP, AVIF, BMP"}
                </div>
              </div>

              {compressImgFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{compressImgFiles.length} file siap dikompres</span>
                    {compressImgProgress && (
                      <span className="text-amber-400">
                        Memproses {compressImgProgress.current}/{compressImgProgress.total}...
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ShimmerButton
                      disabled={isCompressingImg}
                      onClick={handleProcessCompressImages}
                      className="h-10 text-xs font-bold"
                    >
                      {isCompressingImg ? "Mengompres Foto..." : `Kompres ${compressImgFiles.length} Foto Sekarang`}
                    </ShimmerButton>

                    {compressImgResults.length > 1 && (
                      <Button
                        variant="secondary"
                        onClick={handleDownloadAllCompressed}
                        className="h-10 text-xs font-bold"
                        leftIcon={<Archive className="w-4 h-4" />}
                      >
                        Download Semua sebagai ZIP
                      </Button>
                    )}
                  </div>

                  {/* Results list */}
                  {compressImgResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {compressImgResults.map((item, idx) => {
                        const downloadKey = `compress-img-${idx}`;
                        const isDownloaded = downloadedSet.has(downloadKey);
                        const fileName = `${item.originalFile.name.replace(/\.[^/.]+$/, "")}-compressed.${item.format.toLowerCase()}`;
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#161B26] border border-white/10 flex items-center justify-between gap-3 group hover:border-amber-500/40 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={item.dataUrl}
                                alt={item.originalFile.name}
                                className="w-12 h-12 rounded-lg object-cover bg-black shrink-0 border border-white/10"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[160px]">
                                  {item.originalFile.name}
                                </p>
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{formatBytes(item.originalSize)}</span>
                                  <span>→</span>
                                  <span className="text-emerald-400 font-bold">{formatBytes(item.compressedSize)}</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 mt-0.5">
                                  Hemat {item.savingsPercent}%
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => triggerDownload(item.dataUrl, fileName, downloadKey)}
                              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 ${
                                isDownloaded
                                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                                  : "bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white"
                              }`}
                            >
                              {isDownloaded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Download className="w-3.5 h-3.5" />}
                              <span>{isDownloaded ? "Tersimpan" : "Unduh"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. UNIVERSAL IMAGE CONVERTER */}
          {activeTool === "image-converter" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Pilih format target (WebP, PNG, JPG, ICO) dan konversi batch dengan kompresi cerdas.
              </p>

              {/* Format selection */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Format Tujuan:</span>
                {(["webp", "png", "jpeg", "ico"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setImgFormat(fmt)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      imgFormat === fmt
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {fmt === "jpeg" ? "JPG" : fmt}
                  </button>
                ))}
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="batch-img-input"
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    const newItems = files.map((f) => ({
                      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      file: f,
                      preview: URL.createObjectURL(f),
                      status: "pending",
                    }));
                    setImageBatch((prev) => [...prev, ...newItems]);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("batch-img-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <FileImage className="w-7 h-7 text-amber-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">Pilih Foto untuk Dikonversi (Bisa Banyak)</div>
              </div>

              {imageBatch.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {imageBatch.map((item) => {
                      const itemKey = `img-convert-${item.id}`;
                      const isDownloaded = downloadedSet.has(itemKey);
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-[#0B0E14] border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img src={item.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                            <span className="truncate text-white max-w-[140px]">{item.file.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.status === "done" && item.convertedUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDownload(
                                    item.convertedUrl!,
                                    `grainox-${item.file.name.replace(/\.[^/.]+$/, "")}.${imgFormat === "jpeg" ? "jpg" : imgFormat}`,
                                    itemKey
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${
                                  isDownloaded
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                }`}
                              >
                                {isDownloaded ? <Check className="w-3 h-3 stroke-[3]" /> : <Download className="w-3 h-3" />}
                                <span>{isDownloaded ? "Done" : "Download"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setImageBatch((prev) => prev.filter((i) => i.id !== item.id))}
                              className="text-slate-400 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <ShimmerButton
                    disabled={isConvertingImages}
                    onClick={handleConvertImages}
                    className="h-10 text-xs font-bold"
                  >
                    {isConvertingImages ? "Mengonversi..." : `Konversi ${imageBatch.length} Foto ke ${imgFormat.toUpperCase()}`}
                  </ShimmerButton>
                </div>
              )}
            </div>
          )}

          {/* 7. VIDEO TO AUDIO / MP3 */}
          {activeTool === "video-to-mp3" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Ekstrak suara dari video (MP4/WebM) langsung di browsermu dengan sampling rate lossless.
              </p>

              <input
                type="file"
                accept="video/*"
                className="hidden"
                id="video-to-mp3-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setVideoFile(f);
                    setAudioResultUrl(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("video-to-mp3-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <Video className="w-7 h-7 text-purple-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  {videoFile ? videoFile.name : "Pilih File Video (MP4 / WebM)"}
                </div>
              </div>

              {videoFile && (
                <div className="flex gap-2">
                  <ShimmerButton
                    disabled={isExtractingAudio}
                    onClick={handleExtractAudio}
                    className="h-10 text-xs font-bold"
                  >
                    {isExtractingAudio ? `Mengekstrak Audio (${audioProgress}%)...` : "Ekstrak Audio Suara"}
                  </ShimmerButton>

                  {audioResultUrl && (
                    <Button
                      variant="primary"
                      onClick={() =>
                        triggerDownload(
                          audioResultUrl,
                          `grainox-audio-${Date.now()}.wav`,
                          "video-audio-download"
                        )
                      }
                      className={`h-10 text-xs font-bold ${
                        downloadedSet.has("video-audio-download")
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      }`}
                      leftIcon={
                        downloadedSet.has("video-audio-download") ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )
                      }
                    >
                      {downloadedSet.has("video-audio-download")
                        ? "Audio Diunduh!"
                        : "Download File Audio (WAV/MP3)"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 8. DATA STUDIO CONVERTER */}
          {activeTool === "data-studio" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Mode Transformasi:</span>
                {(["json-to-csv", "csv-to-json", "json-to-yaml"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setDataMode(m);
                      setDataOutput("");
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                      dataMode === m
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-white/10 text-slate-300 hover:bg-white/15"
                    }`}
                  >
                    {m === "json-to-csv" ? "JSON → CSV" : m === "csv-to-json" ? "CSV → JSON" : "JSON → YAML"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <textarea
                  rows={8}
                  placeholder={`Paste ${dataMode.startsWith("json") ? "JSON" : "CSV"} data di sini...`}
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value)}
                  className="w-full bg-[#161B26] border border-white/15 focus:border-amber-400 rounded-xl p-3 text-xs text-white font-mono outline-none resize-y"
                />

                <textarea
                  rows={8}
                  readOnly
                  placeholder="Hasil konversi data akan muncul di sini..."
                  value={dataOutput}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-xs text-amber-300 font-mono outline-none resize-y"
                />
              </div>

              {dataError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {dataError}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <ShimmerButton onClick={handleTransformData} className="h-9 px-4 text-xs font-bold">
                  Proses Konversi Data
                </ShimmerButton>

                {dataOutput && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(dataOutput);
                      setCopiedData(true);
                      setTimeout(() => setCopiedData(false), 2000);
                    }}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium"
                  >
                    {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedData ? "Tersalin!" : "Salin Hasil"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 9. ZIP ARCHIVE STUDIO */}
          {activeTool === "zip-studio" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Buat arsip ZIP baru dari banyak file, atau ekstrak dan inspeksi isi file ZIP secara offline.
              </p>

              <input
                type="file"
                multiple
                className="hidden"
                id="zip-create-input"
                onChange={(e) => {
                  if (e.target.files) {
                    setZipFiles(Array.from(e.target.files));
                    setZipResultUrl(null);
                  }
                }}
              />

              <div
                onClick={() => document.getElementById("zip-create-input")?.click()}
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#161B26]"
              >
                <Archive className="w-7 h-7 text-orange-400 mx-auto mb-1.5" />
                <div className="text-xs sm:text-sm font-bold text-white">
                  Pilih File untuk Dibundel ke ZIP (Bisa Apa Saja)
                </div>
              </div>

              {zipFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-400">{zipFiles.length} file dipilih</div>
                  <div className="flex gap-2">
                    <ShimmerButton disabled={isZipping} onClick={handleCreateZip} className="h-10 text-xs font-bold">
                      {isZipping ? "Mengompres..." : "Buat File ZIP"}
                    </ShimmerButton>

                    {zipResultUrl && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          triggerDownload(zipResultUrl, `grainox-archive-${Date.now()}.zip`, "zip-download")
                        }
                        className={`h-10 text-xs font-bold ${
                          downloadedSet.has("zip-download")
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                        leftIcon={
                          downloadedSet.has("zip-download") ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )
                        }
                      >
                        {downloadedSet.has("zip-download") ? "Arsip ZIP Diunduh!" : "Download File ZIP"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL CONVERTER STUDIOS GRID (ORGANIZED BY CATEGORY)                         */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Katalog Lengkap Conversion Studio</span>
            <span className="text-xs font-mono text-amber-400">({filteredTools.length} Tools)</span>
          </h2>

          <input
            type="text"
            placeholder="Cari converter... (e.g. pdf, mp3, json)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#11151D] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none w-full sm:w-60 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between group ${
                  isSelected
                    ? "bg-[#18202E] border-amber-400 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
                    : "bg-[#11151D] border-white/10 hover:border-amber-500/40 hover:bg-[#161B26]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tool.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {tool.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono font-medium text-amber-400">
                  <span>Buka Studio</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics Telemetry Bar */}
      <ToolAnalyticsBar tool="convert" />
    </div>
  );
}
