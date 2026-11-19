"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Globe, Bug, ExternalLink, ShieldCheck, Coffee } from "lucide-react";
import GrainoxLogo from "@/components/ui/GrainoxLogo";
import { useLanguage } from "@/lib/i18n";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const { t, lang } = useLanguage();

  // Lock background scroll when open & listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const openCleanUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-[#0B0D10]/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg rounded-2xl bg-[#12161D] border border-white/10 shadow-2xl p-4 sm:p-6 z-10 text-white overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Top Bar with Brand & Close Button */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <GrainoxLogo size={26} />
                <div>
                  <h2 id="info-dialog-title" className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    {t.infoModal.title}
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      v1.0
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">{t.infoModal.subtitle}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label={t.infoModal.closeAria}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Items */}
            <div className="py-4 space-y-3.5">
              {/* Item 1: Saweria Support */}
              <div className="p-3.5 rounded-xl bg-[#161B24] border border-amber-500/20 hover:border-amber-500/50 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        {t.infoModal.supportTitle}
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {t.infoModal.supportDesc}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => openCleanUrl("https://saweria.co/Dhityavv")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-[#0B0D10] text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span>{t.infoModal.supportBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Item 2: Personal Website / Portfolio */}
              <div className="p-3.5 rounded-xl bg-[#161B24] border border-white/[0.08] hover:border-white/20 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {t.infoModal.websiteTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {t.infoModal.websiteDesc}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => openCleanUrl("https://dhitya-space.vercel.app")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span>{t.infoModal.websiteBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Item 3: Laporkan Bug / GitHub Issues */}
              <div className="p-3.5 rounded-xl bg-[#161B24] border border-white/[0.08] hover:border-white/20 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Bug className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">
                        {t.infoModal.reportTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {t.infoModal.reportDesc}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => openCleanUrl("https://github.com/Dhityavv/Grainox/issues")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span>{t.infoModal.reportBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Tech Note */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {t.infoModal.techNote}
              </span>
              <span className="text-slate-400">Grainox 2026</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
