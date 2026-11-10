# Archyl AI — Video & Photo Upscaler / Enhancer (1K / 2K / 4K)

Website lokal bergaya **Dark Studio Pro** untuk melakukan **upscale & enhance foto maupun video** hingga resolusi **1K (1920×1080)**, **2K (2560×1440)**, dan **4K (3840×2160)** menggunakan **AI Neural Super-Resolution (Real-ESRGAN ONNX)** berakselerasi **DirectML GPU** dan **FFmpeg** — gratis tanpa API key.

## Fitur Utama
- **Foto & Video Upscaler**: Mendukung JPG, PNG (termasuk transparansi RGBA), WebP, BMP, TIFF, serta MP4, MOV, MKV, AVI, WebM.
- **Target Output 1K, 2K, 4K**:
  - **1K**: `1920×1080` (FHD 1080p)
  - **2K**: `2560×1440` (QHD 1440p)
  - **4K**: `3840×2160` (UHD 2160p)
  - Mendukung mode rasio aspek: *Original (Proportional)*, *16:9 Crop*, *16:9 Letterbox*, dan *9:16 Vertical (Reels/Shorts)*.
- **3 Engine Upscaling**:
  - `Real-ESRGAN General v3 (AI 4x Fast)` — ONNX neural network cepat untuk video & foto.
  - `Real-ESRGAN x4plus (AI Ultra Photo)` — ONNX RRDBNet untuk detail tekstur maksimal pada foto.
  - `Studio Crisp Pro (Algorithmic)` — Lanczos4 + Multi-Scale Detail + Denoise + HDR CLAHE tanpa model eksternal.
- **Kontrol Studio & Before/After Interaktif**:
  - Profil preset (*General*, *Portrait*, *Anime*, *Restore*).
  - Slider *Sharpness*, *Denoise*, *HDR Tone*, *Color Vibrance*, dan *Quality*.
  - Preview 1 frame AI instan untuk video sebelum render penuh.
  - Split-slider & Side-by-Side interaktif untuk foto maupun video (pemutaran sinkron + audio asli terjaga).
  - Toggle bahasa **Indonesia (ID)** & **English (EN)**.

## Cara Menjalankan

### Opsi 1 — Klik 2x `start.bat` (Windows)
Atau jalankan di PowerShell:
```powershell
.\start.ps1
```
Buka **http://127.0.0.1:8000** di browser.

### Opsi 2 — Mode Development (Backend + Vite HMR)
```powershell
.\start.ps1 -Dev
```
- Frontend Vite: **http://localhost:5173**
- Backend FastAPI: **http://127.0.0.1:8000**

