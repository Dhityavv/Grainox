"use client";

import { useState, useRef } from "react";
import {
  FileImage,
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

type CategoryId = "all" | "image" | "audio-video" | "data" | "archive";

type ToolId =
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
  initialTool = "image-converter",
}: ConverterPageProps) {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const [activeCategory, setActiveCategory] = useState<CategoryId>(initialCategory);
  const [activeTool, setActiveTool] = useState<ToolId | null>(initialTool || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

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

  const categories: { id: CategoryId; label: string; icon: any }[] = [
    { id: "all", label: isEn ? "All Tools" : "Semua Tools", icon: Sparkles },
    { id: "image", label: isEn ? "Image Studio" : "Studio Gambar", icon: FileImage },
    { id: "audio-video", label: "Audio & Video", icon: Video },
    { id: "data", label: isEn ? "Data & Documents" : "Data & Dokumen", icon: Database },
    { id: "archive", label: isEn ? "ZIP Archive" : "Arsip ZIP", icon: Archive },
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
      id: "image-converter",
      category: "image",
      name: isEn ? "Universal Image Converter" : "Konverter Gambar Universal",
      badge: "WebP / PNG / JPG / ICO",
      desc: isEn
        ? "Batch convert images into WebP, PNG, JPG, or ICO with lossless/lossy compression."
        : "Konversi gambar batch ke WebP, PNG, JPG, atau ICO dengan kompresi kualitas tinggi.",
      icon: ArrowRightLeft,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "compress-image",
      category: "image",
      name: isEn ? "Smart Photo/Image Compressor" : "Kompres Foto / Gambar",
      badge: isEn ? "Save Up to 90%" : "Hemat s/d 90%",
      desc: isEn
        ? "Compress JPG, PNG, and WebP images with custom quality sliders and instant file size estimation."
        : "Kompres foto JPG, PNG, atau WebP dengan slider kualitas dan pratinjau ukuran file instan.",
      icon: Sliders,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      id: "video-to-mp3",
      category: "audio-video",
      name: isEn ? "Video to MP3 / Audio Extractor" : "Video ke MP3 / Audio",
      badge: isEn ? "Lossless Audio" : "Audio Jernih",
      desc: isEn
        ? "Extract clear MP3 or WAV audio tracks directly from MP4 and WebM video files."
        : "Ekstrak suara atau audio musik dari file video (MP4/WebM) langsung di browser.",
      icon: Music,
      accent: "text-purple-400 bg-purple-500/10 border-purple-500/25",
    },
    {
      id: "data-studio",
      category: "data",
      name: isEn ? "Data Studio Converter" : "Studio Konversi Data",
      badge: "JSON / CSV / YAML",
      desc: isEn
        ? "Instant bidirectional transformation between JSON structured data, CSV tables, and YAML."
        : "Transformasi data instan antara format JSON, CSV tabel, dan format YAML.",
      icon: Database,
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
    },
    {
      id: "zip-studio",
      category: "archive",
      name: isEn ? "ZIP Archive Studio" : "Studio Arsip ZIP",
      badge: "ZIP / Unzip",
      desc: isEn
        ? "Compress multiple files into a clean ZIP archive or inspect and extract ZIP files on-device."
        : "Kompres beberapa file menjadi arsip ZIP atau ekstrak isi file ZIP tanpa server.",
      icon: Archive,
      accent: "text-orange-400 bg-orange-500/10 border-orange-500/25",
    },
  ];

  const quickPills = [
    { label: isEn ? "⚡ Image Converter" : "⚡ Konverter Gambar", tool: "image-converter" as ToolId },
    { label: isEn ? "🗜️ Compress Images" : "🗜️ Kompres Foto", tool: "compress-image" as ToolId },
    { label: isEn ? "🎬 Video → MP3" : "🎬 Video → MP3", tool: "video-to-mp3" as ToolId },
    { label: isEn ? "📊 JSON ↔ CSV" : "📊 JSON ↔ CSV", tool: "data-studio" as ToolId },
    { label: isEn ? "📦 Create ZIP" : "📦 Buat ZIP", tool: "zip-studio" as ToolId },
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
      alert(isEn ? "Failed to extract audio from video: " + err.message : "Gagal mengekstrak audio dari video: " + (err.message || "Format audio tidak didukung"));
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
      setDataError((isEn ? "Invalid input data format: " : "Format data input tidak valid: ") + err.message);
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
      alert((isEn ? "Failed to create ZIP archive: " : "Gagal membuat arsip ZIP: ") + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  const handleInspectZip = async (file: File) => {
    try {
      const entries = await extractZipArchive(file);
      setZipEntries(entries);
    } catch (err: any) {
      alert((isEn ? "Failed to inspect ZIP file: " : "Gagal membaca file ZIP: ") + err.message);
    }
  };

  // --- Handlers for Image Compression ---
  const handleProcessCompressImg = async () => {
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
      alert((isEn ? "Failed to compress images: " : "Gagal mengompresi gambar: ") + err.message);
    } finally {
      setIsCompressingImg(false);
      setCompressImgProgress(null);
    }
  };

  const handleDownloadAllCompressedImages = async () => {
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back Link */}
      <CleanLink
        href="/"
        className="gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md p-1 inline-flex items-center"
      >
        <ArrowLeft className="w-4 h-4" /> {isEn ? "Back to Home" : "Kembali ke Beranda"}
      </CleanLink>

      {/* Header Area */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <ArrowRightLeft className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
          <span>{isEn ? "Universal File Converter" : "Konverter File Universal"}</span>
          <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
            100% Client-Side
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-3xl">
          {isEn
            ? "Batch convert and compress files directly inside your browser. High-speed, private transformation for images, video audio extraction, structured data, and ZIP archives."
            : "Konversi berkas instan untuk gambar, ekstraksi audio video, data tabel, dan arsip dengan privasi total tanpa batas ukuran."}
        </p>
      </div>

      {/* Quick Action Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quickPills.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => setActiveTool(pill.tool)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTool === pill.tool
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-[#0B0E14] p-1.5 rounded-xl border border-white/[0.08] overflow-x-auto scrollbar-none">
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? "bg-[#1A212E] text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE STUDIO WORKSPACE */}
      {activeTool && (
        <div className="rounded-2xl bg-[#11151D] border border-amber-500/30 p-4 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <BorderBeam size={320} duration={12} colorFrom="#F59E0B" colorTo="#34D399" />

          {/* Active Tool Title Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {toolsList.find((t) => t.id === activeTool)?.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 transition-colors"
            >
              {isEn ? "Close Studio ✕" : "Tutup Studio ✕"}
            </button>
          </div>

          {/* 1. SMART PHOTO / IMAGE COMPRESSOR */}
          {activeTool === "compress-image" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Compress photo and image file size (JPG, PNG, WebP) without visible loss of sharpness directly in your browser."
                  : "Kompres ukuran file foto (JPG, PNG, WebP) tanpa mengurangi ketajaman gambar secara drastis di browser."}
              </p>

              {/* Quality & Scale sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#161B26] border border-white/10">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{isEn ? "Compression Quality:" : "Kualitas Kompresi:"}</span>
                    <span className="text-amber-400 font-bold">{compressImgQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={compressImgQuality}
                    onChange={(e) => setCompressImgQuality(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{isEn ? "Smaller File" : "Lebih Kecil"}</span>
                    <span>{isEn ? "Balanced (75%)" : "Seimbang (75%)"}</span>
                    <span>{isEn ? "Best Quality" : "Kualitas Tinggi"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{isEn ? "Resolution Scaling:" : "Skala Resolusi:"}</span>
                    <span className="text-amber-400 font-bold">{Math.round(compressImgScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="1.0"
                    step="0.05"
                    value={compressImgScale}
                    onChange={(e) => setCompressImgScale(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (Original)</span>
                  </div>
                </div>
              </div>

              {/* Upload Drop Box */}
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

              <label
                htmlFor="compress-img-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 rounded-xl hover:border-amber-500/50 bg-[#161B26] hover:bg-[#1C2332] transition-all cursor-pointer text-center group"
              >
                <Sliders className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-white">
                  {compressImgFiles.length > 0
                    ? isEn
                      ? `${compressImgFiles.length} photos selected`
                      : `${compressImgFiles.length} foto dipilih`
                    : isEn
                    ? "Select Photos / Images to Compress (Batch Supported)"
                    : "Pilih Foto / Gambar untuk Dikompres (Bisa Batch Banyak)"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  JPG, PNG, WebP, GIF, BMP • 100% on-device
                </div>
              </label>

              {compressImgFiles.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <ShimmerButton
                    onClick={handleProcessCompressImg}
                    disabled={isCompressingImg}
                    className="h-10 px-5 text-xs font-bold"
                  >
                    {isCompressingImg
                      ? isEn
                        ? `Compressing (${compressImgProgress?.current || 0}/${compressImgProgress?.total || 0})...`
                        : `Mengompres (${compressImgProgress?.current || 0}/${compressImgProgress?.total || 0})...`
                      : isEn
                      ? `Compress ${compressImgFiles.length} Photos`
                      : `Mulai Kompres ${compressImgFiles.length} Foto`}
                  </ShimmerButton>

                  {compressImgResults.length > 1 && (
                    <button
                      onClick={handleDownloadAllCompressedImages}
                      className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? "Download All as ZIP" : "Unduh Semua (ZIP)"}
                    </button>
                  )}
                </div>
              )}

              {/* Compression Results Table */}
              {compressImgResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    {isEn ? "Compression Results:" : "Hasil Kompresi Berkas:"}
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {compressImgResults.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#141A24] border border-white/10 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={r.dataUrl}
                            alt={r.originalFile.name}
                            className="w-10 h-10 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white truncate">{r.originalFile.name}</div>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                              <span>{formatBytes(r.originalSize)}</span>
                              <span>→</span>
                              <span className="text-emerald-400 font-bold">{formatBytes(r.compressedSize)}</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                {isEn ? `Saved ${r.savingsPercent}%` : `Hemat ${r.savingsPercent}%`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const ext = r.format.toLowerCase();
                            const origName = r.originalFile.name.replace(/\.[^/.]+$/, "");
                            triggerDownload(
                              r.dataUrl,
                              `${origName}-compressed.${ext}`,
                              `comp-img-${i}`
                            );
                          }}
                          className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all ml-3 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadedSet.has(`comp-img-${i}`) ? (isEn ? "Saved ✓" : "Diunduh ✓") : isEn ? "Download" : "Unduh"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. UNIVERSAL IMAGE CONVERTER */}
          {activeTool === "image-converter" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Batch convert multiple images to WebP, PNG, JPG, or ICO with full local browser privacy."
                  : "Konversi gambar batch ke format WebP, PNG, JPG, atau ICO langsung di browser tanpa upload ke server."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#161B26] border border-white/10">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isEn ? "Target Output Format:" : "Format Output Tujuan:"}
                  </label>
                  <select
                    value={imgFormat}
                    onChange={(e) => setImgFormat(e.target.value as any)}
                    className="w-full bg-[#0D1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="webp">WebP (Modern & Ultra Compact)</option>
                    <option value="png">PNG (Lossless Transparency)</option>
                    <option value="jpeg">JPG / JPEG (Universal Standard)</option>
                    <option value="ico">ICO (Website Favicon)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{isEn ? "Quality:" : "Kualitas:"}</span>
                    <span className="text-amber-400 font-bold">{imgQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={imgQuality}
                    onChange={(e) => setImgQuality(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>30%</span>
                    <span>90% (Lossless)</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="img-batch-input"
                onChange={(e) => {
                  if (e.target.files) {
                    const newItems = Array.from(e.target.files).map((f) => ({
                      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                      file: f,
                      preview: URL.createObjectURL(f),
                      status: "pending",
                    }));
                    setImageBatch((prev) => [...prev, ...newItems]);
                  }
                }}
              />

              <label
                htmlFor="img-batch-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 rounded-xl hover:border-amber-500/50 bg-[#161B26] hover:bg-[#1C2332] transition-all cursor-pointer text-center group"
              >
                <FilePlus className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-white">
                  {isEn ? "Select Image Files for Batch Conversion" : "Pilih File Gambar untuk Konversi Batch"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG, WebP, GIF, SVG, BMP, AVIF
                </div>
              </label>

              {imageBatch.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {imageBatch.length} {isEn ? "files in queue" : "file dalam antrean"}
                    </span>
                    <button
                      onClick={() => setImageBatch([])}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isEn ? "Clear All" : "Hapus Semua"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-black/30 border border-white/5">
                    {imageBatch.map((item, i) => (
                      <div
                        key={item.id}
                        className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#141A24] aspect-square flex flex-col items-center justify-center p-1 text-center"
                      >
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full h-full object-cover rounded opacity-80"
                        />
                        <span className="absolute bottom-1 inset-x-1 text-[9px] font-mono text-white bg-black/80 truncate px-1 rounded">
                          {item.file.name}
                        </span>
                        <button
                          onClick={() => setImageBatch(imageBatch.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <ShimmerButton
                      onClick={handleConvertImages}
                      disabled={isConvertingImages}
                      className="h-10 px-5 text-xs font-bold"
                    >
                      {isConvertingImages
                        ? isEn
                          ? "Converting Images..."
                          : "Mengonversi Gambar..."
                        : isEn
                        ? `Convert All to ${imgFormat.toUpperCase()}`
                        : `Konversi Semua ke ${imgFormat.toUpperCase()}`}
                    </ShimmerButton>
                  </div>

                  {/* Converted items download list */}
                  {imageBatch.some((b) => b.status === "done") && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {isEn ? "Converted Files Ready:" : "File Hasil Konversi:"}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {imageBatch
                          .filter((b) => b.status === "done")
                          .map((b) => {
                            const newFilename = `${b.file.name.replace(/\.[^/.]+$/, "")}.${imgFormat}`;
                            return (
                              <div
                                key={b.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141A24] border border-white/10 text-xs"
                              >
                                <span className="truncate flex-1 font-mono text-slate-300 pr-2">
                                  {newFilename} ({b.convertedSize} KB)
                                </span>
                                <button
                                  onClick={() =>
                                    triggerDownload(b.convertedUrl!, newFilename, b.id)
                                  }
                                  className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
                                >
                                  <Download className="w-3 h-3" />
                                  {downloadedSet.has(b.id) ? "✓" : isEn ? "Download" : "Unduh"}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. VIDEO TO MP3 / AUDIO */}
          {activeTool === "video-to-mp3" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Extract pristine audio directly from MP4 and WebM videos without server uploads."
                  : "Ekstrak trek suara atau musik dari video MP4/WebM secara langsung di browsermu."}
              </p>

              <input
                type="file"
                accept="video/*"
                className="hidden"
                id="video-to-mp3-input"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setVideoFile(e.target.files[0]);
                    setAudioResultUrl(null);
                  }
                }}
              />

              <label
                htmlFor="video-to-mp3-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 rounded-xl hover:border-amber-500/50 bg-[#161B26] hover:bg-[#1C2332] transition-all cursor-pointer text-center group"
              >
                <Music className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-white">
                  {videoFile
                    ? videoFile.name
                    : isEn
                    ? "Select Video File (MP4, WebM, MOV)"
                    : "Pilih File Video (MP4, WebM, MOV)"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {videoFile ? formatBytes(videoFile.size) : isEn ? "Extracts audio track" : "Ekstrak trek audio"}
                </div>
              </label>

              {videoFile && (
                <div className="flex items-center gap-3 pt-2">
                  <ShimmerButton
                    onClick={handleExtractAudio}
                    disabled={isExtractingAudio}
                    className="h-10 px-5 text-xs font-bold"
                  >
                    {isExtractingAudio
                      ? isEn
                        ? `Extracting (${audioProgress}%)...`
                        : `Mengekstrak (${audioProgress}%)...`
                      : isEn
                      ? "Extract Audio Track"
                      : "Mulai Ekstraksi Audio"}
                  </ShimmerButton>

                  {audioResultUrl && (
                    <button
                      onClick={() =>
                        triggerDownload(
                          audioResultUrl,
                          `${videoFile.name.replace(/\.[^/.]+$/, "")}.wav`,
                          "video-audio"
                        )
                      }
                      className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      {downloadedSet.has("video-audio")
                        ? isEn
                          ? "Downloaded ✓"
                          : "Sudah Diunduh ✓"
                        : isEn
                        ? "Download Audio"
                        : "Unduh File Audio"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. DATA STUDIO */}
          {activeTool === "data-studio" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Transform data bidirectionally between JSON, CSV tabular data, and YAML."
                  : "Ubah data secara instan antara format JSON, tabel CSV, dan dokumen YAML."}
              </p>

              <div className="flex items-center gap-2">
                {[
                  { id: "json-to-csv", label: "JSON → CSV" },
                  { id: "csv-to-json", label: "CSV → JSON" },
                  { id: "json-to-yaml", label: "JSON → YAML" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setDataMode(mode.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      dataMode === mode.id
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                        : "bg-[#161B26] text-slate-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">{isEn ? "Input Data:" : "Data Input:"}</label>
                  <textarea
                    rows={8}
                    placeholder={
                      dataMode === "json-to-csv"
                        ? '[{"id": 1, "name": "Grainox", "role": "Utility"}]'
                        : "id,name,role\n1,Grainox,Utility"
                    }
                    value={dataInput}
                    onChange={(e) => setDataInput(e.target.value)}
                    className="w-full bg-[#141A24] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">{isEn ? "Output Result:" : "Hasil Output:"}</label>
                    {dataOutput && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dataOutput);
                          setCopiedData(true);
                          setTimeout(() => setCopiedData(false), 2000);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedData ? (isEn ? "Copied! ✓" : "Tersalin! ✓") : isEn ? "Copy Result" : "Salin"}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={8}
                    readOnly
                    placeholder={isEn ? "Converted data will appear here..." : "Hasil konversi data akan muncul di sini..."}
                    value={dataOutput}
                    className="w-full bg-[#0D1017] border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {dataError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {dataError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <ShimmerButton
                  onClick={handleTransformData}
                  disabled={!dataInput.trim()}
                  className="h-10 px-5 text-xs font-bold"
                >
                  {isEn ? "Convert Data Now" : "Konversi Data"}
                </ShimmerButton>

                {dataOutput && (
                  <button
                    onClick={() => {
                      const ext = dataMode === "json-to-csv" ? "csv" : dataMode === "csv-to-json" ? "json" : "yaml";
                      const blob = new Blob([dataOutput], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      triggerDownload(url, `converted-data.${ext}`, "data-output");
                    }}
                    className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {isEn ? "Download Data File" : "Unduh File Data"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5. ZIP STUDIO */}
          {activeTool === "zip-studio" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Compress files into a single ZIP archive or inspect archive contents safely on-device."
                  : "Kompres berbagai file menjadi arsip ZIP atau periksa isi file ZIP langsung di browsermu."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Create ZIP */}
                <div className="p-4 rounded-xl bg-[#141A24] border border-white/10 space-y-3">
                  <div className="font-bold text-white text-xs">{isEn ? "Create ZIP Archive" : "Buat Arsip ZIP Baru"}</div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="create-zip-input"
                    onChange={(e) => {
                      if (e.target.files) {
                        setZipFiles(Array.from(e.target.files));
                        setZipResultUrl(null);
                      }
                    }}
                  />
                  <label
                    htmlFor="create-zip-input"
                    className="block p-4 border border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-amber-500/50 text-xs text-slate-300"
                  >
                    {zipFiles.length > 0
                      ? isEn
                        ? `${zipFiles.length} files selected`
                        : `${zipFiles.length} file dipilih`
                      : isEn
                      ? "Select files to archive into ZIP"
                      : "Pilih file untuk di-ZIP"}
                  </label>

                  {zipFiles.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <ShimmerButton
                        onClick={handleCreateZip}
                        disabled={isZipping}
                        className="h-9 px-4 text-xs font-bold"
                      >
                        {isZipping ? (isEn ? "Zipping..." : "Membuat ZIP...") : isEn ? "Build ZIP" : "Buat ZIP"}
                      </ShimmerButton>

                      {zipResultUrl && (
                        <button
                          onClick={() =>
                            triggerDownload(
                              zipResultUrl,
                              `grainox-archive-${Date.now()}.zip`,
                              "zip-created"
                            )
                          }
                          className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isEn ? "Download ZIP" : "Unduh ZIP"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inspect ZIP */}
                <div className="p-4 rounded-xl bg-[#141A24] border border-white/10 space-y-3">
                  <div className="font-bold text-white text-xs">{isEn ? "Inspect ZIP Archive" : "Buka & Periksa File ZIP"}</div>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    id="inspect-zip-input"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleInspectZip(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="inspect-zip-input"
                    className="block p-4 border border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-amber-500/50 text-xs text-slate-300"
                  >
                    {isEn ? "Choose .ZIP file to extract contents" : "Pilih file .ZIP untuk dibaca isinya"}
                  </label>

                  {zipEntries.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {zipEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-mono text-slate-300 p-1.5 rounded bg-black/40"
                        >
                          <span className="truncate pr-2">{entry.name}</span>
                          <span className="text-slate-500 shrink-0">{formatBytes(entry.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL CONVERTER CATALOG GRID */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {isEn ? "Complete Converter Tools Suite" : "Katalog Lengkap Converter"}{" "}
              <span className="text-xs font-normal text-amber-400 font-mono">
                ({toolsList.length} {isEn ? "Tools" : "Alat"})
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isEn
                ? "Select a converter module below to open its dedicated workspace"
                : "Pilih modul converter di bawah untuk membuka ruang kerja studio"}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder={isEn ? "Search converter tools... (e.g. webp, mp3)" : "Cari converter... (misal: webp, mp3)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12151E] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;

            return (
              <div
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? "bg-[#161B26] border-amber-500/60 shadow-lg shadow-amber-500/10"
                    : "bg-[#11151D] hover:bg-[#151922] border-white/10 hover:border-amber-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${tool.accent}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/10">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/[0.06] mt-4">
                  <span className="text-[11px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {isSelected
                      ? isEn
                        ? "Active Workspace •"
                        : "Sedang Aktif •"
                      : isEn
                      ? "Open Studio →"
                      : "Buka Studio →"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Converter</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Tool Analytics Bar */}
      <ToolAnalyticsBar tool="convert" />
    </div>
  );
}
