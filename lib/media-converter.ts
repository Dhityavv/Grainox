"use client";

import JSZip from "jszip";

export interface ZipEntryItem {
  name: string;
  size: number;
  blob?: Blob;
  isDirectory: boolean;
}

/**
 * Convert AudioBuffer to WAV format (which modern audio players recognize as uncompressed lossless audio)
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numSamples = buffer.length;
  const dataByteCount = numSamples * blockAlign;
  const totalByteCount = 44 + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(view, 8, "WAVE");

  // fmt Subchunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data Subchunk
  writeString(view, 36, "data");
  view.setUint32(40, dataByteCount, true);

  // Interleave channels
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Extract audio track from a video file into a WAV/Audio file client-side
 */
export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(15);
  const arrayBuffer = await videoFile.arrayBuffer();

  onProgress?.(40);
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    onProgress?.(80);
    const wavBlob = audioBufferToWav(audioBuffer);
    onProgress?.(100);
    return wavBlob;
  } finally {
    audioCtx.close();
  }
}

/**
 * Bundle multiple files into a ZIP archive
 */
export async function createZipArchive(
  files: { name: string; data: Blob | Uint8Array | string }[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.name, file.data);
  });

  return await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );
}

/**
 * Extract files from a ZIP archive
 */
export async function extractZipArchive(zipFile: File): Promise<ZipEntryItem[]> {
  const arrayBuffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const items: ZipEntryItem[] = [];

  const entries = Object.keys(zip.files);
  for (const filename of entries) {
    const file = zip.files[filename];
    if (file.dir) {
      items.push({
        name: filename,
        size: 0,
        isDirectory: true,
      });
    } else {
      const blob = await file.async("blob");
      items.push({
        name: filename,
        size: blob.size,
        blob,
        isDirectory: false,
      });
    }
  }

  return items;
}
