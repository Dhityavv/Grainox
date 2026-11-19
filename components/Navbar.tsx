"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, Info, Menu, X, ArrowRightLeft, Download, Languages, FileText, Volume2, VolumeX } from "lucide-react";
import GrainoxLogo from "@/components/ui/GrainoxLogo";
import CleanLink from "@/components/ui/CleanLink";
import { useLanguage } from "@/lib/i18n";
import { isSoundEnabled, toggleSound, playClickSound } from "@/lib/sound-effects";

interface NavbarProps {
  onOpenInfo?: () => void;
  onOpenCommand?: () => void;
}

export default function Navbar({ onOpenInfo }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const { lang, toggleLang, t } = useLanguage();

  useEffect(() => {
    setSoundActive(isSoundEnabled());
    const handleSoundToggle = (e: any) => {
      setSoundActive(e.detail?.enabled ?? isSoundEnabled());
    };
    window.addEventListener("grainox_sound_toggled", handleSoundToggle);
    return () => window.removeEventListener("grainox_sound_toggled", handleSoundToggle);
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
  };

  const handleInstallApp = () => {
    playClickSound();
    window.dispatchEvent(new CustomEvent("grainox_trigger_pwa_install"));
  };

  // Close mobile drawer on route change or Escape
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/", label: t.nav.home, exact: true },
    { href: "/tools/upscale", label: t.nav.upscaler, icon: Sparkles },
    { href: "/tools/downloader", label: t.nav.downloader, icon: Download },
    { href: "/tools/converter", label: t.nav.converter, icon: ArrowRightLeft },
    { href: "/tools/pdf", label: t.nav.pdfTools, icon: FileText },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#090B10]/90 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between max-w-6xl mx-auto">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-7">
            <CleanLink
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
            >
              <GrainoxLogo size={28} />
              <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Grainox
              </span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/5 hidden sm:inline-block">
                v1.0
              </span>
            </CleanLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href, link.exact);
                const IconComponent = link.icon;
                return (
                  <CleanLink
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      active
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/25"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-4 h-4 opacity-80" />}
                    {link.label}
                  </CleanLink>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Sound Toggle, Install PWA, Language Toggle, Info Button & Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Audio Effects Toggle */}
            <button
              onClick={handleToggleSound}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                soundActive
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-[#12151E] text-slate-500 hover:text-slate-300"
              }`}
              title={
                soundActive
                  ? lang === "en" ? "Mute interactive audio" : "Matikan efek suara interaktif"
                  : lang === "en" ? "Enable interactive audio" : "Aktifkan efek suara interaktif"
              }
              aria-label="Toggle interactive audio sound effects"
            >
              {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Install App Trigger */}
            <button
              onClick={handleInstallApp}
              className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title={lang === "en" ? "Install Grainox as Desktop / Mobile App" : "Pasang Grainox sebagai Aplikasi"}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === "en" ? "Install App" : "Pasang App"}</span>
            </button>

            {/* Language Toggle Button (Translate Icon) */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-white/10 bg-[#12151E] text-xs font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title={t.nav.toggleLangTitle}
              aria-label="Toggle language between English and Indonesian"
            >
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-xs tracking-wide">
                {lang === "en" ? "EN" : "ID"}
              </span>
            </button>

            <button
              onClick={onOpenInfo}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 bg-[#12151E] text-xs font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label={lang === "en" ? "Open Information & Support" : "Buka Informasi & Dukungan"}
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.nav.info}</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-[#11151D] text-slate-300 hover:text-white hover:border-amber-500/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-95"
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation with Fullscreen Backdrop Blur */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-50 md:hidden flex flex-col justify-between">
            {/* Backdrop Blur Overlay */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative bg-[#11151D] border-b border-white/[0.1] px-5 py-5 space-y-2.5 shadow-2xl">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                {lang === "en" ? "Toolkit Navigation" : "Navigasi Toolkit"}
              </p>
              {navLinks.map((link) => {
                const active = isActive(link.href, link.exact);
                const IconComponent = link.icon;
                return (
                  <CleanLink
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      active
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "text-slate-200 hover:bg-white/[0.06] hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {IconComponent && <IconComponent className="w-4 h-4 text-amber-400" />}
                      {link.label}
                    </span>
                    {active && <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />}
                  </CleanLink>
                );
              })}

              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <button
                  onClick={handleInstallApp}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>{lang === "en" ? "Install Grainox App" : "Pasang Aplikasi Grainox"}</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    PWA
                  </span>
                </button>

                <button
                  onClick={handleToggleSound}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl bg-white/[0.04] text-slate-200 hover:text-amber-400 hover:bg-white/[0.08] border border-white/5 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    {soundActive ? (
                      <Volume2 className="w-4 h-4 text-amber-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{lang === "en" ? "Audio Effects" : "Efek Suara Interaktif"}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/[0.08] text-slate-300 border border-white/10">
                    {soundActive ? (lang === "en" ? "ON 🔊" : "AKTIF 🔊") : (lang === "en" ? "MUTE 🔇" : "SENYAP 🔇")}
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleLang();
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl bg-white/[0.04] text-slate-200 hover:text-amber-400 hover:bg-white/[0.08] border border-white/5 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Languages className="w-4 h-4 text-amber-400" />
                    <span>{lang === "en" ? "Language: English" : "Bahasa: Indonesia"}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    {lang === "en" ? "Ganti ke ID" : "Switch to EN"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenInfo?.();
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl bg-white/[0.04] text-slate-200 hover:text-amber-400 hover:bg-white/[0.08] border border-white/5 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-amber-400" />
                    {t.nav.info}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
