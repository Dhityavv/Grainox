import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Cpu,
  Film,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  calcTargets,
  cancelJob,
  deleteJob,
  downloadModel,
  fetchHealth,
  fetchJobs,
  fetchModels,
  loadSampleMedia,
  previewFrame,
  startEnhanceJob,
  uploadMediaFile,
} from './api';
import {
  BROWSER_MODELS,
  computeTargetsLocal,
  createBrowserDemo,
  inspectLocalFile,
  previewBrowserVideoFrame,
  runBrowserPhotoEnhance,
  runBrowserVideoEnhance,
} from './browserEngine';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ControlSidebar } from './components/ControlSidebar';
import { JobQueue } from './components/JobQueue';
import { tKey } from './i18n';
import {
  EnhanceOptions,
  EnhanceProfile,
  FramePreviewResult,
  HealthStatus,
  JobRecord,
  Language,
  ModelInfo,
  ResolutionPreset,
  TargetSize,
  UploadRecord,
} from './types';

const PROFILE_DEFAULTS: Record<
  EnhanceProfile,
  Pick<
    EnhanceOptions,
    'sharpness' | 'denoise' | 'hdr_contrast' | 'vibrance' | 'face_restore' | 'natural_fidelity'
  >
> = {
  general: {
    sharpness: 25,
    denoise: 15,
    hdr_contrast: 15,
    vibrance: 10,
    face_restore: true,
    natural_fidelity: 20,
  },
  portrait: {
    sharpness: 18,
    denoise: 20,
    hdr_contrast: 10,
    vibrance: 8,
    face_restore: true,
    natural_fidelity: 25,
  },
  anime: {
    sharpness: 32,
    denoise: 20,
    hdr_contrast: 15,
    vibrance: 18,
    face_restore: false,
    natural_fidelity: 10,
  },
  restore: {
    sharpness: 28,
    denoise: 35,
    hdr_contrast: 18,
    vibrance: 12,
    face_restore: true,
    natural_fidelity: 15,
  },
};

