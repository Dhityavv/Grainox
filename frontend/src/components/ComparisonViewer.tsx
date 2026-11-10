import React, { useEffect, useRef, useState } from 'react';
import {
  Columns2,
  Eye,
  Film,
  Image as ImageIcon,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import { tKey } from '../i18n';
import { FramePreviewResult, JobRecord, Language, UploadRecord } from '../types';

interface ComparisonViewerProps {
  lang: Language;
  upload: UploadRecord;
  inspectedJob: JobRecord | null;
  framePreview: FramePreviewResult | null;
  previewTime: number;
  previewLoading: boolean;
  onChangePreviewTime: (sec: number) => void;
  onTriggerFramePreview: () => void;
  onClearFramePreview: () => void;
  onClearInspectedJob: () => void;
}

type ViewMode = 'split' | 'side' | 'after';
type ZoomMode = 'fit' | '100' | '200';

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  lang,
  upload,
  inspectedJob,
  framePreview,
  previewTime,
  previewLoading,
  onChangePreviewTime,
  onTriggerFramePreview,
  onClearFramePreview,
  onClearInspectedJob,
}) => {
  const t = tKey(lang);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoom, setZoom] = useState<ZoomMode>('fit');
  const [splitPos, setSplitPos] = useState<number>(50);
  const [dragging, setDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const beforeVideoRef = useRef<HTMLVideoElement | null>(null);
  const afterVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(upload.duration || 0);

  const isComparingImage =
    Boolean(framePreview) ||
    Boolean(inspectedJob && inspectedJob.status === 'completed' && inspectedJob.media_type === 'image');

  const isComparingVideo =
    !framePreview &&
    Boolean(inspectedJob && inspectedJob.status === 'completed' && inspectedJob.media_type === 'video');

  const beforeImgUrl = framePreview
    ? framePreview.orig_url
    : inspectedJob?.before_url || upload.url;
  const afterImgUrl = framePreview
    ? framePreview.enhanced_url
    : inspectedJob?.output_url || '';

  const afterBadge = framePreview
    ? `${framePreview.width} × ${framePreview.height}`
    : inspectedJob
      ? `${inspectedJob.resolution} (${inspectedJob.output_width ?? inspectedJob.target_width} × ${inspectedJob.output_height ?? inspectedJob.target_height})`
      : '';

  useEffect(() => {
    setVideoPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(upload.duration || 0);
  }, [upload.file_id, inspectedJob?.job_id]);

  const updateSplitFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.max(2, Math.min(98, pct)));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateSplitFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const toggleSyncedVideos = () => {
    const bv = beforeVideoRef.current;
    const av = afterVideoRef.current;
    if (!av) return;
    if (videoPlaying) {
      av.pause();
      bv?.pause();
      setVideoPlaying(false);
    } else {
      if (bv && Math.abs(bv.currentTime - av.currentTime) > 0.08) {
        bv.currentTime = av.currentTime;
      }
      av.play().catch(() => {});
      bv?.play().catch(() => {});
      setVideoPlaying(true);
    }
  };

  const seekSyncedVideos = (timeSec: number) => {
    setVideoCurrentTime(timeSec);
    if (afterVideoRef.current) afterVideoRef.current.currentTime = timeSec;
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = timeSec;
  };

  const zoomClass =
    zoom === 'fit'
      ? 'max-h-[540px] w-full object-contain'
      : zoom === '100'
        ? 'w-full h-auto'
        : 'w-[200%] max-w-none h-auto';

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800/80 bg-[#0e1118] shadow-2xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-[#121620] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            {upload.media_type === 'video' ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{upload.original_name}</p>
            <p className="font-mono text-xs text-zinc-400">
              {upload.width} × {upload.height} px
              {upload.media_type === 'video' && upload.fps ? ` • ${upload.fps} fps` : ''}
              {upload.media_type === 'video' && upload.duration ? ` • ${upload.duration}s` : ''}
            </p>
          </div>
        </div>

        {/* Comparison controls when result or frame preview is active */}
        {(isComparingImage || isComparingVideo) && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-[#090b10] p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === 'split'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t.splitView}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === 'side'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                {t.sideBySide}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('after')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === 'after'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                {t.enhancedOnly}
              </button>
            </div>

            {isComparingImage && (
              <div className="flex items-center rounded-lg bg-[#090b10] p-1 border border-zinc-800">
                <ZoomIn className="ml-1.5 mr-1 h-3.5 w-3.5 text-zinc-500" />
                {(['fit', '100', '200'] as ZoomMode[]).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`rounded-md px-2 py-1 text-xs font-mono transition ${
                      zoom === z
                        ? 'bg-zinc-800 text-indigo-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {z === 'fit' ? t.zoomFit : `${z}%`}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={framePreview ? onClearFramePreview : onClearInspectedJob}
              title={t.clearPreview}
              className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-800/70 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Stage */}
      <div className="relative flex min-h-[380px] max-h-[580px] items-center justify-center overflow-auto checkerboard-bg p-3">
        {/* Case 1: Image or Video-Frame Comparison */}
        {isComparingImage && (
          <>
            {viewMode === 'split' && (
              <div
                ref={containerRef}
                onPointerDown={(e) => {
                  setDragging(true);
                  updateSplitFromClientX(e.clientX);
                }}
                className="relative inline-block max-w-full select-none overflow-hidden rounded-xl border border-zinc-800/90 shadow-2xl cursor-ew-resize"
              >
                <img
                  src={afterImgUrl}
                  alt="Enhanced"
                  draggable={false}
                  className={`block select-none ${zoomClass}`}
                />
                {/* Before image + left-clipped badge */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                >
                  <img
                    src={beforeImgUrl}
                    alt="Original"
                    draggable={false}
                    className={`block select-none ${zoomClass}`}
                  />
                  <span className="absolute left-2.5 top-2.5 max-w-[44%] truncate rounded-md bg-black/75 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-wide text-zinc-200 backdrop-blur-md border border-white/10">
                    {t.beforeLabel}
                  </span>
                </div>

                {/* Right-clipped After badge (never overlaps Before badge on narrow portrait photos) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                >
                  <span className="absolute right-2.5 top-2.5 max-w-[50%] truncate rounded-md bg-indigo-600/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-wide text-white backdrop-blur-md border border-indigo-300/30">
                    {afterBadge || t.afterLabel}
                  </span>
                </div>

                {/* Split Line & Handle */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                  style={{ left: `${splitPos}%` }}
                >
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'side' && (
              <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black/40">
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 border border-white/10">
                    {t.beforeLabel}
                  </span>
                  <img src={beforeImgUrl} alt="Original" className="max-h-[500px] w-full object-contain" />
                </div>
                <div className="relative overflow-hidden rounded-xl border border-indigo-500/40 bg-black/40">
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-indigo-600/90 px-2.5 py-1 text-[11px] font-semibold text-white border border-indigo-300/30">
                    {t.afterLabel} • {afterBadge}
                  </span>
                  <img src={afterImgUrl} alt="Enhanced" className="max-h-[500px] w-full object-contain" />
                </div>
              </div>
            )}

            {viewMode === 'after' && (
              <div className="relative inline-block max-w-full overflow-hidden rounded-xl border border-indigo-500/40 shadow-2xl">
                <span className="absolute right-3 top-3 z-10 rounded-md bg-indigo-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {t.afterLabel} • {afterBadge}
                </span>
                <img src={afterImgUrl} alt="Enhanced" className={`block ${zoomClass}`} />
              </div>
            )}
          </>
        )}

        {/* Case 2: Completed Video Synced Comparison */}
        {isComparingVideo && inspectedJob?.output_url && (
          <div className="w-full flex flex-col gap-3">
            {viewMode === 'split' && (
              <div
                ref={containerRef}
                onPointerDown={(e) => {
                  setDragging(true);
                  updateSplitFromClientX(e.clientX);
                }}
                className="relative mx-auto w-full max-w-4xl select-none overflow-hidden rounded-xl border border-zinc-800 bg-black cursor-ew-resize"
              >
                <video
                  ref={afterVideoRef}
                  src={inspectedJob.output_url}
                  playsInline
                  loop
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => {
                    setVideoCurrentTime(e.currentTarget.currentTime);
                    if (
                      beforeVideoRef.current &&
                      Math.abs(beforeVideoRef.current.currentTime - e.currentTarget.currentTime) > 0.15
                    ) {
                      beforeVideoRef.current.currentTime = e.currentTarget.currentTime;
                    }
                  }}
                  onEnded={() => setVideoPlaying(false)}
                  className="block max-h-[450px] w-full object-contain"
                />
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                >
                  <video
                    ref={beforeVideoRef}
                    src={inspectedJob.before_url}
                    muted
                    playsInline
                    loop
                    className="block max-h-[450px] w-full object-contain"
                  />
                  <span className="absolute left-2.5 top-2.5 max-w-[44%] truncate rounded-md bg-black/75 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-zinc-200 border border-white/10">
                    {t.beforeLabel}
                  </span>
                </div>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                >
                  <span className="absolute right-2.5 top-2.5 max-w-[50%] truncate rounded-md bg-indigo-600/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white border border-indigo-300/30">
                    {afterBadge || t.afterLabel}
                  </span>
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                  style={{ left: `${splitPos}%` }}
                >
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'side' && (
              <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative rounded-xl border border-zinc-800 bg-black overflow-hidden">
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-zinc-200">
                    {t.beforeLabel}
                  </span>
                  <video
                    ref={beforeVideoRef}
                    src={inspectedJob.before_url}
                    muted
                    playsInline
                    loop
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>
                <div className="relative rounded-xl border border-indigo-500/40 bg-black overflow-hidden">
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-indigo-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {t.afterLabel} • {afterBadge}
                  </span>
                  <video
                    ref={afterVideoRef}
                    src={inspectedJob.output_url}
                    playsInline
                    loop
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                    onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>
              </div>
            )}

            {viewMode === 'after' && (
              <div className="mx-auto w-full max-w-4xl relative rounded-xl border border-indigo-500/40 bg-black overflow-hidden">
                <span className="absolute right-3 top-3 z-10 rounded-md bg-indigo-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {t.afterLabel} • {afterBadge}
                </span>
                <video
                  ref={afterVideoRef}
                  src={inspectedJob.output_url}
                  controls
                  playsInline
                  className="max-h-[460px] w-full object-contain"
                />
              </div>
            )}

            {viewMode !== 'after' && (
              <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-xl border border-zinc-800 bg-[#121620] px-4 py-2.5">
                <button
                  type="button"
                  onClick={toggleSyncedVideos}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  {videoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {videoPlaying ? t.syncPause : t.syncPlay}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, videoDuration)}
                  step={0.05}
                  value={videoCurrentTime}
                  onChange={(e) => seekSyncedVideos(Number(e.target.value))}
                  className="studio-slider flex-1"
                />
                <span className="font-mono text-xs text-zinc-400">
                  {videoCurrentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Case 3: Default Raw Uploaded Preview */}
        {!isComparingImage && !isComparingVideo && (
          <div className="w-full flex flex-col items-center">
            {upload.media_type === 'image' ? (
              <img
                src={upload.url}
                alt={upload.original_name}
                className="max-h-[520px] w-auto rounded-xl border border-zinc-800 shadow-2xl object-contain"
              />
            ) : (
              <video
                src={upload.url}
                controls
                playsInline
                className="max-h-[480px] w-full max-w-4xl rounded-xl border border-zinc-800 bg-black shadow-2xl"
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Video Frame Quick-Preview Bar */}
      {upload.media_type === 'video' && !isComparingVideo && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 bg-[#121620] px-4 py-3">
          <div className="flex flex-1 items-center gap-3 min-w-[220px]">
            <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">
              {t.frameTimeLabel}: <span className="font-mono text-zinc-200">{previewTime.toFixed(1)}s</span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0.5, (upload.duration || 1) - 0.05)}
              step={0.1}
              value={previewTime}
              onChange={(e) => onChangePreviewTime(Number(e.target.value))}
              className="studio-slider flex-1 max-w-xs"
            />
          </div>
          <button
            type="button"
            disabled={previewLoading}
            onClick={onTriggerFramePreview}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50 transition cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
            {previewLoading ? t.previewingFrame : t.previewFrameBtn}
          </button>
        </div>
      )}
    </div>
  );
};

