import {
  AspectMode,
  EnhanceOptions,
  FramePreviewResult,
  JobRecord,
  ModelInfo,
  ResolutionPreset,
  TargetSize,
  UploadRecord,
} from './types';

const RESOLUTION_BOXES: Record<ResolutionPreset, [number, number]> = {
  '1K': [1920, 1080],
  '2K': [2560, 1440],
  '4K': [3840, 2160],
};

function makeEven(val: number): number {
  const n = Math.max(2, Math.round(val));
  return n % 2 === 0 ? n : n + 1;
}

export function computeTargetsLocal(
  srcW: number,
  srcH: number,
  aspectMode: AspectMode
): Record<ResolutionPreset, TargetSize> {
  const calcOne = (preset: ResolutionPreset): TargetSize => {
    const [bw, bh] = RESOLUTION_BOXES[preset];
    if (aspectMode === '16:9-crop' || aspectMode === '16:9-pad') {
      return { width: bw, height: bh };
    }
    if (aspectMode === '9:16-crop') {
      return { width: bh, height: bw };
    }
    const [boxW, boxH] = srcW >= srcH ? [bw, bh] : [bh, bw];
    const scale = Math.min(boxW / srcW, boxH / srcH);
    return {
      width: makeEven(srcW * scale),
      height: makeEven(srcH * scale),
    };
  };

  return {
    '1K': calcOne('1K'),
    '2K': calcOne('2K'),
    '4K': calcOne('4K'),
  };
}

export const BROWSER_MODELS: ModelInfo[] = [
  {
    id: '4x-clear-reality',
    name: 'Archyl ClearStudio Web (1K–4K)',
    description_id:
      'Engine Web Canvas multi-tahap + De-Block + Halo-Free Detail langsung di browser Anda.',
    description_en:
      'Client-side multi-pass browser engine with deblocking and halo-free sharpening.',
    size_mb: 0,
    scale: 4,
    is_ai: false,
    downloaded: true,
    downloading: false,
    download_progress: 100,
    download_error: null,
    active_provider: 'Browser Canvas Engine',
  },
];

export function inspectLocalFile(file: File): Promise<UploadRecord> {
  const url = URL.createObjectURL(file);
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(file.name);

  if (!isVideo) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1280;
        const h = img.naturalHeight || 720;
        resolve({
          file_id: `local_${Date.now()}`,
          original_name: file.name,
          stored_name: file.name,
          url,
          media_type: 'image',
          width: w,
          height: h,
          file_size: file.size,
          targets: computeTargetsLocal(w, h, 'preserve'),
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image file in browser.'));
      img.src = url;
    });
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const duration = Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : 0;
      resolve({
        file_id: `local_${Date.now()}`,
        original_name: file.name,
        stored_name: file.name,
        url,
        media_type: 'video',
        width: w,
        height: h,
        fps: 30,
        duration,
        has_audio: true,
        file_size: file.size,
        targets: computeTargetsLocal(w, h, 'preserve'),
      });
    };
    video.onerror = () => reject(new Error('Format video tidak didukung oleh browser ini.'));
    video.src = url;
  });
}

function drawDemoFrame(ctx: CanvasRenderingContext2D, w: number, h: number, step: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1e295b');
  sky.addColorStop(0.55, '#64446b');
  sky.addColorStop(1, '#e07a5f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 224, 150, 0.92)';
  ctx.beginPath();
  ctx.arc(w * (0.28 + 0.004 * step), h * 0.34, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d2638';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.68);
  ctx.lineTo(w * 0.24, h * 0.45);
  ctx.lineTo(w * 0.5, h * 0.64);
  ctx.lineTo(w * 0.78, h * 0.42);
  ctx.lineTo(w, h * 0.6);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#14151f';
  const bx = w * 0.58;
  const by = h * 0.52;
  ctx.fillRect(bx, by, 68, h - by);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c + step) % 3 === 0 ? '#ffd166' : '#537a9a';
      ctx.fillRect(bx + 10 + c * 14, by + 12 + r * 18, 8, 10);
    }
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ARCHYL AI 4K DEMO', 16, h - 16);
}

