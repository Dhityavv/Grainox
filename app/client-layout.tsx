"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InfoModal from "@/components/InfoModal";
import CommandPalette from "@/components/CommandPalette";
import PwaManager from "@/components/pwa/PwaManager";
import { LanguageProvider } from "@/lib/i18n";
import { initGlobalSound } from "@/lib/sound-effects";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    initGlobalSound();
  }, []);

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col justify-between relative bg-[#090B10] text-[#F3F4F6]">
        <Navbar
          onOpenInfo={() => setInfoOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="flex-1">{children}</main>
        <Footer />
        <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
        <PwaManager />
      </div>
    </LanguageProvider>
  );
}
