"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  Sparkles,
  Download,
  ArrowRightLeft,
  ArrowRight,
  ArrowDown,
  Layers,
  ShieldCheck,
  Zap,
  FileText,
} from "lucide-react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import Button from "@/components/ui/Button";
import GlobalAnalyticsDashboard from "@/components/analytics/GlobalAnalyticsDashboard";
import { useLanguage } from "@/lib/i18n";

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-anim", {
        opacity: 0,
        y: 18,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });

      gsap.from(".card-anim", {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.25,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-12"
    >
      {/* Hero Section */}
      <section className="relative text-center max-w-2xl mx-auto pt-8 pb-4 flex flex-col items-center">
        {/* Soft Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[450px] h-[200px] bg-amber-500/[0.08] blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Calm Category Pill */}
        <div className="hero-anim inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>{t.hero.categoryPill}</span>
        </div>

        {/* Clean, Impactful Headline */}
        <h1 className="hero-anim text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
          {t.hero.titleLine1} <br />
          <span className="text-amber-400">{t.hero.titleHighlight}</span>
        </h1>

        {/* Short, Legible Subtitle */}
        <p className="hero-anim mt-4 text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
          {t.hero.subtitle}
        </p>

        {/* CTA & Trust Principles */}
        <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-4 mt-7">
          <a
            href="#modul-utilitas"
            className="btn-pop inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-amber-500/15"
          >
            <span>{t.hero.ctaButton}</span>
            <ArrowDown className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              {t.hero.trustPrivate}
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              {t.hero.trustGpu}
            </span>
            <span className="text-slate-700">•</span>
            <span>{t.hero.trustFree}</span>
          </div>
        </div>
      </section>

      {/* Bento Grid Tools Section */}
      <section id="modul-utilitas" className="space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t.bento.sectionTitle}
            </h2>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t.bento.readyCount}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 1: AI Image Upscaler (7 Cols) */}
          <div className="card-anim lg:col-span-7 clean-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {t.bento.upscaleBadge}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                {t.bento.upscaleTitle}
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed font-normal">
                {t.bento.upscaleDesc}
              </p>

              {/* 16:9 Landscape Interactive Preview */}
              <div className="w-full aspect-video rounded-xl overflow-hidden mb-5 border border-white/10 bg-[#080A0D] relative group">
                <BeforeAfterSlider
                  beforeImage="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=160&h=90&q=15"
                  afterImage="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&h=720&q=95"
                  beforeLabel={t.bento.beforeLabel}
                  afterLabel={t.bento.afterLabel}
                  aspectRatioProp={16 / 9}
                  beforeImageClassName="blur-[1.5px] contrast-90 brightness-95 scale-[1.01]"
                />
              </div>
            </div>

            <Button
              href="/tools/upscale"
              variant="primary"
              size="md"
              className="w-full justify-center font-semibold text-sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.bento.openUpscale}
            </Button>
          </div>

          {/* Card 2: Universal Media Downloader (5 Cols) */}
          <div className="card-anim lg:col-span-5 clean-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10">
                  {t.bento.downloaderBadge}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                {t.bento.downloaderTitle}
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed font-normal">
                {t.bento.downloaderDesc}
              </p>

              {/* Platform Badge Strip (Clean & Readable) */}
              <div className="flex flex-wrap gap-1.5 mb-5 text-xs text-slate-300">
                {["TikTok", "Instagram", "YouTube", "Twitter / X", "Spotify", "Pinterest", "Facebook"].map(
                  (p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5"
                    >
                      {p}
                    </span>
                  )
                )}
              </div>
            </div>

            <Button
              href="/tools/downloader"
              variant="outline"
              size="md"
              className="w-full justify-center font-semibold text-sm border-white/10 hover:border-amber-400/40"
              rightIcon={<ArrowRight className="w-4 h-4 text-amber-400" />}
            >
              {t.bento.openDownloader}
            </Button>
          </div>

          {/* Card 3: Universal File Converter (6 Cols) */}
          <div className="card-anim lg:col-span-6 clean-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10">
                  {t.bento.converterBadge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                {t.bento.converterTitle}
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed font-normal">
                {t.bento.converterDesc}
              </p>

              {/* Conversion Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5 text-xs text-slate-300">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.webpPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.pngPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.jpgPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  Video → MP3
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  JSON ↔ CSV
                </span>
              </div>
            </div>

            <Button
              href="/tools/converter"
              variant="outline"
              size="md"
              className="w-full justify-center font-semibold text-sm border-white/10 hover:border-amber-400/40"
              rightIcon={<ArrowRight className="w-4 h-4 text-amber-400" />}
            >
              {t.bento.openConverter}
            </Button>
          </div>

          {/* Card 4: PDF Tools Studio (6 Cols) */}
          <div className="card-anim lg:col-span-6 clean-card p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {t.bento.pdfBadge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                {t.bento.pdfTitle}
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed font-normal">
                {t.bento.pdfDesc}
              </p>

              {/* PDF Tool Pills */}
              <div className="flex flex-wrap gap-1.5 mb-5 text-xs text-slate-300">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.imgToPdfPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.compressPdfPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  {t.bento.protectPdfPill}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
                  PDF → Images
                </span>
              </div>
            </div>

            <Button
              href="/tools/pdf"
              variant="outline"
              size="md"
              className="w-full justify-center font-semibold text-sm border-white/10 hover:border-amber-400/40"
              rightIcon={<ArrowRight className="w-4 h-4 text-amber-400" />}
            >
              {t.bento.openPdf}
            </Button>
          </div>
        </div>
      </section>

      {/* Clean Global Analytics Dashboard */}
      <GlobalAnalyticsDashboard />
    </div>
  );
}
