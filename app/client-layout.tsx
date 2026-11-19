"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InfoModal from "@/components/InfoModal";
import CommandPalette from "@/components/CommandPalette";
import { LanguageProvider } from "@/lib/i18n";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

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
      </div>
    </LanguageProvider>
  );
}
