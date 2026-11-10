export type Language = 'id' | 'en';
export type ResolutionPreset = '1K' | '2K' | '4K';
export type AspectMode = 'preserve' | '16:9-crop' | '16:9-pad' | '9:16-crop';
export type EnhanceProfile = 'general' | 'portrait' | 'anime' | 'restore';

export interface TargetSize {
  width: number;
  height: number;
}

export interface UploadRecord {
  file_id: string;
  original_name: string;
  stored_name: string;
  url: string;
  media_type: 'image' | 'video';
  width: number;
  height: number;
  fps?: number;
  frame_count?: number;
  duration?: number;
  has_audio?: boolean;
  has_alpha?: boolean;
  file_size: number;
  targets: Record<ResolutionPreset, TargetSize>;
}

export interface ModelInfo {
  id: string;
  name: string;
  description_id: string;
  description_en: string;
  size_mb: number;
  scale: number;
  is_ai: boolean;
  downloaded: boolean;
  downloading: boolean;
  download_progress: number;
  download_error: string | null;
  active_provider: string;
}

export interface HealthStatus {
  status: string;
  providers: string[];
  gpu_accelerated: boolean;
  ffmpeg_ready: boolean;
}

export interface EnhanceOptions {
  resolution: ResolutionPreset;
  aspect_mode: AspectMode;
  model_id: string;
  profile: EnhanceProfile;
  face_restore: boolean;
  deblock_clean: boolean;
  natural_fidelity: number;
  sharpness: number;
  denoise: number;
  hdr_contrast: number;
  vibrance: number;
  quality: number;
  output_format: string;
  preserve_audio: boolean;
  target_fps: 'original' | '30' | '60';
}

export interface JobRecord {
  job_id: string;
  file_id: string;
  original_name: string;
  media_type: 'image' | 'video';
  source_width: number;
  source_height: number;
  target_width: number;
  target_height: number;
  resolution: ResolutionPreset;
  aspect_mode: AspectMode;
  model_id: string;
  profile: EnhanceProfile;
  status: 'queued' | 'downloading_model' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  frames_done: number;
  frames_total: number;
  eta_sec: number | null;
  created_at: number;
  elapsed_sec: number | null;
  output_filename: string | null;
  output_url: string | null;
  download_url: string | null;
  before_url: string;
  output_width?: number;
  output_height?: number;
  file_size: number | null;
  error: string | null;
}

export interface FramePreviewResult {
  orig_url: string;
  enhanced_url: string;
  width: number;
  height: number;
  orig_width: number;
  orig_height: number;
}