export async function createBrowserDemo(kind: 'photo' | 'video'): Promise<UploadRecord> {
  const w = 480;
  const h = 270;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'photo') {
    drawDemoFrame(ctx, w, h, 8);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const url = URL.createObjectURL(blob);
    return {
      file_id: `demo_photo_${Date.now()}`,
      original_name: 'demo_landscape_480x270.png',
      stored_name: 'demo_landscape_480x270.png',
      url,
      media_type: 'image',
      width: w,
      height: h,
      file_size: blob.size,
      targets: computeTargetsLocal(w, h, 'preserve'),
    };
  }

  const stream = canvas.captureStream(24);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  rec.start();
  for (let i = 0; i < 36; i++) {
    drawDemoFrame(ctx, w, h, i);
    await new Promise((r) => setTimeout(r, 42));
  }
  rec.stop();
  const blob = await done;
  const url = URL.createObjectURL(blob);
  return {
    file_id: `demo_video_${Date.now()}`,
    original_name: 'demo_city_clip_480x270.webm',
    stored_name: 'demo_city_clip_480x270.webm',
    url,
    media_type: 'video',
    width: w,
    height: h,
    fps: 24,
    duration: 1.5,
    has_audio: false,
    file_size: blob.size,
    targets: computeTargetsLocal(w, h, 'preserve'),
  };
}

