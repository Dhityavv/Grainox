"use client";

import { useEffect, useState } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function PwaManager() {
  const { lang } = useLanguage();
  const isEn = lang === "en";
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if already running as standalone PWA
    if (typeof window !== "undefined") {
      const isApp =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isApp);
    }

    // 2. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.log("SW registration skipped:", err));
      });
    }

    // 3. Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed banner recently
      const dismissedUntil = localStorage.getItem("grainox_pwa_dismissed");
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setShowBanner(true);
      }
    };

    // 4. Handle install trigger from Navbar
    const handleTriggerInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice: any) => {
          setDeferredPrompt(null);
          setShowBanner(false);
        });
      } else {
        alert(
          isEn
            ? "To install Grainox on Desktop or iOS, tap 'Add to Home Screen' or your browser's install icon."
            : "Untuk menginstal Grainox di Desktop atau iOS, gunakan tombol 'Tambahkan ke Layar Utama' pada menu browser Anda."
        );
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("grainox_trigger_pwa_install", handleTriggerInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("grainox_trigger_pwa_install", handleTriggerInstall);
    };
  }, [isEn, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    // Dismiss for 7 days
    try {
      localStorage.setItem("grainox_pwa_dismissed", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {}
  };

  if (isStandalone || !showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="App Install Notice"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl bg-[#11151D]/95 border border-amber-500/30 p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white tracking-wide">
              {isEn ? "Install Grainox App" : "Pasang Aplikasi Grainox"}
            </h4>
            <button
              onClick={handleDismissBanner}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            {isEn
              ? "Fast access, offline tools & instant conversion on your desktop or phone home screen."
              : "Akses cepat, hemat kuota & buka tanpa internet langsung dari homescreen Anda."}
          </p>

          <div className="pt-1.5 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? "Install Now" : "Pasang Sekarang"}</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="h-8 px-2.5 rounded-lg text-slate-400 hover:text-white text-xs transition-colors"
            >
              {isEn ? "Later" : "Nanti"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
