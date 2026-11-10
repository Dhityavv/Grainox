import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  Loader2,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserCheck,
  Volume2,
  Wand2,
} from 'lucide-react';
import { tKey } from '../i18n';
import {
  AspectMode,
  EnhanceOptions,
  EnhanceProfile,
  Language,
  ModelInfo,
  ResolutionPreset,
  TargetSize,
  UploadRecord,
} from '../types';

interface ControlSidebarProps {
  lang: Language;
  upload: UploadRecord | null;
  targets: Record<ResolutionPreset, TargetSize> | null;
  models: ModelInfo[];
  options: EnhanceOptions;
  isSubmitting: boolean;
  onChangeOptions: (patch: Partial<EnhanceOptions>) => void;
  onSelectProfile: (profile: EnhanceProfile) => void;
  onDownloadModel: (modelId: string) => void;
  onStartEnhance: () => void;
}

const RESOLUTIONS: { id: ResolutionPreset; badge: string; tag: string }[] = [
  { id: '1K', badge: '1K', tag: 'FHD 1080p' },
  { id: '2K', badge: '2K', tag: 'QHD 1440p' },
  { id: '4K', badge: '4K', tag: 'UHD 2160p' },
];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  lang,
  upload,
  targets,
  models,
  options,
  isSubmitting,
  onChangeOptions,
  onSelectProfile,
  onDownloadModel,
  onStartEnhance,
}) => {
  const t = tKey(lang);

  const resDesc = (res: ResolutionPreset) =>
    res === '1K' ? t.res1kDesc : res === '2K' ? t.res2kDesc : t.res4kDesc;

  const isVideo = upload?.media_type === 'video';

  return (
    <aside className="flex flex-col gap-5 rounded-2xl border border-zinc-800/80 bg-[#0e1118] p-5 shadow-2xl">
      {/* 1. Target Output Resolution (1K / 2K / 4K) */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            {t.outputResolution}
          </h2>
          {targets && (
            <span className="font-mono text-xs text-indigo-300">
              {targets[options.resolution].width} × {targets[options.resolution].height} px
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {RESOLUTIONS.map((res) => {
            const active = options.resolution === res.id;
            const dim = targets?.[res.id];
            return (
              <button
                key={res.id}
                type="button"
                onClick={() => onChangeOptions({ resolution: res.id })}
                className={`group relative flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? 'border-indigo-500 bg-indigo-500/15 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                    : 'border-zinc-800 bg-[#121620] hover:border-zinc-700 hover:bg-[#161b28]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`text-lg font-bold tracking-tight ${
                      active ? 'text-white' : 'text-zinc-200'
                    }`}
                  >
                    {res.badge}
                  </span>
                  {res.id === '4K' && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 border border-amber-400/20">
                      UHD
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[11px] font-medium text-zinc-400">{res.tag}</span>
                {dim && (
                  <span className="mt-1.5 font-mono text-[10px] text-indigo-300/90">
                    {dim.width}×{dim.height}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">{resDesc(options.resolution)}</p>
      </div>

      {/* 2. Aspect Ratio Mode */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {t.aspectMode}
        </label>
        <select
          value={options.aspect_mode}
          onChange={(e) => onChangeOptions({ aspect_mode: e.target.value as AspectMode })}
          className="w-full rounded-xl border border-zinc-800 bg-[#121620] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition"
        >
          <option value="preserve">{t.aspectPreserve}</option>
          <option value="16:9-crop">{t.aspect169Crop}</option>
          <option value="16:9-pad">{t.aspect169Pad}</option>
          <option value="9:16-crop">{t.aspect916Crop}</option>
        </select>
      </div>

      {/* 3. AI Model / Upscale Engine */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          {t.aiModel}
        </label>
        <div className="flex flex-col gap-2">
          {models.map((m) => {
            const active = options.model_id === m.id;
            const desc = lang === 'id' ? m.description_id : m.description_en;
            return (
              <div
                key={m.id}
                onClick={() => onChangeOptions({ model_id: m.id })}
                className={`rounded-xl border p-3 transition cursor-pointer ${
                  active
                    ? 'border-indigo-500/80 bg-indigo-500/10'
                    : 'border-zinc-800/90 bg-[#121620] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-100">{m.name}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{desc}</p>
                  </div>

                  {m.downloaded ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.modelReady}
                    </span>
                  ) : m.downloading ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {m.download_progress.toFixed(0)}%
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadModel(m.id);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
                    >
                      <Download className="h-3 w-3" />
                      {t.modelDownload} ({m.size_mb} MB)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Enhancement Profile Presets */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
          {t.profileTitle}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['general', t.profileGeneral],
              ['portrait', t.profilePortrait],
              ['anime', t.profileAnime],
              ['restore', t.profileRestore],
            ] as [EnhanceProfile, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectProfile(id)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                options.profile === id
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                  : 'border-zinc-800 bg-[#121620] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4b. AI Face Restoration & Compression Cleaner Toggles */}
      <div className="flex flex-col gap-2.5">
        <label className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#121620] p-3.5 cursor-pointer hover:border-indigo-500/40 transition">
          <div className="flex items-start gap-2.5">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-zinc-100">{t.faceRestore}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{t.faceRestoreDesc}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={options.face_restore}
            onChange={(e) => onChangeOptions({ face_restore: e.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-500 rounded cursor-pointer"
          />
        </label>

        {!isVideo && (
          <label className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#121620] p-3.5 cursor-pointer hover:border-indigo-500/40 transition">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-zinc-100">{t.deblockClean}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{t.deblockCleanDesc}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.deblock_clean}
              onChange={(e) => onChangeOptions({ deblock_clean: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-cyan-500 rounded cursor-pointer"
            />
          </label>
        )}
      </div>

      {/* 5. Fine-Tuning Sliders */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#121620] p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sliders className="h-3.5 w-3.5 text-indigo-400" />
          {t.fineTune}
        </h3>
        <div className="flex flex-col gap-3">
          <SliderRow
            label={t.naturalFidelity}
            value={options.natural_fidelity}
            onChange={(val) => onChangeOptions({ natural_fidelity: val })}
          />
          <SliderRow
            label={t.sharpness}
            value={options.sharpness}
            onChange={(val) => onChangeOptions({ sharpness: val })}
          />
          <SliderRow
            label={t.denoise}
            value={options.denoise}
            onChange={(val) => onChangeOptions({ denoise: val })}
          />
          <SliderRow
            label={t.hdrContrast}
            value={options.hdr_contrast}
            onChange={(val) => onChangeOptions({ hdr_contrast: val })}
          />
          <SliderRow
            label={t.vibrance}
            value={options.vibrance}
            onChange={(val) => onChangeOptions({ vibrance: val })}
          />
          <SliderRow
            label={t.quality}
            min={50}
            max={100}
            suffix="%"
            value={options.quality}
            onChange={(val) => onChangeOptions({ quality: val })}
          />
        </div>
      </div>

      {/* 6. Format / Video Audio & FPS */}
      {isVideo ? (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-[#121620] p-3.5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-200">
              <Volume2 className="h-4 w-4 text-indigo-400" />
              {t.preserveAudio}
            </span>
            <input
              type="checkbox"
              checked={options.preserve_audio}
              onChange={(e) => onChangeOptions({ preserve_audio: e.target.checked })}
              className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-400">{t.targetFps}</span>
            <select
              value={options.target_fps}
              onChange={(e) =>
                onChangeOptions({ target_fps: e.target.value as 'original' | '30' | '60' })
              }
              className="rounded-lg border border-zinc-700 bg-[#090b10] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
            >
              <option value="original">{t.fpsOriginal}</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-[#121620] px-3.5 py-2.5">
          <span className="text-xs font-medium text-zinc-400">{t.outputFormat}</span>
          <select
            value={options.output_format}
            onChange={(e) => onChangeOptions({ output_format: e.target.value })}
            className="rounded-lg border border-zinc-700 bg-[#090b10] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
          >
            <option value="auto">{t.formatAuto}</option>
            <option value="png">PNG (Lossless)</option>
            <option value="jpg">JPG (High Quality)</option>
            <option value="webp">WebP</option>
          </select>
        </div>
      )}

      {/* 7. Primary Render CTA */}
      <button
        type="button"
        disabled={!upload || isSubmitting}
        onClick={onStartEnhance}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.processingBtn}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t.startUpscale} {options.resolution}
          </>
        )}
      </button>
    </aside>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '',
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="text-zinc-300">{label}</span>
      <span className="font-mono text-indigo-300">
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="studio-slider w-full"
    />
  </div>
);

