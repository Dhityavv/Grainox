# Grainox ⚡

> **All-in-One Client-Side Web Utility Platform**  
> High-performance media processing, on-device AI upscaling, watermark-free social media downloads, universal file conversion, and client-side PDF studio.

[![Website](https://img.shields.io/badge/Live-grainox.vercel.app-F59E0B?style=for-the-badge&logo=vercel&logoColor=black)](https://grainox.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🎯 Highlights & Features

### 1. 🧠 AI Image Upscaler (100% Client-Side)
- **Neural Super-Resolution**: Reconstruct low-resolution images into crisp **2x HD** or **4x Ultra HD** directly inside your browser.
- **Three Specialized AI Models**:
  - **UltraSharp 4x**: Micro-textures, real-world architecture, and landscape photos.
  - **Digital Art 4x**: Anime, illustrations, and clean line art without digital noise.
  - **ReMacri 4x**: Portraits, skin tones, and vintage photo restoration.
- **Hardware Acceleration**:
  - Desktop: WebAssembly SIMD + experimental WebGPU execution providers.
  - Mobile: Optimized Real-ESRGAN Compact tiling pipeline (2.49MB model) to prevent device overheating and GPU buffer starvation.
- **Interactive Before/After Slider**: Real-time visual comparison canvas with aspect ratio preservation.
- **Smart UI Flow**: Automatic button state management and confirmation prompts when changing models after processing.

### 2. 📥 Universal Media Downloader
- **Multi-Platform Support**: TikTok, Instagram, Twitter/X, Threads, YouTube, Spotify, Pinterest, Pixiv, and Facebook.
- **Watermark-Free & High Bitrate**: Direct 1080p/720p HD MP4 video streams and 320kbps MP3 audio downloads.
- **Streaming Pipeline**: Built-in chunked streaming proxy (`/api/download/stream`) to bypass CORS restrictions and expired token limits.
- **In-App Media Player**: Interactive video/audio preview before saving.
- **Local History**: Download logs saved locally with offline-persisted thumbnail data URLs.

### 3. 🔄 Universal File Converter & Compressor
- **Batch Image Studio**: Batch conversion between WebP, PNG, JPEG, and ICO formats with custom quality sliders.
- **Image Compressor**: Real-time size estimation and multi-file optimization.
- **Video to Audio**: Extract audio tracks directly from MP4 and WebM videos.
- **Data Studio**: Instant bidirectional conversions between **JSON ↔ CSV ↔ YAML**.
- **ZIP Studio**: Bundle multiple files into `.zip` archives or unpack and extract ZIP files on-device using JSZip.

### 4. 📄 PDF Tools Studio
- **Client-Side Document Security**: Zero server uploads — all document manipulations run inside browser memory using `pdf-lib`.
- **Core Operations**:
  - **Images to PDF**: Convert and compile multiple images into a single clean PDF document.
  - **Extract Pages**: Pull specific page ranges into a new standalone PDF.
  - **Compress PDF**: Optimize embedded objects and metadata to decrease file size.
  - **Protect & Unlock**: AES-256 password encryption and password removal.
  - **Text Extractor**: Extract raw text content directly from PDF pages.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS, CSS Custom Properties, Modern Glassmorphism
- **Animations**: [GSAP](https://greensock.com/gsap/) & Framer Motion
- **In-Browser Neural Runtime**: [ONNX Runtime Web](https://onnxruntime.ai/) & UpscalerJS
- **PDF Engine**: `pdf-lib` & `pdf-lib-encrypt`
- **Archive Utilities**: `jszip`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.18.0 or newer recommended)
- `npm`, `pnpm`, or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhityavv/Grainox.git
   cd Grainox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🔒 Privacy & Security First

- **Zero-Data Retention**: Media processed in the AI Upscaler, File Converter, and PDF Studio are never uploaded to any backend database. Processing occurs strictly within client browser memory.
- **Client-Side Isolation**: Files remain sandboxed in your browser runtime and are discarded when the tab is closed or refreshed.
- **Clean Interface**: Custom zero-leak navigation elements prevent unwanted URL status bar previews.

---

## 🙏 Credits & Acknowledgements

This project leverages open-source libraries, neural models, and scraping utilities to deliver seamless client-side utilities:

- Scraper & parser utilities adapted with assistance from `@coflyn/scrapr` by [CoFlynn](https://github.com/CoFlynn) and `btch-downloader`.
- Neural network architectures inspired by [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) and models converted for WebAssembly / WebGPU via [ONNX Runtime Web](https://github.com/microsoft/onnxruntime).
- Document and media processing powered by [pdf-lib](https://pdf-lib.js.org/) and [JSZip](https://stuk.github.io/jszip/).

---

## 📄 License

This project is licensed under the MIT License. Feel free to use, modify, and contribute!
