"use client";

export interface ImageCompressionOptions {
  quality: number; // 0.1 to 1.0 (default: 0.75)
  maxWidth?: number; // optional max width (e.g. 1920)
  maxHeight?: number; // optional max height (e.g. 1920)
  format?: "image/jpeg" | "image/webp" | "image/png"; // default: auto or webp
  scaleRatio?: number; // 0.25 to 1.0 (default: 1.0)
}

export interface CompressedImageResult {
  originalFile: File;
  originalSize: number;
  compressedBlob: Blob;
  compressedSize: number;
  savingsPercent: number;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Loads a File into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Gagal membaca file gambar: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Compress an image file on the client using HTML5 Canvas & WebP/JPEG encoding.
 */
export async function compressImage(
  file: File,
  options: Partial<ImageCompressionOptions> = {}
): Promise<CompressedImageResult> {
  const quality = options.quality ?? 0.75;
  const scaleRatio = options.scaleRatio ?? 1.0;
  
  // Default target format: if PNG with no transparency, WebP or JPEG saves 80%+ size
  let targetFormat = options.format;
  if (!targetFormat) {
    if (file.type === "image/png") {
      targetFormat = "image/webp"; // WebP preserves quality with 80% smaller size than PNG
    } else if (file.type === "image/webp") {
      targetFormat = "image/webp";
    } else {
      targetFormat = "image/jpeg";
    }
  }

  const img = await loadImage(file);
  let origW = img.naturalWidth || img.width;
  let origH = img.naturalHeight || img.height;

  let targetW = Math.round(origW * scaleRatio);
  let targetH = Math.round(origH * scaleRatio);

  if (options.maxWidth && targetW > options.maxWidth) {
    const ratio = options.maxWidth / targetW;
    targetW = options.maxWidth;
    targetH = Math.round(targetH * ratio);
  }

  if (options.maxHeight && targetH > options.maxHeight) {
    const ratio = options.maxHeight / targetH;
    targetH = options.maxHeight;
    targetW = Math.round(targetW * ratio);
  }

  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: targetFormat !== "image/jpeg" });
  if (!ctx) throw new Error("Gagal menginisialisasi kanvas");

  // Fill white background for JPEG to avoid black transparent backgrounds
  if (targetFormat === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const compressedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kompresi gambar gagal"))),
      targetFormat,
      quality
    );
  });

  const dataUrl = canvas.toDataURL(targetFormat, quality);
  const originalSize = file.size;
  const compressedSize = compressedBlob.size;
  const savingsPercent = Math.max(
    0,
    Math.round(((originalSize - compressedSize) / originalSize) * 100)
  );

  return {
    originalFile: file,
    originalSize,
    compressedBlob,
    compressedSize,
    savingsPercent,
    dataUrl,
    width: targetW,
    height: targetH,
    format: targetFormat.replace("image/", "").toUpperCase(),
  };
}

/**
 * Batch compress an array of images with progress callback
 */
export async function batchCompressImages(
  files: File[],
  options: Partial<ImageCompressionOptions> = {},
  onProgress?: (current: number, total: number) => void
): Promise<CompressedImageResult[]> {
  const results: CompressedImageResult[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    try {
      const res = await compressImage(files[i], options);
      results.push(res);
    } catch (err) {
      console.error(`Gagal mengompres gambar ${files[i].name}:`, err);
    }
  }
  return results;
}
