"use client";

import { useState, useEffect } from "react";
import {
  Download,
  ArrowLeft,
  Video,
  Music,
  Image as ImageIcon,
  Clipboard,
  X,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  Play,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react";
import CleanLink from "@/components/ui/CleanLink";
import ShimmerButton from "@/components/ui/ShimmerButton";
import BorderBeam from "@/components/ui/BorderBeam";
import ToolAnalyticsBar from "@/components/analytics/ToolAnalyticsBar";
import type { DownloaderResult, MediaDownloadItem } from "@/lib/downloader-engine";
import { recordToolUsage } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  author: string;
  platform: string;
  platformName: string;
  thumbnail?: string;
  timestamp: number;
}

const SUPPORTED_PLATFORMS = [
  { name: "TikTok", color: "hover:border-amber-400 hover:text-amber-400" },
  { name: "Instagram", color: "hover:border-pink-400 hover:text-pink-400" },
  { name: "Twitter / X", color: "hover:border-sky-400 hover:text-sky-400" },
  { name: "Spotify", color: "hover:border-emerald-400 hover:text-emerald-400" },
  { name: "YouTube", color: "hover:border-red-400 hover:text-red-400" },
  { name: "Facebook", color: "hover:border-blue-400 hover:text-blue-400" },
  { name: "Pinterest", color: "hover:border-rose-400 hover:text-rose-400" },
  { name: "Threads", color: "hover:border-slate-200 hover:text-white" },
  { name: "Pixiv", color: "hover:border-cyan-400 hover:text-cyan-400" },
];

