"use client";

import { useState, useRef } from "react";
import {
  FileText,
  FileImage,
  Lock,
  Unlock,
  Type,
  ArrowLeft,
  Upload,
  Download,
  Check,
  CheckCircle2,
  Trash2,
  Sparkles,
  AlertCircle,
  Eye,
  FilePlus,
  RefreshCw,
  Sliders,
} from "lucide-react";
import CleanLink from "@/components/ui/CleanLink";
import Button from "@/components/ui/Button";
import ShimmerButton from "@/components/ui/ShimmerButton";
import BorderBeam from "@/components/ui/BorderBeam";
import ToolAnalyticsBar from "@/components/analytics/ToolAnalyticsBar";
import DropZone from "@/components/ui/DropZone";
import { playSuccessSound } from "@/lib/sound-effects";
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
import { createZipArchive } from "@/lib/media-converter";

type PdfToolId =
  | "image-to-pdf"
  | "compress-pdf"
  | "pdf-to-image"
  | "protect-pdf"
  | "unlock-pdf"
  | "text-to-pdf";

export default function PdfToolsPage() {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const [activeTool, setActiveTool] = useState<PdfToolId | null>("image-to-pdf");
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const triggerDownload = (url: string, filename: string, downloadId: string) => {
    playSuccessSound();
    setDownloadedSet((prev) => new Set(prev).add(downloadId));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    recordToolUsage("convert");
  };

  // Tools list for PDF Studio
  const pdfToolsList = [
    {
      id: "image-to-pdf" as PdfToolId,
      name: isEn ? "Image to PDF (Batch)" : "Gambar ke PDF (Batch)",
      badge: isEn ? "Batch Merge" : "Gabung Banyak",
      desc: isEn
        ? "Merge multiple images (JPG, PNG, WebP) into a clean, unified PDF document."
        : "Gabungkan banyak foto (JPG, PNG, WebP) menjadi satu file PDF dokumen rapi.",
      icon: FileImage,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "compress-pdf" as PdfToolId,
      name: isEn ? "Smart PDF Compressor" : "Kompres File PDF",
      badge: isEn ? "Save 30-70%" : "Hemat 30-70%",
      desc: isEn
        ? "Compress PDF file size while retaining document sharpness and readability."
        : "Kecilkan ukuran file PDF dokumen atau scan dengan optimasi stream dan resolusi.",
      icon: Sliders,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      id: "pdf-to-image" as PdfToolId,
      name: isEn ? "PDF to Image Extractor" : "PDF ke Gambar",
      badge: isEn ? "300 DPI Export" : "Resolusi Tinggi",
      desc: isEn
        ? "Extract every PDF page into high-resolution PNG or JPG image files."
        : "Ekstrak setiap halaman PDF menjadi gambar PNG/JPG berkualitas tinggi.",
      icon: FileText,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
    {
      id: "protect-pdf" as PdfToolId,
      name: isEn ? "Protect PDF (Password)" : "Kunci PDF (Password)",
      badge: "AES-256",
      desc: isEn
        ? "Encrypt and lock your PDF document with a secure password."
        : "Kunci dan enkripsi dokumen PDF dengan proteksi kata sandi aman.",
      icon: Lock,
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    },
    {
      id: "unlock-pdf" as PdfToolId,
      name: isEn ? "Unlock Protected PDF" : "Buka Kunci PDF",
      badge: isEn ? "Decrypt" : "Dekripsi",
      desc: isEn
        ? "Remove password protection from authorized PDF documents."
        : "Hilangkan kata sandi dari PDF yang terproteksi agar mudah dibuka.",
      icon: Unlock,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "text-to-pdf" as PdfToolId,
      name: isEn ? "Text to PDF Formatter" : "Teks ke Dokumen PDF",
      badge: isEn ? "A4 Layout" : "Format A4",
      desc: isEn
        ? "Format raw text, markdown, or notes into a downloadable A4 PDF document."
        : "Ketik atau paste teks untuk diekspor menjadi dokumen PDF berformat A4.",
      icon: Type,
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/25",
    },
  ];

  const quickPills = [
    { label: isEn ? "📸 Images → PDF" : "📸 Gambar → PDF", tool: "image-to-pdf" as PdfToolId },
    { label: isEn ? "📉 Compress PDF" : "📉 Kompres PDF", tool: "compress-pdf" as PdfToolId },
    { label: isEn ? "📄 PDF → Images" : "📄 PDF → Gambar", tool: "pdf-to-image" as PdfToolId },
    { label: isEn ? "🔒 Protect PDF" : "🔒 Kunci PDF", tool: "protect-pdf" as PdfToolId },
    { label: isEn ? "🔓 Unlock PDF" : "🔓 Buka PDF", tool: "unlock-pdf" as PdfToolId },
    { label: isEn ? "📝 Text → PDF" : "📝 Teks → PDF", tool: "text-to-pdf" as PdfToolId },
  ];

  const filteredTools = pdfToolsList.filter((tool) => {
    return (
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.badge.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
      alert(err.message || (isEn ? "Failed to convert images to PDF." : "Gagal mengonversi gambar ke PDF."));
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
      alert(err.message || (isEn ? "Failed to extract PDF pages." : "Gagal mengekstrak halaman PDF."));
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
      setProtectError(err.message || (isEn ? "Failed to encrypt PDF." : "Gagal mengenkripsi PDF."));
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
      setUnlockError(err.message || (isEn ? "Incorrect password or failed to decrypt PDF." : "Password salah atau PDF gagal didekripsi."));
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
      alert(err.message || (isEn ? "Failed to export text to PDF." : "Gagal mengekspor teks ke PDF."));
    } finally {
      setIsGeneratingTextPdf(false);
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
      alert(err.message || (isEn ? "Failed to compress PDF file." : "Gagal mengompresi file PDF."));
    } finally {
      setIsCompressingPdf(false);
      setCompressPdfProgress(null);
    }
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

      {/* Header Banner */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
          <span>{isEn ? "PDF Tools Studio" : "Studio Alat PDF"}</span>
          <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
            100% Client-Side
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-3xl">
          {isEn
            ? "Private, in-browser PDF utilities: Merge images to PDF, compress size, extract pages, protect with AES-256 encryption, and format text with zero server uploads."
            : "Utilitas dokumen PDF lengkap langsung di browsermu dengan privasi total tanpa batas ukuran berkas."}
        </p>
      </div>

      {/* Quick Navigation Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quickPills.map((pill) => {
          const isActive = activeTool === pill.tool;
          return (
            <button
              key={pill.tool}
              onClick={() => setActiveTool(pill.tool)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ACTIVE STUDIO WORKSPACE */}
      {activeTool && (
        <div className="rounded-2xl bg-[#11151D] border border-amber-500/30 p-4 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <BorderBeam size={320} duration={12} colorFrom="#F59E0B" colorTo="#FEF08A" />

          {/* Active Tool Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {pdfToolsList.find((t) => t.id === activeTool)?.name}
              </h2>
            </div>
            <button
              onClick={() => setActiveTool(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 transition-colors"
            >
              {isEn ? "Close Studio ✕" : "Tutup Studio ✕"}
            </button>
          </div>

          {/* 1. IMAGE TO PDF STUDIO */}
          {activeTool === "image-to-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Select or drag multiple images (JPG, PNG, WebP) to merge into a single PDF document."
                  : "Pilih atau drag beberapa gambar (JPG, PNG, WebP) untuk digabungkan menjadi dokumen PDF."}
              </p>

              <DropZone
                id="img-to-pdf-input"
                accept="image/*"
                multiple
                icon={FilePlus}
                title={isEn ? "Click or Drag & Drop Images (Batch Supported)" : "Klik atau Drag & Drop Gambar (Bisa Batch Banyak)"}
                subtitle="Mendukung JPG, PNG, WebP, GIF, BMP"
                onFilesSelected={(files) => {
                  setImgPdfFiles((prev) => [...prev, ...files]);
                  setImgPdfResultUrl(null);
                }}
              />

              {imgPdfFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {imgPdfFiles.length} {isEn ? "images selected" : "gambar dipilih"}
                    </span>
                    <button
                      onClick={() => {
                        setImgPdfFiles([]);
                        setImgPdfResultUrl(null);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isEn ? "Clear All" : "Hapus Semua"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-black/30 border border-white/5">
                    {imgPdfFiles.map((f, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#141A24] aspect-square flex flex-col items-center justify-center p-1 text-center"
                      >
                        <span className="text-[10px] font-mono text-slate-300 truncate w-full px-1">
                          #{i + 1} {f.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {formatBytes(f.size)}
                        </span>
                        <button
                          onClick={() => setImgPdfFiles(imgPdfFiles.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <ShimmerButton
                      onClick={handleProcessImgToPdf}
                      disabled={isProcessingImgPdf}
                      className="h-10 px-5 text-xs font-bold"
                    >
                      {isProcessingImgPdf
                        ? isEn
                          ? `Merging (${imgPdfProgress?.current || 0}/${imgPdfProgress?.total || 0})...`
                          : `Menggabungkan (${imgPdfProgress?.current || 0}/${imgPdfProgress?.total || 0})...`
                        : isEn
                        ? "Convert & Merge to PDF"
                        : "Gabungkan Jadi PDF"}
                    </ShimmerButton>

                    {imgPdfResultUrl && (
                      <button
                        onClick={() =>
                          triggerDownload(
                            imgPdfResultUrl,
                            `grainox-merged-${Date.now()}.pdf`,
                            "img-to-pdf"
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        {downloadedSet.has("img-to-pdf")
                          ? isEn
                            ? "Downloaded ✓"
                            : "Sudah Diunduh ✓"
                          : isEn
                          ? "Download PDF"
                          : "Unduh File PDF"}
                      </button>
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
                {isEn
                  ? "Upload a PDF to extract every page as an individual high-resolution PNG image."
                  : "Unggah file PDF untuk mengekstrak setiap halaman menjadi file gambar PNG berkualitas tinggi."}
              </p>

              <DropZone
                id="pdf-to-img-input"
                accept="application/pdf"
                icon={Upload}
                title={
                  pdfToImgFile
                    ? pdfToImgFile.name
                    : isEn
                    ? "Click or Drag & Drop PDF Document"
                    : "Pilih atau Drag & Drop File PDF"
                }
                subtitle={
                  pdfToImgFile
                    ? formatBytes(pdfToImgFile.size)
                    : isEn
                    ? "Extract all pages to crisp high-res PNG images"
                    : "Ekstrak semua halaman menjadi gambar tajam"
                }
                badge={pdfToImgFile ? "PDF Selected" : undefined}
                onFilesSelected={(files) => {
                  if (files[0]) {
                    setPdfToImgFile(files[0]);
                    setPdfPages([]);
                  }
                }}
              />

              {pdfToImgFile && (
                <div className="flex items-center gap-3">
                  <ShimmerButton
                    onClick={handleExtractPdfPages}
                    disabled={isExtractingPdf}
                    className="h-10 px-5 text-xs font-bold"
                  >
                    {isExtractingPdf
                      ? isEn
                        ? `Extracting Page ${pdfExtractProgress?.current || 1}...`
                        : `Mengekstrak Halaman ${pdfExtractProgress?.current || 1}...`
                      : isEn
                      ? "Extract All Pages to PNG"
                      : "Ekstrak Halaman ke Gambar"}
                  </ShimmerButton>

                  {pdfPages.length > 0 && (
                    <button
                      onClick={handleDownloadAllPagesZip}
                      className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? "Download All as ZIP" : "Unduh Semua (ZIP)"}
                    </button>
                  )}
                </div>
              )}

              {pdfPages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  {pdfPages.map((page) => (
                    <div
                      key={page.pageNum}
                      className="rounded-xl bg-[#141A24] border border-white/10 p-3 space-y-2.5"
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black flex items-center justify-center border border-white/5">
                        <img
                          src={page.dataUrl}
                          alt={`Page ${page.pageNum}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 font-semibold">
                          {isEn ? `Page ${page.pageNum}` : `Halaman ${page.pageNum}`}
                        </span>
                        <button
                          onClick={() => {
                            const url = URL.createObjectURL(page.blob);
                            triggerDownload(
                              url,
                              `page-${page.pageNum}.png`,
                              `page-${page.pageNum}`
                            );
                          }}
                          className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadedSet.has(`page-${page.pageNum}`) ? "✓" : "PNG"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. COMPRESS PDF STUDIO */}
          {activeTool === "compress-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Compress PDF file size directly in your browser. Choose compression preset according to your needs."
                  : "Kecilkan ukuran file dokumen PDF langsung di browser Anda. Pilih level kompresi sesuai kebutuhan."}
              </p>

              <DropZone
                id="compress-pdf-input"
                accept="application/pdf"
                icon={Sliders}
                title={
                  compressPdfFile
                    ? compressPdfFile.name
                    : isEn
                    ? "Click or Drag & Drop PDF Document"
                    : "Pilih atau Drag & Drop File PDF"
                }
                subtitle={
                  compressPdfFile
                    ? formatBytes(compressPdfFile.size)
                    : isEn
                    ? "Supports scan, text, and large PDF files"
                    : "Mendukung dokumen scan dan teks"
                }
                badge={compressPdfFile ? "PDF Selected" : undefined}
                onFilesSelected={(files) => {
                  if (files[0]) {
                    setCompressPdfFile(files[0]);
                    setCompressPdfResult(null);
                  }
                }}
              />

              {compressPdfFile && (
                <div className="space-y-4 p-4 rounded-xl bg-[#141A24] border border-white/10">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      {isEn ? "Compression Level:" : "Tingkat Kompresi:"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: "low",
                          title: isEn ? "Low Compression" : "Kompresi Ringan",
                          desc: isEn ? "Maximum clarity" : "Kualitas maksimal",
                        },
                        {
                          id: "medium",
                          title: isEn ? "Recommended" : "Rekomendasi",
                          desc: isEn ? "Balanced size & quality" : "Ukuran seimbang",
                        },
                        {
                          id: "high",
                          title: isEn ? "High Compression" : "Kompresi Ekstrem",
                          desc: isEn ? "Smallest file size" : "Ukuran terkecil",
                        },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setCompressPdfLevel(lvl.id as any)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            compressPdfLevel === lvl.id
                              ? "bg-emerald-500/20 border-emerald-500/60 text-white"
                              : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{lvl.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{lvl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <ShimmerButton
                      onClick={handleProcessCompressPdf}
                      disabled={isCompressingPdf}
                      className="h-10 px-5 text-xs font-bold"
                    >
                      {isCompressingPdf
                        ? isEn
                          ? `Compressing (${compressPdfProgress?.current || 0}/${compressPdfProgress?.total || 0})...`
                          : `Mengompresi (${compressPdfProgress?.current || 0}/${compressPdfProgress?.total || 0})...`
                        : isEn
                        ? "Compress PDF Now"
                        : "Mulai Kompresi PDF"}
                    </ShimmerButton>

                    {compressPdfResult && (
                      <button
                        onClick={() =>
                          triggerDownload(
                            compressPdfResult.url,
                            `compressed-${compressPdfFile.name}`,
                            "compress-pdf"
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        {downloadedSet.has("compress-pdf")
                          ? isEn
                            ? "Downloaded ✓"
                            : "Sudah Diunduh ✓"
                          : isEn
                          ? `Download (${formatBytes(compressPdfResult.compressedSize)})`
                          : `Unduh (${formatBytes(compressPdfResult.compressedSize)})`}
                      </button>
                    )}
                  </div>

                  {compressPdfResult && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">{isEn ? "Original:" : "Ukuran Asli:"} </span>
                        <strong className="text-white">{formatBytes(compressPdfResult.originalSize)}</strong>
                        <span className="mx-2 text-slate-600">→</span>
                        <span className="text-slate-400">{isEn ? "Compressed:" : "Setelah Kompres:"} </span>
                        <strong className="text-emerald-400">{formatBytes(compressPdfResult.compressedSize)}</strong>
                      </div>
                      <span className="font-bold font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                        {isEn ? `Saved ${compressPdfResult.savingsPercent}%` : `Hemat ${compressPdfResult.savingsPercent}%`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. PROTECT PDF STUDIO */}
          {activeTool === "protect-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Add AES-256 military-grade encryption and password protection to your PDF document."
                  : "Kunci dokumen PDF Anda dengan enkripsi kata sandi standar AES-256 yang aman."}
              </p>

              <DropZone
                id="protect-pdf-input"
                accept="application/pdf"
                icon={Lock}
                title={
                  protectFile
                    ? protectFile.name
                    : isEn
                    ? "Click or Drag & Drop PDF to Encrypt"
                    : "Pilih atau Drag & Drop File PDF untuk Diproteksi"
                }
                subtitle={
                  protectFile ? formatBytes(protectFile.size) : "Standard AES-256 Military Encryption"
                }
                badge={protectFile ? "PDF Selected" : undefined}
                onFilesSelected={(files) => {
                  if (files[0]) {
                    setProtectFile(files[0]);
                    setProtectResultUrl(null);
                    setProtectError("");
                  }
                }}
              />

              {protectFile && (
                <div className="space-y-3 p-4 rounded-xl bg-[#141A24] border border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {isEn ? "Set PDF Password:" : "Ketik Kata Sandi PDF:"}
                    </label>
                    <input
                      type="password"
                      placeholder={isEn ? "Enter strong password..." : "Masukkan kata sandi aman..."}
                      value={protectPassword}
                      onChange={(e) => setProtectPassword(e.target.value)}
                      className="w-full bg-[#0D1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {protectError && (
                    <div className="text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {protectError}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <ShimmerButton
                      onClick={handleProtectPdf}
                      disabled={isProtecting || !protectPassword}
                      className="h-10 px-5 text-xs font-bold"
                    >
                      {isProtecting
                        ? isEn
                          ? "Encrypting PDF..."
                          : "Mengenkripsi PDF..."
                        : isEn
                        ? "Encrypt & Lock PDF"
                        : "Kunci Dokumen PDF"}
                    </ShimmerButton>

                    {protectResultUrl && (
                      <button
                        onClick={() =>
                          triggerDownload(
                            protectResultUrl,
                            `protected-${protectFile.name}`,
                            "protect-pdf"
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        {downloadedSet.has("protect-pdf")
                          ? isEn
                            ? "Downloaded ✓"
                            : "Sudah Diunduh ✓"
                          : isEn
                          ? "Download Locked PDF"
                          : "Unduh PDF Terkunci"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. UNLOCK PDF STUDIO */}
          {activeTool === "unlock-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Remove password protection from an authorized PDF document."
                  : "Hilangkan proteksi password dari file PDF resmi agar mudah dibuka kapan saja."}
              </p>

              <DropZone
                id="unlock-pdf-input"
                accept="application/pdf"
                icon={Unlock}
                title={
                  unlockFile
                    ? unlockFile.name
                    : isEn
                    ? "Click or Drag & Drop Password-Protected PDF"
                    : "Pilih atau Drag & Drop File PDF yang Terkunci"
                }
                subtitle={
                  unlockFile ? formatBytes(unlockFile.size) : isEn ? "Requires valid password to decrypt" : "Perlu password untuk dekripsi"
                }
                badge={unlockFile ? "PDF Selected" : undefined}
                onFilesSelected={(files) => {
                  if (files[0]) {
                    setUnlockFile(files[0]);
                    setUnlockResultUrl(null);
                    setUnlockError("");
                  }
                }}
              />

              {unlockFile && (
                <div className="space-y-3 p-4 rounded-xl bg-[#141A24] border border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {isEn ? "Enter Current Password:" : "Masukkan Kata Sandi Saat Ini:"}
                    </label>
                    <input
                      type="password"
                      placeholder={isEn ? "Type PDF password..." : "Ketik kata sandi..."}
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      className="w-full bg-[#0D1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {unlockError && (
                    <div className="text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {unlockError}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <ShimmerButton
                      onClick={handleUnlockPdf}
                      disabled={isUnlocking || !unlockPassword}
                      className="h-10 px-5 text-xs font-bold"
                    >
                      {isUnlocking
                        ? isEn
                          ? "Decrypting PDF..."
                          : "Mendekripsi PDF..."
                        : isEn
                        ? "Remove Password & Unlock"
                        : "Buka Kunci PDF"}
                    </ShimmerButton>

                    {unlockResultUrl && (
                      <button
                        onClick={() =>
                          triggerDownload(
                            unlockResultUrl,
                            `unlocked-${unlockFile.name}`,
                            "unlock-pdf"
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        {downloadedSet.has("unlock-pdf")
                          ? isEn
                            ? "Downloaded ✓"
                            : "Sudah Diunduh ✓"
                          : isEn
                          ? "Download Unlocked PDF"
                          : "Unduh PDF Bebas Kunci"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. TEXT TO PDF STUDIO */}
          {activeTool === "text-to-pdf" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {isEn
                  ? "Format notes, memos, or text into a cleanly styled A4 PDF document."
                  : "Tulis atau tempel teks catatan untuk diekspor menjadi dokumen PDF format A4 rapi."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isEn ? "Document Title:" : "Judul Dokumen:"}
                  </label>
                  <input
                    type="text"
                    placeholder={isEn ? "e.g. Project Summary..." : "Contoh: Laporan Ringkasan..."}
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="w-full bg-[#141A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isEn ? "Font Size:" : "Ukuran Font:"}
                  </label>
                  <select
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="w-full bg-[#141A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={9}>9 pt (Compact)</option>
                    <option value={11}>11 pt (Standard A4)</option>
                    <option value={14}>14 pt (Large)</option>
                    <option value={18}>18 pt (Headline)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isEn ? "Content / Text Body:" : "Isi Konten Teks:"}
                </label>
                <textarea
                  rows={8}
                  placeholder={
                    isEn
                      ? "Type or paste your text content here..."
                      : "Ketik atau paste teks paragraf Anda di sini..."
                  }
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full bg-[#141A24] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <ShimmerButton
                  onClick={handleGenerateTextPdf}
                  disabled={isGeneratingTextPdf || !textContent.trim()}
                  className="h-10 px-5 text-xs font-bold"
                >
                  {isGeneratingTextPdf
                    ? isEn
                      ? "Generating PDF..."
                      : "Membuat PDF..."
                    : isEn
                    ? "Generate PDF Document"
                    : "Buat File PDF"}
                </ShimmerButton>

                {textPdfUrl && (
                  <button
                    onClick={() =>
                      triggerDownload(
                        textPdfUrl,
                        `${textTitle ? textTitle.toLowerCase().replace(/\s+/g, "-") : "document"}-${Date.now()}.pdf`,
                        "text-to-pdf"
                      )
                    }
                    className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {downloadedSet.has("text-to-pdf")
                      ? isEn
                        ? "Downloaded ✓"
                        : "Sudah Diunduh ✓"
                      : isEn
                      ? "Download Document PDF"
                      : "Unduh Dokumen PDF"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL PDF CATALOG GRID */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {isEn ? "Complete PDF Tools Suite" : "Katalog Lengkap Alat PDF"}{" "}
              <span className="text-xs font-normal text-amber-400 font-mono">
                ({pdfToolsList.length} {isEn ? "Tools" : "Alat"})
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isEn
                ? "Select a tool below to open its dedicated studio workspace"
                : "Pilih salah satu alat di bawah untuk membuka ruang kerja studio"}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder={isEn ? "Search PDF tools..." : "Cari alat PDF..."}
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
                  <span className="text-[10px] font-mono text-slate-400">PDF Tool</span>
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
