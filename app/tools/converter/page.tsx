"use client";

import { useState, useRef } from "react";
import {
  ArrowRightLeft,
  ArrowLeft,
  RefreshCw,
  Upload,
  Download,
  FileImage,
  X,
  Sliders,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import CleanLink from "@/components/ui/CleanLink";
import ShimmerButton from "@/components/ui/ShimmerButton";
import BorderBeam from "@/components/ui/BorderBeam";
import ToolAnalyticsBar from "@/components/analytics/ToolAnalyticsBar";
import { recordToolUsage } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";

interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSizeKb: string;
  status: "pending" | "converting" | "done" | "error";
  convertedUrl?: string;
  convertedSizeKb?: string;
  convertedFormat?: "webp" | "png" | "jpeg";
}

export default function ConverterPage() {
  const { t } = useLanguage();
  const [format, setFormat] = useState<"webp" | "png" | "jpeg">("webp");
  const [quality, setQuality] = useState<number>(90);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isConvertingBatch, setIsConvertingBatch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatOptions = [
    { id: "webp" as const, label: "WebP", desc: t.tools.converter.formatOptions.webpDesc },
    { id: "png" as const, label: "PNG", desc: t.tools.converter.formatOptions.pngDesc },
    { id: "jpeg" as const, label: "JPG", desc: t.tools.converter.formatOptions.jpegDesc },
  ];

  const addFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newItems: BatchItem[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      originalSizeKb: (file.size / 1024).toFixed(1),
      status: "pending",
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item?.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    setItems([]);
  };

  const convertSingle = (item: BatchItem): Promise<{ url: string; sizeKb: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = item.previewUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to initialize canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const mimeType =
          format === "webp" ? "image/webp" : format === "png" ? "image/png" : "image/jpeg";
        const q = format === "png" ? undefined : quality / 100;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob generated null"));
              return;
            }
            const url = URL.createObjectURL(blob);
            resolve({
              url,
              sizeKb: (blob.size / 1024).toFixed(1),
            });
          },
          mimeType,
          q
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  const handleConvertAll = async () => {
    if (items.length === 0 || isConvertingBatch) return;
    setIsConvertingBatch(true);

    for (const item of items) {
      if (item.status === "done" && item.convertedFormat === format) continue;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "converting" } : i))
      );

      try {
        const res = await convertSingle(item);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "done",
                  convertedUrl: res.url,
                  convertedSizeKb: res.sizeKb,
                  convertedFormat: format,
                }
              : i
          )
        );
      } catch (err) {
        console.error("Failed to convert item:", err);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i))
        );
      }
    }

    setIsConvertingBatch(false);
    recordToolUsage("convert", items.length * 1.5);
  };

  const handleDownloadAll = () => {
    const doneItems = items.filter((i) => i.status === "done" && i.convertedUrl);
    doneItems.forEach((item, index) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = item.convertedUrl!;
        const baseName = item.file.name.replace(/\.[^/.]+$/, "");
        a.download = `${baseName}.${item.convertedFormat || format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
  };

  const completedCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
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
              {t.tools.converter.title}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {t.tools.converter.badge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
            {t.tools.converter.desc}
          </p>
        </div>

        {/* Hidden Multi-file Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl bg-[#11151D] border border-white/[0.1] p-4 sm:p-5 space-y-4 shadow-2xl relative overflow-hidden">
        <BorderBeam size={320} duration={12} colorFrom="#F59E0B" colorTo="#FEF08A" />
        {/* Drop Zone / Add Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed p-6 sm:p-8 text-center rounded-xl transition-all select-none ${
            isDragging
              ? "border-amber-400 bg-amber-500/15 scale-[1.01]"
              : "border-white/20 hover:border-amber-500/50 bg-[#0B0E14]/80"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2.5 transition-transform ${
              isDragging
                ? "bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/30"
                : "bg-amber-500/10 border border-amber-500/25 text-amber-400"
            }`}
          >
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm sm:text-base font-bold text-white tracking-tight">
            {isDragging
              ? t.tools.converter.dropDropNow
              : t.tools.converter.dropTitle}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {t.tools.converter.dropSubtitle} <span className="text-amber-400 font-semibold">{t.tools.converter.batchNotice}</span>
          </p>
          <div className="mt-3.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="font-bold text-xs h-9 px-4 shadow-md shadow-amber-500/20"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              {t.tools.converter.btnPickFiles}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">JPG</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">PNG</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">WEBP</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">GIF</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">BMP</span>
          </div>
        </div>

        {/* Conversion Settings: Format & Quality Slider */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#0B0E14] border border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> {t.tools.converter.targetFormat}
            </span>

            {format !== "png" && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-300">{t.tools.converter.qualityLabel}</span>
                <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {quality}%
                </span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-24 sm:w-32 accent-amber-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {formatOptions.map((item) => {
              const active = format === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    active
                      ? "border-amber-400 bg-amber-500/10 text-white shadow-sm ring-1 ring-amber-400/30"
                      : "border-white/[0.08] bg-[#11151D] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold font-mono text-xs ${active ? "text-amber-400" : "text-white"}`}>
                      {item.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Queued Files List */}
        {items.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <FileImage className="w-3.5 h-3.5 text-amber-400" />
                {t.tools.converter.queueTitle} ({items.length} {items.length > 1 ? "files" : "file"}):
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t.tools.converter.clearAll}
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 bg-slate-900"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <span>{t.tools.converter.originalLabel} {item.originalSizeKb} KB</span>
                        {item.convertedSizeKb && (
                          <>
                            <span>→</span>
                            <span className="text-emerald-400 font-bold">
                              {t.tools.converter.resultLabel} {item.convertedSizeKb} KB ({item.convertedFormat?.toUpperCase()})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "converting" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.tools.converter.convertingSingle}
                      </span>
                    )}

                    {item.status === "done" && item.convertedUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = item.convertedUrl!;
                          const baseName = item.file.name.replace(/\.[^/.]+$/, "");
                          a.download = `${baseName}.${item.convertedFormat || format}`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" /> {t.tools.converter.downloadSingle}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title="Remove from queue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              {isConvertingBatch ? (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:flex-1 justify-center h-11 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20"
                  isLoading={true}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {t.tools.converter.convertingAll}
                </Button>
              ) : (
                <ShimmerButton
                  className="w-full sm:flex-1 h-11"
                  onClick={handleConvertAll}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {t.tools.converter.convertAll} ({items.length} {items.length > 1 ? "Files" : "File"}) → {format.toUpperCase()}
                </ShimmerButton>
              )}

              {completedCount > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 text-xs sm:text-sm shadow-lg shadow-emerald-500/20"
                  onClick={handleDownloadAll}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  {t.tools.converter.downloadAll} ({completedCount} {completedCount > 1 ? "Files" : "File"})
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Tool Analytics Bar */}
      <ToolAnalyticsBar tool="convert" />
    </div>
  );
}
