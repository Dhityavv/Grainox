"use client";

import {
  Sparkles,
  Download,
  ArrowRightLeft,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
} from "lucide-react";
import GrainoxLogo from "@/components/ui/GrainoxLogo";
import CleanLink from "@/components/ui/CleanLink";
import { useLanguage } from "@/lib/i18n";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-white/[0.07] bg-[#07090D] mt-16 sm:mt-20 relative overflow-hidden">
      {/* Subtle ambient amber spotlight glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[540px] h-[140px] bg-amber-500/[0.03] blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Directory Links & Architecture Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/[0.06]">
          {/* Col 1: Brand & Operational Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <GrainoxLogo size={26} />
              <span className="font-bold text-base text-white tracking-tight">Grainox</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/5">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              {t.footer.tagline}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {t.footer.nodeStatus}
              </span>
            </div>
          </div>

          {/* Col 2: Modul Utilitas Utama */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {t.footer.colModules}
            </h5>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <CleanLink
                  href="/tools/upscale"
                  className="hover:text-amber-400 transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400/80 group-hover:scale-110 transition-transform" />
                    AI Image Upscaler
                  </span>
                  <span className="text-[11px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                    4x HD
                  </span>
                </CleanLink>
              </li>
              <li>
                <CleanLink
                  href="/tools/downloader"
                  className="hover:text-amber-400 transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-sky-400/80 group-hover:scale-110 transition-transform" />
                    Universal Downloader
                  </span>
                  <span className="text-[11px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                    9 Hub
                  </span>
                </CleanLink>
              </li>
              <li>
                <CleanLink
                  href="/tools/converter"
                  className="hover:text-amber-400 transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400/80 group-hover:scale-110 transition-transform" />
                    File Converter
                  </span>
                  <span className="text-[11px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                    Batch
                  </span>
                </CleanLink>
              </li>
            </ul>
          </div>

          {/* Col 3: Standar Privasi & Keamanan */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {t.footer.colPrivacy}
            </h5>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.footer.clientIsolated}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.footer.zeroLog}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.footer.noTrackers}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.footer.encryption}</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Spesifikasi Engine Platform */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              {t.footer.colSpecs}
            </h5>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t.footer.accelLabel}</span>
                <span className="text-white font-medium">GPU WebGL</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t.footer.modelLabel}</span>
                <span className="text-amber-400 font-medium">Real-ESRGAN</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t.footer.streamLabel}</span>
                <span className="text-sky-400 font-medium">Direct Proxy</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t.footer.accessLabel}</span>
                <span className="text-emerald-400 font-medium">{t.footer.accessValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Principles */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <p>© {currentYear} {t.footer.copyright}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="text-slate-300">{t.footer.fastPill}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">{t.footer.honestPill}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">{t.footer.privatePill}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