export default function DownloaderPage() {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadData, setDownloadData] = useState<DownloaderResult | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadedUrls, setDownloadedUrls] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{
    url: string;
    percent: number;
    loadedMb: string;
    totalMb: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Video & Audio In-Place Preview States
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("grainox_download_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  /**
   * Convert remote CDN thumbnail to permanent tiny base64 data URL so it never expires in history
   */
  const createMiniThumbnail = async (imageUrl?: string): Promise<string | undefined> => {
    if (!imageUrl) return undefined;
    try {
      return await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 96;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject();
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;
          const minDim = Math.min(natW, natH);
          const sx = (natW - minDim) / 2;
          const sy = (natH - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.65));
        };
        img.onerror = () => reject();
        img.src = imageUrl.startsWith("data:")
          ? imageUrl
          : `/api/download/stream?url=${encodeURIComponent(imageUrl)}&inline=1`;
      });
    } catch {
      return imageUrl;
    }
  };

  const saveToHistory = async (item: DownloaderResult, originalUrl: string) => {
    try {
      const persistentThumbnail = await createMiniThumbnail(item.thumbnail);
      const newEntry: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: originalUrl,
        title: item.title,
        author: item.author,
        platform: item.platform,
        platformName: item.platformName,
        thumbnail: persistentThumbnail || item.thumbnail,
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.url !== originalUrl);
        const updated = [newEntry, ...filtered].slice(0, 5);
        localStorage.setItem("grainox_download_history", JSON.stringify(updated));
        return updated;
      });
    } catch (_) {}
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("grainox_download_history");
    } catch (_) {}
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        setUrl(text);
        setErrorMessage("");
      }
    } catch {
      // clipboard access fallback
    }
  };

  const handleFetch = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setDownloadData(null);
    setIsPlayingVideo(false);
    setThumbError(false);

    const targetUrl = (customUrl || url).trim();
    if (!targetUrl) {
      setErrorMessage(t.tools.downloader.errEmptyUrl);
      return;
    }

    if (customUrl) setUrl(customUrl);
    setIsLoading(true);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || t.tools.downloader.errGeneral
        );
      }

      setDownloadData(json.data);
      setDownloadedUrls(new Set());
      saveToHistory(json.data, targetUrl);
      recordToolUsage("download");

      // Auto set first video URL for preview
      const firstVid = json.data.downloads?.find((d: any) => d.type === "video");
      if (firstVid) {
        setActiveVideoUrl(firstVid.url);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.tools.downloader.errGeneral);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (item: MediaDownloadItem) => {
    setDownloadingUrl(item.url);
    setDownloadedUrls((prev) => new Set(prev).add(item.url));

    const cleanFilename = `grainox-${downloadData?.platform || "media"}-${Date.now()}.${item.format || (item.type === "audio" ? "mp3" : "mp4")}`;
    const streamUrl = `/api/download/stream?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(cleanFilename)}`;

    try {
      const response = await fetch(streamUrl);
      if (!response.ok || !response.body) {
        throw new Error("Gagal memulai stream media");
      }

      const contentLength = response.headers.get("Content-Length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        if (totalBytes > 0) {
          const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          setDownloadProgress({
            url: item.url,
            percent,
            loadedMb: (receivedBytes / (1024 * 1024)).toFixed(1),
            totalMb: (totalBytes / (1024 * 1024)).toFixed(1),
          });
        } else {
          setDownloadProgress({
            url: item.url,
            percent: 60,
            loadedMb: (receivedBytes / (1024 * 1024)).toFixed(1),
            totalMb: "?",
          });
        }
      }

      const blobType =
        item.type === "audio" ? "audio/mpeg" : item.type === "image" ? "image/jpeg" : "video/mp4";
      const blob = new Blob(chunks as any, { type: blobType });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      // Fallback directly to browser native download if stream reader fails
      const link = document.createElement("a");
      link.href = streamUrl;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => {
        setDownloadingUrl(null);
        setDownloadProgress(null);
      }, 1200);
    }
  };

  // Find primary video / audio for in-place player
  const primaryVideo = downloadData?.downloads?.find((d) => d.type === "video");
  const primaryAudio = downloadData?.downloads?.find((d) => d.type === "audio");
  const isAudioContent = !primaryVideo && Boolean(primaryAudio);

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-4 sm:py-7 space-y-6">
      {/* Back Link */}
      <CleanLink
        href="/"
        className="gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md p-1 inline-flex items-center"
      >
        <ArrowLeft className="w-4 h-4" /> {t.tools.backHome}
      </CleanLink>

      {/* Header Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Download className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
          <span>{t.tools.downloader.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {t.tools.downloader.desc}
        </p>
      </div>

      {/* Input Box Card */}
      <div className="rounded-2xl bg-[#11151D] border border-white/[0.1] p-3.5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
        <BorderBeam size={280} duration={11} colorFrom="#F59E0B" colorTo="#FEF08A" />
        <form onSubmit={handleFetch} className="space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl bg-[#161B26] border border-white/10 focus-within:border-amber-500/60 transition-all p-1.5 gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <input
                type="url"
                placeholder={t.tools.downloader.placeholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 outline-none font-sans"
                aria-label="URL tautan media"
              />

              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  aria-label="Clear URL"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-end">
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-slate-200 font-medium transition-colors border border-white/10 active:scale-95"
                title={t.tools.downloader.pasteBtn}
              >
                <Clipboard className="w-3.5 h-3.5 text-amber-400" /> {t.tools.downloader.pasteBtn}
              </button>

              <ShimmerButton
                type="submit"
                disabled={isLoading}
                className="h-9 px-4 text-xs font-bold shrink-0"
              >
                {isLoading ? t.tools.downloader.fetching : t.tools.downloader.fetchBtn}
              </ShimmerButton>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-rose-500/[0.08] border border-rose-500/25 p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs font-bold text-rose-300">Gagal Mengambil Media Pihak Ketiga</p>
                  <p className="text-[11px] font-mono text-rose-200/90 leading-relaxed">{errorMessage}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-500/20 text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-slate-300">Tips & Solusi:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-0.5 text-[11px]">
                  <li>Pastikan postingan media bersifat <strong>publik</strong> (bukan akun privat).</li>
                  <li>Jika memakai browser, coba salin tautan langsung dari aplikasi (tombol Share → Copy Link).</li>
                  <li>Jika server pihak ketiga sedang dibatasi laju request (rate limit), tunggu sejenak lalu klik Coba Lagi.</li>
                </ul>
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleFetch(undefined, url)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-slate-950 text-[11px] font-bold flex items-center gap-1.5 transition-all border border-rose-500/30"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    <Copy className="w-3 h-3 text-amber-400" />
                    Tempel Link Baru
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Supported Platforms Chips */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] sm:text-xs font-mono text-slate-400 block">{t.tools.downloader.supportedLabel}</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
            {SUPPORTED_PLATFORMS.map((p) => (
              <span
                key={p.name}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/[0.04] text-slate-300 border border-white/10 transition-colors ${p.color}`}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Result Card with In-Place Media Player Preview */}
      {downloadData && (
        <div className="rounded-2xl bg-[#11151D] border border-white/[0.08] p-4 sm:p-6 flex flex-col md:flex-row gap-5 items-stretch md:items-start shadow-2xl">
          {/* Media Player / In-Place Preview Box */}
          <div className="relative w-full md:w-56 lg:w-64 aspect-video sm:aspect-[9/12] md:aspect-[9/14] md:h-64 rounded-2xl overflow-hidden bg-[#07090D] border border-white/15 shrink-0 shadow-2xl flex flex-col items-center justify-center group">
            {isPlayingVideo && activeVideoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  src={`/api/download/stream?url=${encodeURIComponent(activeVideoUrl)}&inline=1`}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain max-h-full"
                />
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(false)}
                  className="absolute top-2.5 right-2.5 z-20 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-[11px] font-mono text-slate-200 border border-white/20 transition-all flex items-center gap-1 shadow-md"
                  title={t.tools.downloader.closePreview}
                >
                  <X className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.tools.downloader.closePreview}</span>
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Poster / Thumbnail image with no-referrer policy & error handling */}
                {downloadData.thumbnail && !thumbError ? (
                  <img
                    src={downloadData.thumbnail}
                    alt={downloadData.title}
                    referrerPolicy="no-referrer"
                    onError={() => setThumbError(true)}
                    className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#141A24] to-[#0A0D13] text-center">
                    <Video className="w-10 h-10 text-amber-400/60 mb-2" />
                    <span className="text-xs font-mono text-slate-300 font-medium">
                      {downloadData.platformName} Media
                    </span>
                  </div>
                )}

                {/* Platform Badge on Top-Left */}
                <span className="absolute top-2.5 left-2.5 z-10 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#080A0E]/85 text-amber-400 border border-amber-500/30 backdrop-blur-md">
                  {downloadData.platformName}
                </span>

                {/* In-Place Play Video Button Overlay */}
                {primaryVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVideoUrl(primaryVideo.url);
                      setIsPlayingVideo(true);
                    }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 hover:bg-black/25 transition-all group/btn"
                    title={t.tools.downloader.watchVideo}
                    aria-label={t.tools.downloader.watchVideo}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/40 group-hover/btn:scale-110 transition-transform group-active/btn:scale-95 pl-1">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950" />
                    </div>
                    <span className="mt-2 px-3 py-1 rounded-full bg-black/80 text-[11px] font-mono font-bold text-white border border-white/15 backdrop-blur-md group-hover/btn:text-amber-400 transition-colors">
                      {t.tools.downloader.watchVideo}
                    </span>
                  </button>
                )}

                {/* Audio Waveform / Player for Spotify/SoundCloud */}
                {isAudioContent && primaryAudio && (
                  <div className="absolute inset-x-2 bottom-2 z-10 p-2 rounded-xl bg-black/85 border border-white/15 backdrop-blur-md">
                    <audio
                      src={`/api/download/stream?url=${encodeURIComponent(primaryAudio.url)}&inline=1`}
                      controls
                      className="w-full h-8"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details & Distinct Download Buttons */}
          <div className="space-y-3 flex-1 w-full text-left min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {t.tools.downloader.readyBadge}
                </span>
                {downloadData.duration && (
                  <span className="text-[11px] sm:text-xs font-mono text-slate-400">{t.tools.downloader.durationLabel} {downloadData.duration}</span>
                )}
              </div>

              <h3 className="font-bold text-white text-base sm:text-lg leading-snug line-clamp-2">
                {downloadData.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{t.tools.downloader.creatorLabel} {downloadData.author}</p>
            </div>

            {/* List of Available Downloads */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 block">{t.tools.downloader.formatsLabel}</span>
                {primaryVideo && (
                  <span className="text-[10px] font-mono text-amber-400/80">
                    {t.tools.downloader.previewReady}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {downloadData.downloads.map((item, idx) => {
                  const isVideo = item.type === "video";
                  const isAudio = item.type === "audio";
                  const Icon = isVideo ? Video : isAudio ? Music : ImageIcon;
                  const isDownloaded = downloadedUrls.has(item.url);

                  // Clean display label based on item type and format
                  const displayQuality = isAudio
                    ? "MP3 Audio"
                    : item.quality.replace(/\s*\(.*?\)/g, "").trim() || (isVideo ? "Video" : "Photo");

                  const isCurrentDownloading = downloadingUrl === item.url;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all group ${
                        isDownloaded
                          ? "bg-[#0E1A17] border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                          : "bg-[#161B26] hover:bg-[#1C2332] border-white/10 hover:border-amber-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(item)}
                          disabled={isCurrentDownloading}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left focus:outline-none"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                              isDownloaded
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : isCurrentDownloading
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                            }`}
                          >
                            {isDownloaded ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : isCurrentDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                              <span className="whitespace-nowrap">{displayQuality}</span>
                              <span
                                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  isDownloaded
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-white/[0.08] text-slate-200"
                                }`}
                              >
                                {item.format}
                              </span>
                            </div>
                            {item.size && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.size}</div>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Download File Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(item)}
                            disabled={isCurrentDownloading}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isDownloaded
                                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30 scale-105"
                                : isCurrentDownloading
                                ? "bg-amber-500 text-slate-950 font-bold"
                                : "bg-white/[0.05] hover:bg-amber-500 hover:text-[#080A0E] text-slate-200"
                            }`}
                            title={isDownloaded ? "Berhasil Diunduh" : "Download"}
                            aria-label={isDownloaded ? "Berhasil Diunduh" : "Download"}
                          >
                            {isDownloaded ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : isCurrentDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Live Stream Byte Download Progress Bar */}
                      {isCurrentDownloading && downloadProgress && downloadProgress.url === item.url && (
                        <div className="w-full mt-2.5 pt-2 border-t border-white/[0.06] animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-1">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                              Mengunduh stream...
                            </span>
                            <span>
                              {downloadProgress.loadedMb} MB{" "}
                              {downloadProgress.totalMb !== "?" ? `/ ${downloadProgress.totalMb} MB` : ""}{" "}
                              ({downloadProgress.percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150 rounded-full"
                              style={{ width: `${downloadProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local Download History Section (Client-Side Storage) */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-[#11151D] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                {t.tools.downloader.historyTitle}
              </h3>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-xs font-mono text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t.tools.downloader.clearHistory}
            </button>
          </div>

          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#161B26] border border-white/5 hover:border-amber-500/30 transition-all gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-10 h-10 rounded-lg object-cover bg-black shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <p className="text-[11px] font-mono text-slate-300">
                      {item.platformName} • {item.author}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleFetch(undefined, item.url)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-amber-500/20 text-xs font-mono text-slate-200 hover:text-amber-400 border border-white/10 shrink-0 transition-all active:scale-95"
                >
                  {t.tools.downloader.reopenBtn}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Tool Analytics Bar */}
      <ToolAnalyticsBar tool="download" />
    </div>
  );
}
