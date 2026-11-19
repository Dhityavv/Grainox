"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Upload,
  Download,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Zap,
  RefreshCw,
  Sliders,
} from "lucide-react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import Button from "@/components/ui/Button";
import CleanLink from "@/components/ui/CleanLink";
import ShimmerButton from "@/components/ui/ShimmerButton";
import BorderBeam from "@/components/ui/BorderBeam";
import ToolAnalyticsBar from "@/components/analytics/ToolAnalyticsBar";
import { runAiUpscale, type UpscaleProgress } from "@/lib/ai-upscaler";
import { recordToolUsage } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";

export default function UpscalePage() {
  const { t } = useLanguage();
  const [scale, setScale] = useState<2 | 4>(4);
  const [selectedModel, setSelectedModel] = useState<"ultrasharp-4x" | "digital-art-4x" | "remacri-4x">("ultrasharp-4x");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UpscaleProgress | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Image states
  const [beforeImg, setBeforeImg] = useState<string | null>(null);
  const [afterImg, setAfterImg] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<number | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    width: number;
    height: number;
    sizeMb: string;
    engine: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelOptions = [
    {
      id: "ultrasharp-4x" as const,
      name: t.tools.upscale.models.ultrasharp.name,
      badge: t.tools.upscale.models.ultrasharp.badge,
      tagline: t.tools.upscale.models.ultrasharp.tagline,
      desc: t.tools.upscale.models.ultrasharp.desc,
    },
    {
      id: "digital-art-4x" as const,
      name: t.tools.upscale.models.digitalArt.name,
      badge: t.tools.upscale.models.digitalArt.badge,
      tagline: t.tools.upscale.models.digitalArt.tagline,
      desc: t.tools.upscale.models.digitalArt.desc,
    },
    {
      id: "remacri-4x" as const,
      name: t.tools.upscale.models.remacri.name,
      badge: t.tools.upscale.models.remacri.badge,
      tagline: t.tools.upscale.models.remacri.tagline,
      desc: t.tools.upscale.models.remacri.desc,
    },
  ];

  const handleProcessFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setImageName(file.name);
    setImageSizeKb((file.size / 1024).toFixed(1));
    setHasResult(false);
    setDownloadUrl(null);
    setResultMeta(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBeforeImg(dataUrl);
      setAfterImg(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setCurrentAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleResetImage = () => {
    setBeforeImg(null);
    setAfterImg(null);
    setImageName(null);
    setImageSizeKb(null);
    setOrigDimensions(null);
    setCurrentAspectRatio(undefined);
    setHasResult(false);
    setDownloadUrl(null);
    setResultMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartUpscale = async () => {
    if (!beforeImg) return;
    setIsProcessing(true);
    setResultMeta(null);
    setProgress({ percent: 1, stage: `Initializing ${selectedModel.toUpperCase()} Engine...` });

    try {
      const res = await runAiUpscale(beforeImg, scale, selectedModel, (p) => setProgress(p));
      setAfterImg(res.dataUrl);
      setDownloadUrl(res.dataUrl);
      setResultMeta({
        width: res.width,
        height: res.height,
        sizeMb: (res.sizeBytes / (1024 * 1024)).toFixed(2),
        engine: res.method,
      });
      setHasResult(true);
      recordToolUsage("upscale");
    } catch (err) {
      console.error("Upscale failed:", err);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const currentModelObj = modelOptions.find((m) => m.id === selectedModel) || modelOptions[0];

  return (
    <div className="max-w-[820px] mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3.5">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t.tools.upscale.title}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {t.tools.upscale.badge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
            {t.tools.upscale.desc}
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomUpload}
        />

        {beforeImg && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto justify-center h-8 text-xs shrink-0 border-white/10 hover:border-amber-400/50"
            leftIcon={<Upload className="w-3.5 h-3.5 text-amber-400" />}
          >
            {t.tools.upscale.changePhoto}
          </Button>
        )}
      </div>

      {/* Main Studio Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleProcessFile(file);
        }}
        className={`rounded-2xl bg-[#11151D] border p-3.5 sm:p-5 space-y-3.5 shadow-2xl relative overflow-hidden ${
          isDragging
            ? "border-amber-400 ring-2 ring-amber-500/25 bg-[#141A24]"
            : "border-white/[0.12]"
        }`}
      >
        <BorderBeam size={320} duration={10} colorFrom="#F59E0B" colorTo="#FEF08A" />
        {/* Model AI Selector & Scale Controls (Streamlined Bar) */}
        <div className="space-y-2.5 pb-3 border-b border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> {t.tools.upscale.modelSelect}
            </span>

            {/* Scale Target Toggle (2x vs 4x) */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0B0E14] p-1 rounded-xl border border-white/[0.12]">
              <span className="text-xs text-slate-400 px-2 font-medium">{t.tools.upscale.scaleLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setScale(2);
                  setHasResult(false);
                }}
                className={`chip-pop px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                  scale === 2
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.tools.upscale.scale2x}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(4);
                  setHasResult(false);
                }}
                className={`chip-pop px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                  scale === 4
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.tools.upscale.scale4x}
              </button>
            </div>
          </div>

          {/* 3 Model Cards Segmented Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {modelOptions.map((m) => {
              const active = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(m.id);
                    setHasResult(false);
                  }}
                  className={`chip-pop text-left p-2.5 rounded-xl border transition-all relative ${
                    active
                      ? "border-amber-400 bg-amber-500/15 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/40 text-white"
                      : "border-white/[0.08] bg-[#0E1219] hover:border-white/20 hover:bg-[#141A24] text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-mono font-bold ${active ? "text-amber-400" : "text-white"}`}>
                      {m.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-slate-200 border border-white/10">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">
                    {m.tagline}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current File Tag & Result Stats Bar */}
        {beforeImg && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-[#0B0E14] border border-white/[0.08] text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-slate-400 shrink-0">{t.tools.upscale.inputLabel}</span>
              <span className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{imageName}</span>
              {origDimensions && (
                <span className="text-slate-400 shrink-0">({origDimensions.width}×{origDimensions.height} px • {imageSizeKb} KB)</span>
              )}
            </div>

            {resultMeta && (
              <div className="text-emerald-400 font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{t.tools.upscale.resultLabel} {resultMeta.width} × {resultMeta.height} px ({resultMeta.sizeMb} MB)</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300 border border-emerald-500/30">
                  {resultMeta.engine}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Progress Bar */}
        {isProcessing && progress && (
          <div className="p-3 rounded-xl bg-[#0E1219] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 animate-spin" /> {progress.stage}
              </span>
              <span className="text-white font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                {progress.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Stage Viewport with Studio Grid */}
        <div className="w-full h-[260px] xs:h-[300px] sm:h-[360px] rounded-xl bg-[#080A0E] border border-white/[0.12] relative flex items-center justify-center p-2 overflow-hidden shadow-inner studio-grid">
          {/* Subtle studio grid pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#263142_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none" />

          {/* 1. Direct Drag & Drop View */}
          {!beforeImg ? (
            <div
              className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-all select-none ${
                isDragging
                  ? "border-amber-400 bg-amber-500/15 scale-[1.01]"
                  : "border-white/20 hover:border-amber-500/50 bg-[#0B0E14]/80"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-transform ${
                  isDragging
                    ? "bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/30"
                    : "bg-amber-500/10 border border-amber-500/25 text-amber-400"
                }`}
              >
                <Upload className="w-6 h-6" />
              </div>

              <p className="text-base font-bold text-white tracking-tight">
                {isDragging ? t.tools.upscale.dropDropNow : t.tools.upscale.dropTitle}
              </p>
              <p className="text-xs text-slate-300 mt-0.5 max-w-sm">
                {t.tools.upscale.dropSubtitle}
              </p>

              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-bold text-xs h-9 px-4 shadow-md shadow-amber-500/20"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  {t.tools.upscale.btnPickComputer}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[10px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">JPG</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">PNG</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">WEBP</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">{t.tools.upscale.scale4x}</span>
              </div>
            </div>
          ) : hasResult && afterImg ? (
            /* 2. Before / After Interactive Comparison Slider */
            <BeforeAfterSlider
              beforeImage={beforeImg}
              afterImage={afterImg}
              aspectRatioProp={currentAspectRatio}
              beforeLabel={t.tools.upscale.compareOriginal}
              afterLabel={`${t.tools.upscale.compareEnhanced} (${scale}x HD)`}
            />
          ) : (
            /* 3. Original Preview Stage Before Processing */
            <div
              style={{
                aspectRatio: currentAspectRatio ? `${currentAspectRatio}` : undefined,
              }}
              className="relative select-none overflow-hidden rounded-xl border border-white/20 bg-[#0B0D10] h-full max-h-full max-w-full shadow-2xl mx-auto flex items-center justify-center"
            >
              <img
                src={beforeImg}
                alt="Original"
                className="w-full h-full object-contain select-none max-h-full"
              />
              <span className="absolute top-2.5 left-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#080A0E]/90 text-slate-200 border border-white/20 backdrop-blur-md shadow-sm">
                {t.tools.upscale.originalNotUpscaled}
              </span>
              <span className="absolute bottom-2.5 right-2.5 text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded-md bg-[#080A0E]/90 border border-amber-500/30 backdrop-blur-md hidden sm:inline-block">
                ⚡ {t.tools.upscale.readyToUpscale} {scale}x HD ({currentModelObj.name})
              </span>
            </div>
          )}

          {/* Active Drag Overlay */}
          {beforeImg && isDragging && (
            <div className="absolute inset-0 z-30 bg-[#080A0E]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-400 rounded-xl m-2 pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold animate-bounce shadow-xl">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white tracking-wide">{t.tools.upscale.dropNewOverlayTitle}</p>
              <p className="text-xs text-amber-400 font-mono">{t.tools.upscale.dropNewOverlaySub}</p>
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          {!beforeImg ? (
            <ShimmerButton
              className="w-full h-11"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              {t.tools.upscale.btnPickComputer}
            </ShimmerButton>
          ) : (
            <>
              {isProcessing ? (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:flex-1 justify-center h-11 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20"
                  isLoading={true}
                  leftIcon={<Zap className="w-4 h-4" />}
                >
                  {t.tools.upscale.processing}
                </Button>
              ) : (
                <ShimmerButton
                  className="w-full sm:flex-1 h-11"
                  onClick={handleStartUpscale}
                  leftIcon={<Zap className="w-4 h-4" />}
                >
                  {t.tools.upscale.btnStartProcessing} ({scale}x HD)
                </ShimmerButton>
              )}

              {hasResult && downloadUrl && resultMeta && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 text-xs sm:text-sm shadow-lg shadow-emerald-500/20"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = `grainox-upscaled-${scale}x-${resultMeta.width}x${resultMeta.height}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  {t.tools.upscale.btnDownload} ({resultMeta.sizeMb} MB)
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center h-11 text-xs text-slate-200 border-white/10 hover:border-amber-500/40"
                onClick={handleResetImage}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                {t.tools.upscale.changePhoto}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Tool Analytics Bar */}
      <ToolAnalyticsBar tool="upscale" />
    </div>
  );
}
