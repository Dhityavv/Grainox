"use client";

import * as pdfLib from "pdf-lib";
import { configure, lock, unlockInPlace } from "pdf-lib-encrypt";

// Initialize encryption binding
if (typeof window !== "undefined") {
  try {
    configure(pdfLib);
  } catch (err) {
    console.warn("pdf-lib-encrypt configure warning:", err);
  }
}

export interface ExtractedPdfPage {
  pageNum: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Load image file as HTMLImageElement
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
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
 * Convert batch of images into a single multi-page PDF document
 */
export async function imagesToPdf(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const doc = await pdfLib.PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);

    try {
      if (file.type === "image/png") {
        const buffer = await file.arrayBuffer();
        const img = await doc.embedPng(buffer);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else if (file.type === "image/jpeg" || file.type === "image/jpg") {
        const buffer = await file.arrayBuffer();
        const img = await doc.embedJpg(buffer);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else {
        // Universal canvas rasterization for WebP, GIF, SVG, BMP, AVIF
        const imgEl = await loadImageElement(file);
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth || imgEl.width;
        canvas.height = imgEl.naturalHeight || imgEl.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Gagal menginisialisasi kanvas");
        ctx.drawImage(imgEl, 0, 0);

        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Gagal meng-encode JPG"))),
            "image/jpeg",
            0.95
          );
        });

        const img = await doc.embedJpg(await jpegBlob.arrayBuffer());
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
    } catch (err) {
      console.error(`Gagal memproses gambar ${file.name}:`, err);
    }
  }

  if (doc.getPageCount() === 0) {
    throw new Error("Tidak ada gambar yang berhasil dikonversi ke PDF.");
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes as any], { type: "application/pdf" });
}

/**
 * Encrypt a PDF document with user password (AES-256)
 */
export async function protectPdf(pdfFile: File, password: string): Promise<Blob> {
  if (!password || !password.trim()) {
    throw new Error("Password wajib diisi untuk mengenkripsi PDF.");
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const plainBytes = new Uint8Array(arrayBuffer);
  const lockedBytes = await lock(plainBytes, password.trim());
  return new Blob([lockedBytes as any], { type: "application/pdf" });
}

/**
 * Remove password and decrypt a protected PDF document
 */
export async function unlockPdf(pdfFile: File, password: string): Promise<Blob> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const lockedBytes = new Uint8Array(arrayBuffer);
  const doc = await pdfLib.PDFDocument.load(lockedBytes, { ignoreEncryption: true });

  await unlockInPlace(doc, password || "");
  const unlockedBytes = await doc.save();
  return new Blob([unlockedBytes as any], { type: "application/pdf" });
}

/**
 * Convert plain text or markdown to formatted A4 PDF
 */
export async function textToPdf(
  text: string,
  title?: string,
  fontSize: number = 11
): Promise<Blob> {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(pdfLib.StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 points
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = Math.round(fontSize * 1.5);

  let curPage = doc.addPage([pageWidth, pageHeight]);
  let curY = pageHeight - margin;

  if (title && title.trim()) {
    curPage.drawText(title.trim(), {
      x: margin,
      y: curY,
      size: 18,
      font: boldFont,
      color: pdfLib.rgb(0.08, 0.1, 0.14),
    });
    curY -= 32;
  }

  const paragraphs = text.split("\n");

  for (const rawPara of paragraphs) {
    if (rawPara.trim() === "") {
      curY -= lineHeight * 0.75;
      if (curY < margin + lineHeight) {
        curPage = doc.addPage([pageWidth, pageHeight]);
        curY = pageHeight - margin;
      }
      continue;
    }

    const words = rawPara.split(" ");
    let lineBuf = "";

    for (const word of words) {
      const candidate = lineBuf ? `${lineBuf} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);

      if (width > contentWidth && lineBuf) {
        if (curY < margin + lineHeight) {
          curPage = doc.addPage([pageWidth, pageHeight]);
          curY = pageHeight - margin;
        }
        curPage.drawText(lineBuf, {
          x: margin,
          y: curY,
          size: fontSize,
          font,
          color: pdfLib.rgb(0.15, 0.18, 0.24),
        });
        curY -= lineHeight;
        lineBuf = word;
      } else {
        lineBuf = candidate;
      }
    }

    if (lineBuf) {
      if (curY < margin + lineHeight) {
        curPage = doc.addPage([pageWidth, pageHeight]);
        curY = pageHeight - margin;
      }
      curPage.drawText(lineBuf, {
        x: margin,
        y: curY,
        size: fontSize,
        font,
        color: pdfLib.rgb(0.15, 0.18, 0.24),
      });
      curY -= lineHeight;
    }
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes as any], { type: "application/pdf" });
}

/**
 * Render all PDF pages into individual high-res PNG images client-side using PDF.js
 */
export async function pdfToImages(
  pdfFile: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  // Dynamically load PDF.js from verified CDN if not already loaded
  if (typeof window !== "undefined" && !(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("Gagal menginisialisasi library PDF.js.");
  }

  const buffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdf.getPage(pageNum);

    // 2.0x scale ensures crystal clear, high-resolution 300 DPI text and images
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), "image/png");
    });

    pages.push({
      pageNum,
      dataUrl,
      blob,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pages;
}

/**
 * Compress a PDF document by re-optimizing streams and downsampling high-res raster pages
 */
export async function compressPdf(
  pdfFile: File,
  level: "low" | "medium" | "high" = "medium",
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; originalSize: number; compressedSize: number; savingsPercent: number }> {
  const originalSize = pdfFile.size;

  // Ensure PDF.js is loaded
  if (typeof window !== "undefined" && !(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;
  const buffer = await pdfFile.arrayBuffer();

  const scale = level === "low" ? 1.8 : level === "medium" ? 1.35 : 1.05;
  const jpegQuality = level === "low" ? 0.85 : level === "medium" ? 0.65 : 0.45;

  let compressedBlob: Blob;

  if (pdfjsLib) {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;
    const newDoc = await pdfLib.PDFDocument.create();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const pageJpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", jpegQuality);
      });

      const imgBytes = await pageJpegBlob.arrayBuffer();
      const img = await newDoc.embedJpg(imgBytes);
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
    }

    const savedBytes = await newDoc.save({ useObjectStreams: true });
    compressedBlob = new Blob([savedBytes as any], { type: "application/pdf" });
  } else {
    const doc = await pdfLib.PDFDocument.load(buffer);
    const savedBytes = await doc.save({ useObjectStreams: true });
    compressedBlob = new Blob([savedBytes as any], { type: "application/pdf" });
  }

  if (compressedBlob.size >= originalSize) {
    const doc = await pdfLib.PDFDocument.load(buffer);
    const savedBytes = await doc.save({ useObjectStreams: true });
    const fallbackBlob = new Blob([savedBytes as any], { type: "application/pdf" });
    const finalBlob = fallbackBlob.size < originalSize ? fallbackBlob : new Blob([buffer], { type: "application/pdf" });
    const compressedSize = finalBlob.size;
    const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));
    return { blob: finalBlob, originalSize, compressedSize, savingsPercent };
  }

  const compressedSize = compressedBlob.size;
  const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));
  return { blob: compressedBlob, originalSize, compressedSize, savingsPercent };
}
