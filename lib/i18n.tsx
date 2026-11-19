"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "id";

export interface Translations {
  nav: {
    home: string;
    upscaler: string;
    downloader: string;
    converter: string;
    info: string;
    version: string;
    toggleLangTitle: string;
  };
  hero: {
    categoryPill: string;
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    ctaButton: string;
    trustPrivate: string;
    trustGpu: string;
    trustFree: string;
  };
  bento: {
    sectionTitle: string;
    readyCount: string;
    upscaleTitle: string;
    upscaleBadge: string;
    upscaleDesc: string;
    beforeLabel: string;
    afterLabel: string;
    openUpscale: string;
    downloaderTitle: string;
    downloaderBadge: string;
    downloaderDesc: string;
    openDownloader: string;
    converterTitle: string;
    converterBadge: string;
    converterDesc: string;
    openConverter: string;
    webpPill: string;
    pngPill: string;
    jpgPill: string;
  };
  telemetry: {
    sectionTitle: string;
    systemOnline: string;
    totalProcessed: string;
    totalSubtextStart: string;
    totalSubtextLive: string;
    bandwidthSaved: string;
    bandwidthSubtext: string;
    speedTitle: string;
    speedSubtext: string;
    privacyTitle: string;
    privacyValue: string;
    privacySubtext: string;
  };
  footer: {
    tagline: string;
    nodeStatus: string;
    colModules: string;
    colPrivacy: string;
    colSpecs: string;
    clientIsolated: string;
    zeroLog: string;
    noTrackers: string;
    encryption: string;
    accelLabel: string;
    modelLabel: string;
    streamLabel: string;
    accessLabel: string;
    accessValue: string;
    copyright: string;
    fastPill: string;
    honestPill: string;
    privatePill: string;
  };
  infoModal: {
    title: string;
    subtitle: string;
    closeAria: string;
    supportTitle: string;
    supportDesc: string;
    supportBtn: string;
    websiteTitle: string;
    websiteDesc: string;
    websiteBtn: string;
    reportTitle: string;
    reportDesc: string;
    reportBtn: string;
    techNote: string;
  };
  toolAnalytics: {
    modulePerformance: string;
    active: string;
    totalSubLive: string;
    totalSubStart: string;
    upscale: {
      total: string;
      peakRes: string;
      peakResSub: string;
      gpuTime: string;
      gpuTimeVal: string;
      gpuTimeSub: string;
      fidelity: string;
      fidelitySub: string;
    };
    download: {
      total: string;
      peakAudio: string;
      peakAudioSub: string;
      streamSpeed: string;
      streamSpeedVal: string;
      streamSpeedSub: string;
      platforms: string;
      platformsVal: string;
      platformsSub: string;
    };
    convert: {
      total: string;
      efficiency: string;
      efficiencySub: string;
      speed: string;
      speedVal: string;
      speedSub: string;
      privacy: string;
      privacySub: string;
    };
  };
  tools: {
    backHome: string;
    upscale: {
      title: string;
      badge: string;
      desc: string;
      modelSelect: string;
      scaleLabel: string;
      scale2x: string;
      scale4x: string;
      models: {
        ultrasharp: { name: string; badge: string; tagline: string; desc: string };
        digitalArt: { name: string; badge: string; tagline: string; desc: string };
        remacri: { name: string; badge: string; tagline: string; desc: string };
      };
      inputLabel: string;
      resultLabel: string;
      dropTitle: string;
      dropDropNow: string;
      dropSubtitle: string;
      btnPickComputer: string;
      dropLimits: string;
      changePhoto: string;
      btnStartProcessing: string;
      processing: string;
      btnDownload: string;
      compareOriginal: string;
      compareEnhanced: string;
      originalNotUpscaled: string;
      readyToUpscale: string;
      dropNewOverlayTitle: string;
      dropNewOverlaySub: string;
    };
    downloader: {
      title: string;
      desc: string;
      placeholder: string;
      pasteBtn: string;
      fetchBtn: string;
      fetching: string;
      errEmptyUrl: string;
      errGeneral: string;
      supportedLabel: string;
      readyBadge: string;
      durationLabel: string;
      creatorLabel: string;
      formatsLabel: string;
      historyTitle: string;
      clearHistory: string;
      reopenBtn: string;
      watchVideo: string;
      pauseVideo: string;
      previewTitle: string;
      closePreview: string;
      previewAudio: string;
      previewReady: string;
    };
    converter: {
      title: string;
      badge: string;
      desc: string;
      dropTitle: string;
      dropDropNow: string;
      dropSubtitle: string;
      btnPickFiles: string;
      batchNotice: string;
      targetFormat: string;
      qualityLabel: string;
      formatOptions: {
        webpDesc: string;
        pngDesc: string;
        jpegDesc: string;
      };
      queueTitle: string;
      clearAll: string;
      originalLabel: string;
      resultLabel: string;
      convertingSingle: string;
      downloadSingle: string;
      convertAll: string;
      convertingAll: string;
      downloadAll: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      home: "Home",
      upscaler: "AI Upscaler",
      downloader: "Downloader",
      converter: "Converter",
      info: "Info",
      version: "v1.0",
      toggleLangTitle: "Ganti ke Bahasa Indonesia",
    },
    hero: {
      categoryPill: "Web Utility Platform • 100% Free",
      titleLine1: "One Workspace for Media Processing,",
      titleHighlight: "AI Upscaling & File Conversion",
      subtitle:
        "Enhance images up to 4K resolution, download watermark-free social media content, and convert file formats instantly with zero privacy risks.",
      ctaButton: "Explore Tools",
      trustPrivate: "100% Private",
      trustGpu: "GPU Accelerated",
      trustFree: "No Signup Required",
    },
    bento: {
      sectionTitle: "Core Utility Modules",
      readyCount: "3 Active Modules",
      upscaleTitle: "AI Image Upscaler",
      upscaleBadge: "2x / 4x HD",
      upscaleDesc:
        "Sharpen low-resolution textures and eliminate blur instantly with on-device neural super-resolution.",
      beforeLabel: "Before (240p)",
      afterLabel: "After (4x HD)",
      openUpscale: "Launch AI Upscaler",
      downloaderTitle: "Universal Downloader",
      downloaderBadge: "9 Platforms",
      downloaderDesc:
        "Download watermark-free HD videos and 320kbps audio from your favorite social media platforms in one click.",
      openDownloader: "Launch Downloader",
      converterTitle: "Universal File Converter",
      converterBadge: "Batch",
      converterDesc:
        "Batch convert multiple image files to WebP, PNG, or JPG directly in your browser without uploading to any remote server.",
      openConverter: "Launch Converter",
      webpPill: "WebP (Ultra Light)",
      pngPill: "PNG (Lossless)",
      jpgPill: "JPG (Universal)",
    },
    telemetry: {
      sectionTitle: "Platform Telemetry",
      systemOnline: "All Systems Operational",
      totalProcessed: "Total Files Processed",
      totalSubtextStart: "Starting from 0 files",
      totalSubtextLive: "Verified real-time count",
      bandwidthSaved: "Bandwidth Saved",
      bandwidthSubtext: "Client-side compression",
      speedTitle: "Processing Speed",
      speedSubtext: "Local GPU acceleration",
      privacyTitle: "Privacy Guarantee",
      privacyValue: "Private",
      privacySubtext: "Zero server storage",
    },
    footer: {
      tagline:
        "High-performance browser-based media utility platform. Reconstruct photos, download social media media, and convert formats with absolute client-side privacy.",
      nodeStatus: "All Nodes Operational",
      colModules: "Utility Modules",
      colPrivacy: "Privacy & Security",
      colSpecs: "System Specifications",
      clientIsolated: "100% Client-Side Isolated",
      zeroLog: "Zero-Log / No Media Database",
      noTrackers: "Free of Trackers & 3rd-Party Ads",
      encryption: "TLS 1.3 Transport Encryption",
      accelLabel: "Acceleration:",
      modelLabel: "AI Model:",
      streamLabel: "Stream Engine:",
      accessLabel: "License:",
      accessValue: "100% Free & Open",
      copyright: "Grainox Toolkit. Universal Web Utilities.",
      fastPill: "Fast",
      honestPill: "Honest & Transparent",
      privatePill: "Fully Private",
    },
    infoModal: {
      title: "Grainox Toolkit",
      subtitle: "Information, Documentation & Contribution",
      closeAria: "Close dialog",
      supportTitle: "Support the Developer",
      supportDesc: "Support further development, new feature additions, and server maintenance via Saweria.",
      supportBtn: "Support via Saweria",
      websiteTitle: "Creator Portfolio & Website",
      websiteDesc: "Visit the developer's official site to explore more web utility tools and projects.",
      websiteBtn: "Visit Website",
      reportTitle: "Report a Bug / Request Feature",
      reportDesc: "Encountered an issue with media extraction or conversion? Open an issue on GitHub.",
      reportBtn: "Open GitHub Issues",
      techNote: "100% Client-side & GPU Privacy",
    },
    toolAnalytics: {
      modulePerformance: "Module Performance",
      active: "Active",
      totalSubLive: "Verified real-time count",
      totalSubStart: "Starts from 0",
      upscale: {
        total: "Total Photos Upscaled",
        peakRes: "Peak Resolution",
        peakResSub: "Neural Super-Res Model",
        gpuTime: "GPU Process Time",
        gpuTimeVal: "~1.4 sec",
        gpuTimeSub: "Local hardware acceleration",
        fidelity: "Pixel Fidelity",
        fidelitySub: "Zero noise & blur",
      },
      download: {
        total: "Total Media Downloaded",
        peakAudio: "Peak Audio Bitrate",
        peakAudioSub: "Lossless 320kbps MP3",
        streamSpeed: "Stream Latency",
        streamSpeedVal: "< 1.2 sec",
        streamSpeedSub: "Direct stream pipeline",
        platforms: "Platform Coverage",
        platformsVal: "9 Hubs",
        platformsSub: "TikTok, IG, YT, X...",
      },
      convert: {
        total: "Total Files Converted",
        efficiency: "Size Efficiency",
        efficiencySub: "Modern WebP compression",
        speed: "Conversion Speed",
        speedVal: "0.2 sec",
        speedSub: "Batch Canvas API",
        privacy: "Privacy Guarantee",
        privacySub: "Client-side isolated",
      },
    },
    tools: {
      backHome: "Back to Home",
      upscale: {
        title: "AI Image Upscaler",
        badge: "GPU Accelerated",
        desc: "Super-Resolution neural network running directly on your machine. Restore blurry photos to crisp 4x Ultra HD.",
        modelSelect: "Neural AI Model:",
        scaleLabel: "Scale:",
        scale2x: "2x HD",
        scale4x: "4x Ultra HD",
        models: {
          ultrasharp: {
            name: "UltraSharp",
            badge: "Popular",
            tagline: "General Photos & Landscapes",
            desc: "Sharpens micro-textures, nature, and real-world architecture.",
          },
          digitalArt: {
            name: "Digital Art",
            badge: "2D / Art",
            tagline: "Anime & Digital Illustrations",
            desc: "Smooths vector line art and suppresses digital noise artifacts.",
          },
          remacri: {
            name: "ReMacri",
            badge: "Portrait",
            tagline: "Faces & Portrait Photography",
            desc: "Restores facial details, natural skin tones, and vintage photos.",
          },
        },
        inputLabel: "Input:",
        resultLabel: "Result:",
        dropTitle: "Drag & drop your photo here",
        dropDropNow: "Drop photo now...",
        dropSubtitle: "Upload low-resolution photo to enhance up to 4x Ultra HD",
        btnPickComputer: "Choose Photo from Device",
        dropLimits: "JPG, PNG, WEBP • Up to 4K resolution",
        changePhoto: "Change Photo",
        btnStartProcessing: "Start AI Upscale",
        processing: "Processing Super-Resolution...",
        btnDownload: "Download HD Photo",
        compareOriginal: "Original Input",
        compareEnhanced: "AI Enhanced",
        originalNotUpscaled: "Original Photo (Not yet upscaled)",
        readyToUpscale: "Ready to upscale to",
        dropNewOverlayTitle: "Drop New Photo Here",
        dropNewOverlaySub: "Automatically replace active photo",
      },
      downloader: {
        title: "Universal Media Downloader",
        desc: "Download watermark-free videos, high-bitrate music (320kbps MP3), and original artworks from TikTok, Instagram, Twitter/X, Spotify, YouTube, Pinterest, Threads & Facebook.",
        placeholder: "Paste TikTok, Twitter/X, Spotify, YouTube, Pinterest link...",
        pasteBtn: "Paste",
        fetchBtn: "Fetch Media",
        fetching: "Extracting Media...",
        errEmptyUrl: "Please enter a valid media link first.",
        errGeneral: "Failed to extract media. Please ensure the post is publicly accessible.",
        supportedLabel: "Supported Platforms:",
        readyBadge: "Media Ready to Download",
        durationLabel: "Duration:",
        creatorLabel: "Creator:",
        formatsLabel: "Available Media Streams:",
        historyTitle: "Recent Download History (Local)",
        clearHistory: "Clear History",
        reopenBtn: "Open Again",
        watchVideo: "Watch Preview",
        pauseVideo: "Pause Video",
        previewTitle: "Live Media Preview",
        closePreview: "Close Preview",
        previewAudio: "Listen to Audio",
        previewReady: "Click to play & preview before downloading",
      },
      converter: {
        title: "Universal Image Converter",
        badge: "Batch Client-Side",
        desc: "Fast, batch image converter (WebP, PNG, JPG). 100% processed privately inside your browser without any server queue.",
        dropTitle: "Drag & drop images here",
        dropDropNow: "Drop all images now...",
        dropSubtitle: "Supports multiple selection at once",
        btnPickFiles: "Choose Image Files",
        batchNotice: "(Batch Processing)",
        targetFormat: "Target Format:",
        qualityLabel: "Compression Quality:",
        formatOptions: {
          webpDesc: "Modern compression & ultra compact file size",
          pngDesc: "Lossless quality with alpha transparency",
          jpegDesc: "Universal device & platform compatibility",
        },
        queueTitle: "File Queue",
        clearAll: "Clear All",
        originalLabel: "Original:",
        resultLabel: "Result:",
        convertingSingle: "Converting...",
        downloadSingle: "Download",
        convertAll: "Convert All",
        convertingAll: "Converting All Files...",
        downloadAll: "Download All",
      },
    },
  },
  id: {
    nav: {
      home: "Beranda",
      upscaler: "AI Upscaler",
      downloader: "Downloader",
      converter: "Converter",
      info: "Info",
      version: "v1.0",
      toggleLangTitle: "Switch to English",
    },
    hero: {
      categoryPill: "Platform Utilitas Web • 100% Gratis",
      titleLine1: "Satu Tempat untuk Olah Media,",
      titleHighlight: "AI Upscale & Konversi File",
      subtitle:
        "Tingkatkan resolusi foto hingga 4x, unduh media sosial tanpa watermark, dan konversi format berkas secara instan langsung di browser Anda.",
      ctaButton: "Pilih Modul Utilitas",
      trustPrivate: "100% Privat",
      trustGpu: "Akselerasi GPU",
      trustFree: "Tanpa Registrasi",
    },
    bento: {
      sectionTitle: "Modul Utilitas Utama",
      readyCount: "3 Modul Siap Pakai",
      upscaleTitle: "AI Image Upscaler",
      upscaleBadge: "2x / 4x HD",
      upscaleDesc:
        "Jernihkan foto buram dan tingkatkan resolusi hingga 4K secara instan dengan akselerasi GPU lokal.",
      beforeLabel: "Sebelum (240p)",
      afterLabel: "Setelah (4x HD)",
      openUpscale: "Buka AI Upscaler",
      downloaderTitle: "Universal Downloader",
      downloaderBadge: "9 Platform",
      downloaderDesc:
        "Unduh video tanpa watermark dan audio 320kbps dari platform media sosial favorit dalam satu klik.",
      openDownloader: "Buka Downloader",
      converterTitle: "Universal File Converter",
      converterBadge: "Batch",
      converterDesc:
        "Konversi banyak gambar sekaligus secara batch ke WebP, PNG, atau JPG langsung di browser tanpa upload ke server luar.",
      openConverter: "Buka Converter",
      webpPill: "WebP (Ringan)",
      pngPill: "PNG (Transparan)",
      jpgPill: "JPG (Universal)",
    },
    telemetry: {
      sectionTitle: "Telemetri Platform",
      systemOnline: "Semua Sistem Online",
      totalProcessed: "Total Berkas Diproses",
      totalSubtextStart: "Dimulai dari 0 berkas",
      totalSubtextLive: "Tercatat real-time dari pemakaian",
      bandwidthSaved: "Bandwidth Dihemat",
      bandwidthSubtext: "Kompresi client-side",
      speedTitle: "Kecepatan Eksekusi",
      speedSubtext: "Akselerasi GPU lokal",
      privacyTitle: "Jaminan Privasi",
      privacyValue: "Privat",
      privacySubtext: "Tanpa database server",
    },
    footer: {
      tagline:
        "Pusat utilitas pemrosesan media berkecepatan tinggi langsung di browser. Rekonstruksi foto, unduh media sosial, dan konversi format instan tanpa risiko pelacak data.",
      nodeStatus: "Semua Node Operasional",
      colModules: "Modul Utilitas",
      colPrivacy: "Privasi & Keamanan",
      colSpecs: "Spesifikasi Sistem",
      clientIsolated: "100% Client-Side Isolated",
      zeroLog: "Zero-Log / Tanpa Database Media",
      noTrackers: "Bebas Pelacak & Iklan Pihak Ketiga",
      encryption: "Enkripsi Transport TLS 1.3",
      accelLabel: "Akselerasi:",
      modelLabel: "Model AI:",
      streamLabel: "Stream Engine:",
      accessLabel: "Akses:",
      accessValue: "Gratis & Terbuka",
      copyright: "Grainox Toolkit. Universal Web Utilities.",
      fastPill: "Cepat",
      honestPill: "Jujur & Transparan",
      privatePill: "Privat Seutuhnya",
    },
    infoModal: {
      title: "Grainox Toolkit",
      subtitle: "Pusat Informasi, Dukungan & Kontribusi",
      closeAria: "Tutup dialog",
      supportTitle: "Dukungan Pengembang (Saweria)",
      supportDesc: "Bantu pengembangan server dan update model AI Grainox melalui donasi QRIS / GoPay / OVO.",
      supportBtn: "Dukung via Saweria",
      websiteTitle: "Website & Portofolio Kreator",
      websiteDesc: "Kunjungi situs resmi pengembang untuk melihat proyek dan karya utilitas web lainnya.",
      websiteBtn: "Kunjungi Website",
      reportTitle: "Laporkan Bug / Saran Fitur",
      reportDesc: "Menemukan kendala atau punya usulan? Buka laporan di GitHub Issues repositori.",
      reportBtn: "Buka GitHub Issues",
      techNote: "100% Privasi Client-side & GPU",
    },
    toolAnalytics: {
      modulePerformance: "Performa Modul",
      active: "Aktif",
      totalSubLive: "Tercatat real-time",
      totalSubStart: "Dimulai dari 0",
      upscale: {
        total: "Total Foto Di-upscale",
        peakRes: "Resolusi Puncak",
        peakResSub: "Model Neural Super-Res",
        gpuTime: "Waktu Proses GPU",
        gpuTimeVal: "~1.4 detik",
        gpuTimeSub: "Akselerasi lokal",
        fidelity: "Piksel Fidelity",
        fidelitySub: "Bebas noise & blur",
      },
      download: {
        total: "Total Media Terunduh",
        peakAudio: "Bitrate Audio Tertinggi",
        peakAudioSub: "Format MP3 jernih",
        streamSpeed: "Kecepatan Stream",
        streamSpeedVal: "< 1.2 detik",
        streamSpeedSub: "Direct pipeline",
        platforms: "Dukungan Platform",
        platformsVal: "9 Hub",
        platformsSub: "TikTok, IG, YT, X...",
      },
      convert: {
        total: "Total Berkas Dikonversi",
        efficiency: "Efisiensi Bobot",
        efficiencySub: "Kompresi WebP modern",
        speed: "Kecepatan Konversi",
        speedVal: "0.2 detik",
        speedSub: "Batch Canvas API",
        privacy: "Jaminan Privasi",
        privacySub: "Client-side isolated",
      },
    },
    tools: {
      backHome: "Kembali ke Beranda",
      upscale: {
        title: "AI Image Upscaler",
        badge: "GPU Accelerated",
        desc: "Super-Resolution neural network berbasis on-device. Rekonstruksi foto burik ke resolusi 4x Ultra HD tanpa blur.",
        modelSelect: "Model Neural AI:",
        scaleLabel: "Skala:",
        scale2x: "2x HD",
        scale4x: "4x Ultra HD",
        models: {
          ultrasharp: {
            name: "UltraSharp",
            badge: "Populer",
            tagline: "Foto Umum & Lanskap",
            desc: "Mempertajam detail tekstur mikro, alam, & arsitektur nyata.",
          },
          digitalArt: {
            name: "Digital Art",
            badge: "2D / Art",
            tagline: "Anime & Ilustrasi",
            desc: "Menghaluskan garis tepi (clean line art) tanpa artefak noise.",
          },
          remacri: {
            name: "ReMacri",
            badge: "Portrait",
            tagline: "Wajah & Potret",
            desc: "Restorasi wajah manusia, kulit alami, & foto lama.",
          },
        },
        inputLabel: "Input:",
        resultLabel: "Hasil:",
        dropTitle: "Tarik & Lepaskan foto di sini",
        dropDropNow: "Lepaskan foto sekarang...",
        dropSubtitle: "Unggah foto beresolusi rendah untuk dipertajam hingga 4x Ultra HD",
        btnPickComputer: "Pilih Foto dari Komputer",
        dropLimits: "JPG, PNG, WEBP • Hingga resolusi 4K",
        changePhoto: "Ganti Foto",
        btnStartProcessing: "Mulai Upscale Foto",
        processing: "Memproses Super-Resolution...",
        btnDownload: "Download HD",
        compareOriginal: "Input Asli",
        compareEnhanced: "AI Enhanced",
        originalNotUpscaled: "Foto Asli (Belum Di-upscale)",
        readyToUpscale: "Siap Di-upscale ke",
        dropNewOverlayTitle: "Lepaskan Foto Baru di Sini",
        dropNewOverlaySub: "Ganti foto aktif secara otomatis",
      },
      downloader: {
        title: "Universal Media Downloader",
        desc: "Unduh video tanpa watermark, musik kualitas tinggi (320kbps MP3), dan artwork asli dari TikTok, Instagram, Twitter/X, Spotify, YouTube, Pinterest, Threads & Facebook.",
        placeholder: "Tempel tautan TikTok, Twitter/X, Spotify, YouTube, Pinterest, Facebook...",
        pasteBtn: "Tempel",
        fetchBtn: "Ambil Media",
        fetching: "Mengekstrak Media...",
        errEmptyUrl: "Silakan masukkan URL tautan media terlebih dahulu.",
        errGeneral: "Gagal mengekstrak media. Pastikan konten bersifat publik.",
        supportedLabel: "Platform Didukung:",
        readyBadge: "Media Siap Diunduh",
        durationLabel: "Durasi:",
        creatorLabel: "Kreator:",
        formatsLabel: "Pilihan Format Unduhan Langsung:",
        historyTitle: "Riwayat Unduhan Terakhir (Privat Lokal)",
        clearHistory: "Hapus Riwayat",
        reopenBtn: "Buka Lagi",
        watchVideo: "Putar Video",
        pauseVideo: "Jeda Video",
        previewTitle: "Pratinjau Media Langsung",
        closePreview: "Tutup Pratinjau",
        previewAudio: "Dengarkan Audio",
        previewReady: "Klik untuk memutar video langsung sebelum diunduh",
      },
      converter: {
        title: "Universal Image Converter",
        badge: "Batch Client-Side",
        desc: "Konversi cepat batch banyak gambar sekaligus (WebP, PNG, JPG). 100% diproses privat langsung di mesin browser Anda tanpa antrean server.",
        dropTitle: "Tarik & Lepaskan File Gambar ke Sini",
        dropDropNow: "Lepaskan semua gambar sekarang...",
        dropSubtitle: "Mendukung seleksi sekaligus",
        btnPickFiles: "Pilih File Gambar",
        batchNotice: "(Batch Processing)",
        targetFormat: "Target Format:",
        qualityLabel: "Kualitas Kompresi:",
        formatOptions: {
          webpDesc: "Kompresi modern & ukuran berkas sangat ringkas",
          pngDesc: "Kualitas lossless dengan transparansi",
          jpegDesc: "Kompatibilitas standar universal berbagai perangkat",
        },
        queueTitle: "Antrean File",
        clearAll: "Hapus Semua",
        originalLabel: "Asli:",
        resultLabel: "Hasil:",
        convertingSingle: "Mengonversi...",
        downloadSingle: "Unduh",
        convertAll: "Konversi Semua",
        convertingAll: "Mengonversi Semua File...",
        downloadAll: "Unduh Semua",
      },
    },
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: translations.en,
});

const LANG_STORAGE_KEY = "grainox_preferred_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to English as requested
  const [lang, setLangState] = useState<Language>("en");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      if (saved === "id" || saved === "en") {
        setLangState(saved);
        document.documentElement.lang = saved;
      } else {
        // Default is English
        setLangState("en");
        document.documentElement.lang = "en";
      }
    } catch {}
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "id" : "en");
  };

  const currentTranslations = translations[lang];

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