function drawFittedSource(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  aspectMode: AspectMode
): HTMLCanvasElement {
  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;
  let dx = 0;
  let dy = 0;
  let dw = targetW;
  let dh = targetH;

  if (aspectMode === '16:9-crop' || aspectMode === '9:16-crop') {
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;
    if (srcRatio > targetRatio) {
      sw = Math.round(srcH * targetRatio);
      sx = Math.floor((srcW - sw) / 2);
    } else if (srcRatio < targetRatio) {
      sh = Math.round(srcW / targetRatio);
      sy = Math.floor((srcH - sh) / 2);
    }
  } else if (aspectMode === '16:9-pad') {
    const scale = Math.min(targetW / srcW, targetH / srcH);
    dw = Math.round(srcW * scale);
    dh = Math.round(srcH * scale);
    dx = Math.floor((targetW - dw) / 2);
    dy = Math.floor((targetH - dh) / 2);
  }

  // Multi-step progressive 2x scaling for noticeably cleaner upscaling
  let curCanvas = document.createElement('canvas');
  curCanvas.width = sw;
  curCanvas.height = sh;
  const curCtx = curCanvas.getContext('2d')!;
  curCtx.imageSmoothingEnabled = true;
  curCtx.imageSmoothingQuality = 'high';
  curCtx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  let curW = sw;
  let curH = sh;
  while (curW * 2 < dw && curH * 2 < dh) {
    const nextW = curW * 2;
    const nextH = curH * 2;
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = nextW;
    nextCanvas.height = nextH;
    const nextCtx = nextCanvas.getContext('2d')!;
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
    curCanvas = nextCanvas;
    curW = nextW;
    curH = nextH;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const outCtx = outCanvas.getContext('2d')!;
  if (aspectMode === '16:9-pad') {
    outCtx.fillStyle = '#000000';
    outCtx.fillRect(0, 0, targetW, targetH);
  }
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(curCanvas, 0, 0, curW, curH, dx, dy, dw, dh);
  return outCanvas;
}

function applyBrowserEnhancements(canvas: HTMLCanvasElement, options: EnhanceOptions): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Luminance buffer for halo-suppressed sharpening + shadow-safe contrast
  const len = w * h;
  const lum = new Float32Array(len);
  const contrastFactor = 1 + (options.hdr_contrast / 100) * 0.22;
  const vibFactor = (options.vibrance / 100) * 0.38;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    // Shadow-safe contrast (protects dark regions from black crushing)
    const shadowGuard = Math.max(0.2, Math.min(1, (l - 18) / 60));
    if (options.hdr_contrast > 1) {
      const cMix = 1 + (contrastFactor - 1) * shadowGuard;
      r = 128 + (r - 128) * cMix;
      g = 128 + (g - 128) * cMix;
      b = 128 + (b - 128) * cMix;
    }

    // Smart vibrance (boosts muted tones without oversaturating skin)
    if (options.vibrance > 1) {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      const boost = vibFactor * (1 - sat);
      const avg = (r + g + b) / 3;
      r = r + (r - avg) * boost;
      g = g + (g - avg) * boost;
      b = b + (b - avg) * boost;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Halo-suppressed luminance sharpening (fast box neighborhood)
  if (options.sharpness > 1 || options.denoise > 15) {
    const sharpGain = (options.sharpness / 100) * 0.72;
    const smoothMix = options.deblock_clean
      ? Math.min(0.28, (options.denoise / 100) * 0.28 + 0.08)
      : (options.denoise / 100) * 0.22;

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const avgLum =
          (lum[idx - w - 1] +
            lum[idx - w] +
            lum[idx - w + 1] +
            lum[idx - 1] +
            lum[idx] +
            lum[idx + 1] +
            lum[idx + w - 1] +
            lum[idx + w] +
            lum[idx + w + 1]) /
          9;

        const curLum = lum[idx];
        let delta = curLum - avgLum;
        // Edge-preserving smooth on flat noisy pixels, halo-clamped detail on crisp edges
        if (Math.abs(delta) < 6 && smoothMix > 0) {
          delta = -delta * smoothMix;
        } else {
          const clamped = Math.max(-9, Math.min(15, delta));
          const shadowGuard = Math.max(0.2, Math.min(1, (curLum - 20) / 55));
          delta = clamped * sharpGain * shadowGuard;
        }

        const p = idx * 4;
        data[p] = Math.max(0, Math.min(255, data[p] + delta));
        data[p + 1] = Math.max(0, Math.min(255, data[p + 1] + delta));
        data[p + 2] = Math.max(0, Math.min(255, data[p + 2] + delta));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export async function runBrowserPhotoEnhance(
  upload: UploadRecord,
  options: EnhanceOptions,
  onProgress?: (pct: number, stage: string) => void
): Promise<JobRecord> {
  const started = performance.now();
  const target = computeTargetsLocal(upload.width, upload.height, options.aspect_mode)[
    options.resolution
  ];

  onProgress?.(20, 'Scaling canvas...');
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Unable to load image.'));
    el.src = upload.url;
  });

  const canvas = drawFittedSource(
    img,
    upload.width,
    upload.height,
    target.width,
    target.height,
    options.aspect_mode
  );

  onProgress?.(60, 'Enhancing sharpness & color...');
  await new Promise((r) => setTimeout(r, 15));
  applyBrowserEnhancements(canvas, options);

  onProgress?.(90, 'Encoding output...');
  const fmt =
    options.output_format === 'jpg'
      ? 'image/jpeg'
      : options.output_format === 'webp'
        ? 'image/webp'
        : 'image/png';
  const ext = fmt === 'image/jpeg' ? 'jpg' : fmt === 'image/webp' ? 'webp' : 'png';
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), fmt, options.quality / 100)
  );
  const outUrl = URL.createObjectURL(blob);
  const stem = upload.original_name.replace(/\.[^.]+$/, '') || 'archyl_enhanced';
  const outName = `${stem}_${options.resolution}.${ext}`;

  return {
    job_id: `web_${Date.now()}`,
    file_id: upload.file_id,
    original_name: upload.original_name,
    media_type: 'image',
    source_width: upload.width,
    source_height: upload.height,
    target_width: target.width,
    target_height: target.height,
    resolution: options.resolution,
    aspect_mode: options.aspect_mode,
    model_id: options.model_id,
    profile: options.profile,
    status: 'completed',
    progress: 100,
    stage: 'Completed',
    frames_done: 1,
    frames_total: 1,
    eta_sec: 0,
    created_at: Date.now() / 1000,
    elapsed_sec: Number(((performance.now() - started) / 1000).toFixed(2)),
    output_filename: outName,
    output_url: outUrl,
    download_url: outUrl,
    before_url: upload.url,
    output_width: target.width,
    output_height: target.height,
    file_size: blob.size,
    error: null,
  };
}

