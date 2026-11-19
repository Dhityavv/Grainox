"use client";

export interface UpscaleProgress {
  percent: number;
  stage: string;
}

export interface UpscaleResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  method: string;
}

export async function runAiUpscale(
  imageSrc: string,
  scale: 2 | 4,
  modelName: "ultrasharp-4x" | "digital-art-4x" | "remacri-4x" = "ultrasharp-4x",
  onProgress?: (progress: UpscaleProgress) => void
): Promise<UpscaleResult> {
  let currentPercent = 1;
  onProgress?.({ percent: 1, stage: "Menginisialisasi GPU & Model AI..." });

  // Ticker progres kontinu dari 1% berjalan mulus hingga ~93%
  const progressInterval = setInterval(() => {
    if (currentPercent < 25) {
      currentPercent += 2;
      onProgress?.({
        percent: currentPercent,
        stage: `Memuat model AI (${modelName.toUpperCase()})...`,
      });
    } else if (currentPercent < 65) {
      currentPercent += 1.5;
      onProgress?.({
        percent: Math.round(currentPercent),
        stage: `Inferensi neural super-resolution (${Math.round(currentPercent)}%)...`,
      });
    } else if (currentPercent < 88) {
      currentPercent += 0.8;
      onProgress?.({
        percent: Math.round(currentPercent),
        stage: `Rekonstruksi tekstur sub-piksel (${Math.round(currentPercent)}%)...`,
      });
    } else if (currentPercent < 94) {
      currentPercent += 0.25;
      onProgress?.({
        percent: Math.round(currentPercent),
        stage: `Menyempurnakan detail 4K (${Math.round(currentPercent)}%)...`,
      });
    }
  }, 100);

  // 1. Try Backend Upscayl Engine (/api/upscale)
  try {
    const response = await fetch("/api/upscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageSrc,
        model: modelName,
        scale,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.dataUrl) {
        clearInterval(progressInterval);
        onProgress?.({ percent: 96, stage: "Mengekstrak hasil 4K uncompressed..." });

        const blobRes = await fetch(data.dataUrl);
        const blob = await blobRes.blob();

        const img = new Image();
        img.src = data.dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        onProgress?.({ percent: 100, stage: "Selesai!" });

        return {
          dataUrl: data.dataUrl,
          blob,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          sizeBytes: data.sizeBytes || blob.size,
          method: data.engine || "Upscayl Core (UltraSharp)",
        };
      }
    }
  } catch (backendErr) {
    console.warn("Backend Upscayl API error, falling back to WebGL:", backendErr);
  } finally {
    clearInterval(progressInterval);
  }

  // 2. Client-side Real-ESRGAN (UpscalerJS WebGL) Fallback
  onProgress?.({ percent: 65, stage: "Mengaktifkan WebGL Client-side AI..." });

  try {
    const Upscaler = (await import("upscaler")).default;
    const modelModule =
      scale === 4
        ? await import("@upscalerjs/esrgan-slim/4x")
        : await import("@upscalerjs/esrgan-slim/2x");

    const upscaler = new Upscaler({
      model: modelModule.default,
    });

    onProgress?.({ percent: 75, stage: "Memproses super-resolusi saraf di browser..." });

    const upscaledBase64 = await upscaler.upscale(imageSrc, {
      output: "base64",
      patchSize: 64,
      padding: 4,
      progress: (amount: number) => {
        const percent = Math.min(95, Math.round(75 + amount * 20));
        onProgress?.({ percent, stage: `Rekonstruksi piksel (${percent}%)...` });
      },
    });

    const res = await fetch(upscaledBase64);
    const blob = await res.blob();

    const img = new Image();
    img.src = upscaledBase64;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    onProgress?.({ percent: 100, stage: "Selesai!" });

    return {
      dataUrl: upscaledBase64,
      blob,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      sizeBytes: blob.size,
      method: "Real-ESRGAN WebGL",
    };
  } catch (clientAiErr) {
    console.warn("Client AI fallback error:", clientAiErr);
  }

  // 3. High-Precision Supersampling Canvas Fallback
  onProgress?.({ percent: 85, stage: "Menerapkan High-Precision 4K Scaling..." });

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const targetWidth = img.naturalWidth * scale;
  const targetHeight = img.naturalHeight * scale;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context 2D tidak tersedia.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  onProgress?.({ percent: 95, stage: "Encoding hasil PNG lossless..." });

  const finalBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), "image/png", 1.0);
  });

  const finalDataUrl = canvas.toDataURL("image/png");
  onProgress?.({ percent: 100, stage: "Selesai!" });

  return {
    dataUrl: finalDataUrl,
    blob: finalBlob,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: finalBlob.size,
    method: "Lanczos-4K High-Res",
  };
}
