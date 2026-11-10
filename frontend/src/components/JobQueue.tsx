import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { tKey } from '../i18n';
import { JobRecord, Language } from '../types';

interface JobQueueProps {
  lang: Language;
  jobs: JobRecord[];
  activeInspectedJobId: string | null;
  onInspectJob: (job: JobRecord) => void;
  onCancelJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const JobQueue: React.FC<JobQueueProps> = ({
  lang,
  jobs,
  activeInspectedJobId,
  onInspectJob,
  onCancelJob,
  onDeleteJob,
}) => {
  const t = tKey(lang);

  const statusBadge = (job: JobRecord) => {
    switch (job.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="h-3 w-3" />
            {t.statusCompleted}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300 border border-indigo-500/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t.statusProcessing}
          </span>
        );
      case 'downloading_model':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t.statusDownloading}
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 border border-zinc-700">
            <Clock className="h-3 w-3" />
            {t.statusQueued}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
            <XCircle className="h-3 w-3" />
            {t.statusCancelled}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/25">
            <AlertCircle className="h-3 w-3" />
            {t.statusFailed}
          </span>
        );
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-[#0e1118] p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">{t.queueTitle}</h2>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-xs text-zinc-400">
          {jobs.length}
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-[#121620]/60 py-8 text-center text-xs text-zinc-500">
          {t.queueEmpty}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => {
            const isActive =
              job.status === 'queued' ||
              job.status === 'downloading_model' ||
              job.status === 'processing';
            const isInspected = activeInspectedJobId === job.job_id;
            return (
              <div
                key={job.job_id}
                className={`rounded-xl border p-4 transition ${
                  isInspected
                    ? 'border-indigo-500/70 bg-indigo-500/10'
                    : 'border-zinc-800/80 bg-[#121620]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-indigo-400">
                      {job.media_type === 'video' ? (
                        <Film className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-100 max-w-[260px]">
                          {job.output_filename || job.original_name}
                        </p>
                        <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300 border border-indigo-400/20">
                          {job.resolution}
                        </span>
                        {statusBadge(job)}
                      </div>
                      <p className="mt-1 font-mono text-xs text-zinc-400">
                        {job.source_width}×{job.source_height} →{' '}
                        <span className="text-zinc-200">
                          {job.output_width ?? job.target_width}×{job.output_height ?? job.target_height}
                        </span>
                        {job.file_size ? ` • ${formatBytes(job.file_size)}` : ''}
                        {job.elapsed_sec ? ` • ${t.elapsedLabel}: ${job.elapsed_sec}s` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.job_id)}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        {t.cancel}
                      </button>
                    )}

                    {job.status === 'completed' && job.download_url && (
                      <>
                        <button
                          type="button"
                          onClick={() => onInspectJob(job)}
                          className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t.inspectResult}
                        </button>
                        <a
                          href={job.download_url}
                          download={job.output_filename || undefined}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-md"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t.download}
                        </a>
                      </>
                    )}

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onDeleteJob(job.job_id)}
                        title={t.remove}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar for active jobs */}
                {isActive && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
                      <span>{job.stage}</span>
                      <span className="font-mono">
                        {job.progress.toFixed(0)}%
                        {job.eta_sec !== null && job.eta_sec > 0
                          ? ` • ${t.etaLabel}: ${job.eta_sec}s`
                          : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${Math.max(4, job.progress)}%` }}
                      />
                    </div>
                  </div>
                )}

                {job.status === 'failed' && job.error && (
                  <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300 border border-rose-500/20">
                    {job.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