export default function App() {
  const [lang, setLang] = useState<Language>('id');
  const t = tKey(lang);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [engineMode, setEngineMode] = useState<'checking' | 'server' | 'browser'>('checking');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [upload, setUpload] = useState<UploadRecord | null>(null);
  const [targets, setTargets] = useState<Record<ResolutionPreset, TargetSize> | null>(null);

  const [options, setOptions] = useState<EnhanceOptions>({
    resolution: '4K',
    aspect_mode: 'preserve',
    model_id: '4x-clear-reality',
    profile: 'general',
    face_restore: true,
    deblock_clean: true,
    natural_fidelity: 20,
    sharpness: 25,
    denoise: 15,
    hdr_contrast: 15,
    vibrance: 10,
    quality: 92,
    output_format: 'auto',
    preserve_audio: true,
    target_fps: 'original',
  });

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [inspectedJob, setInspectedJob] = useState<JobRecord | null>(null);
  const [framePreview, setFramePreview] = useState<FramePreviewResult | null>(null);
  const [previewTime, setPreviewTime] = useState<number>(0.5);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevJobStatusesRef = useRef<Record<string, string>>({});
  const cancelBrowserJobsRef = useRef<Record<string, boolean>>({});

  // Initial load: detect local Python backend or seamlessly switch to Browser Studio Engine (for Vercel/static)
  useEffect(() => {
    fetchHealth()
      .then((h) => {
        setHealth(h);
        setEngineMode('server');
        fetchModels().then(setModels).catch(() => {});
        fetchJobs().then(setJobs).catch(() => {});
      })
      .catch(() => {
        setHealth(null);
        setEngineMode('browser');
        setModels(BROWSER_MODELS);
      });
  }, []);

  // Poll jobs while any job is queued/downloading/processing (server mode only)
  const hasActiveJobs = useMemo(
    () =>
      engineMode === 'server' &&
      jobs.some(
        (j) =>
          j.status === 'queued' ||
          j.status === 'downloading_model' ||
          j.status === 'processing'
      ),
    [jobs, engineMode]
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(async () => {
      try {
        const latest = await fetchJobs();
        setJobs(latest);

        // Auto-inspect newly completed job
        for (const j of latest) {
          const prev = prevJobStatusesRef.current[j.job_id];
          if (prev && prev !== 'completed' && j.status === 'completed') {
            setInspectedJob(j);
            setFramePreview(null);
          }
          prevJobStatusesRef.current[j.job_id] = j.status;
        }
      } catch {
        // ignore transient poll error
      }
    }, 700);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  // Keep status tracker synced on jobs change
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const j of jobs) map[j.job_id] = j.status;
    prevJobStatusesRef.current = map;
  }, [jobs]);

  // Poll model download status while a model is downloading
  const hasDownloadingModels = useMemo(() => models.some((m) => m.downloading), [models]);
  useEffect(() => {
    if (!hasDownloadingModels) return;
    const timer = window.setInterval(() => {
      fetchModels().then(setModels).catch(() => {});
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasDownloadingModels]);

  // Recalculate 1K / 2K / 4K targets when upload or aspect mode changes
  useEffect(() => {
    if (!upload) {
      setTargets(null);
      return;
    }
    if (options.aspect_mode === 'preserve') {
      setTargets(upload.targets);
      return;
    }
    if (engineMode === 'browser') {
      setTargets(computeTargetsLocal(upload.width, upload.height, options.aspect_mode));
      return;
    }
    calcTargets(upload.width, upload.height, options.aspect_mode)
      .then(setTargets)
      .catch(() => setTargets(computeTargetsLocal(upload.width, upload.height, options.aspect_mode)));
  }, [upload, options.aspect_mode, engineMode]);

  const handleGoHome = useCallback(() => {
    setUpload(null);
    setTargets(null);
    setInspectedJob(null);
    setFramePreview(null);
    setErrorMsg(null);
  }, []);

  const applyLoadedMedia = useCallback((rec: UploadRecord) => {
    setUpload(rec);
    setTargets(rec.targets);
    setInspectedJob(null);
    setFramePreview(null);
    setPreviewTime(rec.duration ? Math.min(0.5, rec.duration / 2) : 0);
    setOptions((prev) => ({
      ...prev,
      model_id: rec.media_type === 'video' ? 'realesr-general-x4v3' : '4x-clear-reality',
      face_restore: rec.media_type === 'image',
      deblock_clean: rec.media_type === 'image',
    }));
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setErrorMsg(null);
    setUploading(true);
    try {
      const rec =
        engineMode === 'browser' ? await inspectLocalFile(file) : await uploadMediaFile(file);
      applyLoadedMedia(rec);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [applyLoadedMedia, engineMode]);

  const handleLoadSample = async (kind: 'photo' | 'video') => {
    setErrorMsg(null);
    setUploading(true);
    try {
      const rec =
        engineMode === 'browser' ? await createBrowserDemo(kind) : await loadSampleMedia(kind);
      applyLoadedMedia(rec);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load sample');
    } finally {
      setUploading(false);
    }
  };

  // Global drag-and-drop anywhere on the website (both empty state and active studio)
  const dragCounterRef = useRef<number>(0);
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer?.types?.includes('Files'));

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleFileSelected(file);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFileSelected]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleChangeOptions = (patch: Partial<EnhanceOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectProfile = (profile: EnhanceProfile) => {
    const preset = PROFILE_DEFAULTS[profile];
    setOptions((prev) => ({ ...prev, profile, ...preset }));
  };

  const handleDownloadModel = async (modelId: string) => {
    setErrorMsg(null);
    try {
      await downloadModel(modelId);
      const updated = await fetchModels();
      setModels(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Model download failed');
    }
  };

  const handleTriggerFramePreview = async () => {
    if (!upload) return;
    setErrorMsg(null);
    setPreviewLoading(true);
    try {
      const res =
        engineMode === 'browser'
          ? await previewBrowserVideoFrame(upload, previewTime, options)
          : await previewFrame(upload.file_id, previewTime, options);
      setFramePreview(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Frame preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStartEnhance = async () => {
    if (!upload) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (engineMode === 'server') {
        const created = await startEnhanceJob(upload.file_id, options);
        setJobs((prev) => [created, ...prev]);
        prevJobStatusesRef.current[created.job_id] = created.status;
        return;
      }

      // Client-side Browser Studio Engine (runs on Vercel/static hosting)
      const target = computeTargetsLocal(upload.width, upload.height, options.aspect_mode)[
        options.resolution
      ];
      const tempId = `web_${Date.now()}`;
      cancelBrowserJobsRef.current[tempId] = false;
      const initialJob: JobRecord = {
        job_id: tempId,
        file_id: upload.file_id,
        original_name: upload.original_name,
        media_type: upload.media_type,
        source_width: upload.width,
        source_height: upload.height,
        target_width: target.width,
        target_height: target.height,
        resolution: options.resolution,
        aspect_mode: options.aspect_mode,
        model_id: options.model_id,
        profile: options.profile,
        status: 'processing',
        progress: 5,
        stage: 'Processing in browser...',
        frames_done: 0,
        frames_total: 1,
        eta_sec: null,
        created_at: Date.now() / 1000,
        elapsed_sec: null,
        output_filename: null,
        output_url: null,
        download_url: null,
        before_url: upload.url,
        file_size: null,
        error: null,
      };
      setJobs((prev) => [initialJob, ...prev]);
      setSubmitting(false);

      const onProg = (pct: number, stage: string) => {
        setJobs((prev) =>
          prev.map((j) => (j.job_id === tempId ? { ...j, progress: pct, stage } : j))
        );
      };

      try {
        const completed =
          upload.media_type === 'image'
            ? await runBrowserPhotoEnhance(upload, options, onProg)
            : await runBrowserVideoEnhance(
                upload,
                options,
                onProg,
                () => Boolean(cancelBrowserJobsRef.current[tempId])
              );
        const finalJob: JobRecord = { ...completed, job_id: tempId };
        setJobs((prev) => prev.map((j) => (j.job_id === tempId ? finalJob : j)));
        setInspectedJob(finalJob);
        setFramePreview(null);
      } catch (err: unknown) {
        const cancelled = Boolean(cancelBrowserJobsRef.current[tempId]);
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === tempId
              ? {
                  ...j,
                  status: cancelled ? 'cancelled' : 'failed',
                  stage: cancelled ? 'Cancelled' : 'Failed',
                  error: cancelled ? null : err instanceof Error ? err.message : 'Enhance failed',
                }
              : j
          )
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start render');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (engineMode === 'browser') {
      cancelBrowserJobsRef.current[jobId] = true;
      return;
    }
    try {
      const updated = await cancelJob(jobId);
      setJobs((prev) => prev.map((j) => (j.job_id === jobId ? updated : j)));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (engineMode === 'browser') {
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      if (inspectedJob?.job_id === jobId) setInspectedJob(null);
      return;
    }
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      if (inspectedJob?.job_id === jobId) {
        setInspectedJob(null);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const activeTarget = targets?.[options.resolution];

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 flex flex-col">
      {/* Global Full-Screen Drag & Drop Overlay when media is already loaded */}
      {isDragging && upload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 pointer-events-none">
          <div className="w-full max-w-xl rounded-3xl border-2 border-dashed border-indigo-400 bg-[#0e1118]/95 p-10 text-center shadow-[0_0_60px_rgba(99,102,241,0.4)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
              <UploadCloud className="h-8 w-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-white">{t.dropOverlayTitle}</h2>
            <p className="mt-2 text-sm text-zinc-300">{t.dropOverlaySub}</p>
          </div>
        </div>
      )}

      {/* Hidden global file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.mkv,.mov,.webm,.avi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelected(f);
          e.target.value = '';
        }}
      />

      {/* Top Studio Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#090b10]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <button
            type="button"
            onClick={handleGoHome}
            title={lang === 'id' ? 'Kembali ke menu awal' : 'Back to home'}
            className="flex items-center gap-3 text-left rounded-xl p-1 -ml-1 hover:bg-white/5 transition cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] group-hover:scale-105 transition">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Archyl AI
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                  1K • 2K • 4K
                </span>
              </h1>
              <p className="text-xs text-zinc-400">{t.appSubtitle}</p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hardware / Engine status */}
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#121620] px-3 py-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  engineMode === 'server' && health
                    ? health.gpu_accelerated
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400'
                    : engineMode === 'browser'
                      ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                      : 'bg-zinc-500 animate-pulse'
                }`}
              />
              <span className="font-medium text-zinc-300">
                {engineMode === 'server' && health
                  ? health.gpu_accelerated
                    ? t.gpuReady
                    : t.cpuMode
                  : engineMode === 'browser'
                    ? t.browserModeReady
                    : t.backendOffline}
              </span>
              {engineMode === 'server' && health?.ffmpeg_ready && (
                <span className="border-l border-zinc-700 pl-2 font-mono text-[11px] text-cyan-300">
                  {t.ffmpegReady}
                </span>
              )}
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'id' ? 'en' : 'id'))}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#121620] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-indigo-500/50 transition cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              {lang === 'id' ? 'ID' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-5 py-6">
        {errorMsg && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="rounded-lg p-1 text-rose-300 hover:bg-rose-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!upload ? (
          /* Empty State: Hero Drag & Drop Uploader */
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full max-w-3xl rounded-3xl border-2 border-dashed p-10 text-center transition ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.25)]'
                  : 'border-zinc-800 bg-[#0e1118]/90 hover:border-zinc-700'
              }`}
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <UploadCloud className="h-8 w-8" />
                )}
              </div>

              <h2 className="text-xl font-bold text-white">
                {uploading ? t.uploading : t.dropTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">{t.dropSubtitle}</p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4" />
                  {t.chooseFile}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleLoadSample('photo')}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-[#141925] px-4 py-3 text-sm font-medium text-zinc-200 hover:border-indigo-500/50 hover:bg-[#192030] transition cursor-pointer disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  {t.tryDemoPhoto}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleLoadSample('video')}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-[#141925] px-4 py-3 text-sm font-medium text-zinc-200 hover:border-indigo-500/50 hover:bg-[#192030] transition cursor-pointer disabled:opacity-50"
                >
                  <Film className="h-4 w-4 text-violet-400" />
                  {t.tryDemoVideo}
                </button>
              </div>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <FeatureCard
                  icon={<Layers className="h-4 w-4 text-indigo-400" />}
                  title="1K / 2K / 4K Output"
                  desc="1920×1080, 2560×1440, & 3840×2160 UHD + Portrait 9:16."
                />
                <FeatureCard
                  icon={<Cpu className="h-4 w-4 text-cyan-400" />}
                  title="Real-ESRGAN AI + DirectML"
                  desc="Akselerasi GPU lokal untuk foto & video tanpa API key berbayar."
                />
                <FeatureCard
                  icon={<Film className="h-4 w-4 text-emerald-400" />}
                  title="Audio & Detail Terjaga"
                  desc="FFmpeg MP4 encoding dengan split-slider Before/After interaktif."
                />
              </div>
            </div>
          </div>
        ) : (
          /* Active Studio Workspace */
          <>
            {/* Media Context Bar (also acts as quick drag & drop target) */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-[#0e1118] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#121620] px-3 py-1.5 border border-zinc-800">
                  <span className="text-xs text-zinc-400">{t.sourceLabel}:</span>
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {upload.width} × {upload.height}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
                {activeTarget && (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-500/15 px-3 py-1.5 border border-indigo-500/30">
                    <span className="text-xs text-indigo-300">{t.targetLabel}:</span>
                    <span className="font-mono text-xs font-bold text-white">
                      {activeTarget.width} × {activeTarget.height} ({options.resolution})
                    </span>
                  </div>
                )}
                {upload.media_type === 'video' && (
                  <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-800">
                    {upload.has_audio ? t.audioBadge : t.noAudioBadge}
                  </span>
                )}
                <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <UploadCloud className="h-3.5 w-3.5 text-zinc-500" />
                  {t.dragDropHint}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#141925] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-indigo-500/60 transition cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
                  {t.changeMedia}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleLoadSample('photo')}
                  className="rounded-xl border border-zinc-800 bg-[#121620] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Demo Photo
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleLoadSample('video')}
                  className="rounded-xl border border-zinc-800 bg-[#121620] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Demo Video
                </button>
              </div>
            </div>

            {/* 2-Column Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
              <div className="flex flex-col gap-5 min-w-0">
                <ComparisonViewer
                  lang={lang}
                  upload={upload}
                  inspectedJob={inspectedJob}
                  framePreview={framePreview}
                  previewTime={previewTime}
                  previewLoading={previewLoading}
                  onChangePreviewTime={setPreviewTime}
                  onTriggerFramePreview={handleTriggerFramePreview}
                  onClearFramePreview={() => setFramePreview(null)}
                  onClearInspectedJob={() => setInspectedJob(null)}
                />

                <JobQueue
                  lang={lang}
                  jobs={jobs}
                  activeInspectedJobId={inspectedJob?.job_id ?? null}
                  onInspectJob={(job) => {
                    setFramePreview(null);
                    setInspectedJob(job);
                  }}
                  onCancelJob={handleCancelJob}
                  onDeleteJob={handleDeleteJob}
                />
              </div>

              <ControlSidebar
                lang={lang}
                upload={upload}
                targets={targets}
                models={models}
                options={options}
                isSubmitting={submitting}
                onChangeOptions={handleChangeOptions}
                onSelectProfile={handleSelectProfile}
                onDownloadModel={handleDownloadModel}
                onStartEnhance={handleStartEnhance}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
  icon,
  title,
  desc,
}) => (
  <div className="rounded-2xl border border-zinc-800/80 bg-[#121620]/90 p-4">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-100">
      {icon}
      {title}
    </div>
    <p className="text-xs leading-relaxed text-zinc-400">{desc}</p>
  </div>
);