export async function previewBrowserVideoFrame(
  upload: UploadRecord,
  timestampSec: number,
  options: EnhanceOptions
): Promise<FramePreviewResult> {
  const target = computeTargetsLocal(upload.width, upload.height, options.aspect_mode)[
    options.resolution
  ];

  const video = document.createElement('video');
  video.src = upload.url;
  video.muted = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video frame.'));
  });
  video.currentTime = Math.min(timestampSec, Math.max(0, (video.duration || 1) - 0.05));
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const origCanvas = drawFittedSource(
    video,
    upload.width,
    upload.height,
    target.width,
    target.height,
    options.aspect_mode
  );
  const enhCanvas = drawFittedSource(
    video,
    upload.width,
    upload.height,
    target.width,
    target.height,
    options.aspect_mode
  );
  applyBrowserEnhancements(enhCanvas, options);

  const origBlob = await new Promise<Blob>((r) => origCanvas.toBlob((b) => r(b!), 'image/jpeg', 0.92));
  const enhBlob = await new Promise<Blob>((r) => enhCanvas.toBlob((b) => r(b!), 'image/jpeg', 0.92));

  return {
    orig_url: URL.createObjectURL(origBlob),
    enhanced_url: URL.createObjectURL(enhBlob),
    width: target.width,
    height: target.height,
    orig_width: upload.width,
    orig_height: upload.height,
  };
}

export async function runBrowserVideoEnhance(
  upload: UploadRecord,
  options: EnhanceOptions,
  onProgress: (pct: number, stage: string) => void,
  shouldCancel: () => boolean
): Promise<JobRecord> {
  const started = performance.now();
  const target = computeTargetsLocal(upload.width, upload.height, options.aspect_mode)[
    options.resolution
  ];

  const video = document.createElement('video');
  video.src = upload.url;
  video.playsInline = true;
  video.muted = !options.preserve_audio;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const fps = options.target_fps === '60' ? 60 : options.target_fps === '30' ? 30 : upload.fps || 30;
  const canvasStream = canvas.captureStream(fps);

  // Attach original audio track when browser supports captureStream on video element
  const videoWithCapture = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  if (options.preserve_audio) {
    try {
      const srcStream = videoWithCapture.captureStream?.() || videoWithCapture.mozCaptureStream?.();
      srcStream?.getAudioTracks().forEach((tr) => canvasStream.addTrack(tr));
    } catch {
      // keep video-only stream if cross-origin/unsupported
    }
  }

  const mime = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const bitrate = options.resolution === '4K' ? 24_000_000 : options.resolution === '2K' ? 14_000_000 : 8_000_000;

  const recorder = new MediaRecorder(canvasStream, {
    mimeType: mime,
    videoBitsPerSecond: bitrate,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  const contrastPct = 100 + Math.round((options.hdr_contrast / 100) * 18);
  const satPct = 100 + Math.round((options.vibrance / 100) * 28);
  ctx.filter = `contrast(${contrastPct}%) saturate(${satPct}%)`;

  recorder.start(250);
  video.currentTime = 0;
  await video.play();

  const duration = Math.max(0.2, video.duration || upload.duration || 1);

  await new Promise<void>((resolve, reject) => {
    const drawLoop = () => {
      if (shouldCancel()) {
        video.pause();
        recorder.stop();
        reject(new Error('Job cancelled by user.'));
        return;
      }
      if (video.ended) {
        recorder.stop();
        resolve();
        return;
      }
      const fitted = drawFittedSource(
        video,
        upload.width,
        upload.height,
        target.width,
        target.height,
        options.aspect_mode
      );
      ctx.drawImage(fitted, 0, 0);
      const pct = Math.min(98, (video.currentTime / duration) * 98);
      onProgress(pct, `Rendering ${video.currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`);
      requestAnimationFrame(drawLoop);
    };
    requestAnimationFrame(drawLoop);
  });

  const blob = await recorded;
  const outUrl = URL.createObjectURL(blob);
  const stem = upload.original_name.replace(/\.[^.]+$/, '') || 'archyl_video';
  const outName = `${stem}_${options.resolution}.${ext}`;

  return {
    job_id: `web_${Date.now()}`,
    file_id: upload.file_id,
    original_name: upload.original_name,
    media_type: 'video',
    source_width: upload.width,
    source_height: upload.height,
    target_width: target.width,
    target_height: target.height,
    resolution: options.resolution,
    aspect_mode: options.aspect_mode,
    model_id: options.model_id,
    profile: options.profile,
    status: 'completed',
    progress: 100,
    stage: 'Completed',
    frames_done: 1,
    frames_total: 1,
    eta_sec: 0,
    created_at: Date.now() / 1000,
    elapsed_sec: Number(((performance.now() - started) / 1000).toFixed(2)),
    output_filename: outName,
    output_url: outUrl,
    download_url: outUrl,
    before_url: upload.url,
    output_width: target.width,
    output_height: target.height,
    file_size: blob.size,
    error: null,
  };
}
