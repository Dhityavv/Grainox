import {
  AspectMode,
  EnhanceOptions,
  FramePreviewResult,
  HealthStatus,
  JobRecord,
  ModelInfo,
  ResolutionPreset,
  TargetSize,
  UploadRecord,
} from './types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const errData = await resp.json();
      if (errData?.detail) msg = errData.detail;
    } catch {
      // keep status code message
    }
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>('/api/health');
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const data = await requestJson<{ models: ModelInfo[] }>('/api/models');
  return data.models;
}

export function downloadModel(modelId: string): Promise<{ status: string; model_id: string }> {
  return requestJson(`/api/models/${encodeURIComponent(modelId)}/download`, {
    method: 'POST',
  });
}

export async function uploadMediaFile(file: File): Promise<UploadRecord> {
  const form = new FormData();
  form.append('file', file);
  return requestJson<UploadRecord>('/api/upload', {
    method: 'POST',
    body: form,
  });
}

export function loadSampleMedia(kind: 'photo' | 'video'): Promise<UploadRecord> {
  return requestJson<UploadRecord>(`/api/load-sample?kind=${kind}`, {
    method: 'POST',
  });
}

export async function calcTargets(
  width: number,
  height: number,
  aspectMode: AspectMode
): Promise<Record<ResolutionPreset, TargetSize>> {
  const data = await requestJson<{ targets: Record<ResolutionPreset, TargetSize> }>('/api/calc-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ width, height, aspect_mode: aspectMode }),
  });
  return data.targets;
}

export function previewFrame(
  fileId: string,
  timestampSec: number,
  options: EnhanceOptions
): Promise<FramePreviewResult> {
  return requestJson<FramePreviewResult>('/api/preview-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      timestamp_sec: timestampSec,
      ...options,
    }),
  });
}

export function startEnhanceJob(fileId: string, options: EnhanceOptions): Promise<JobRecord> {
  return requestJson<JobRecord>('/api/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      ...options,
    }),
  });
}

export async function fetchJobs(): Promise<JobRecord[]> {
  const data = await requestJson<{ jobs: JobRecord[] }>('/api/jobs');
  return data.jobs;
}

export function cancelJob(jobId: string): Promise<JobRecord> {
  return requestJson<JobRecord>(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
  });
}

export function deleteJob(jobId: string): Promise<{ deleted: string }> {
  return requestJson<{ deleted: string }>(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  });
}

