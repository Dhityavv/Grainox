"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, CornerDownLeft } from "lucide-react";
import { TOOLS_DATA } from "@/lib/tools-data";

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const filtered = TOOLS_DATA.filter(
    (tool) =>
      tool.name.toLowerCase().includes(query.toLowerCase()) ||
      tool.description.toLowerCase().includes(query.toLowerCase()) ||
      tool.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
  );

  // Handle Global Shortcut (Ctrl+K / Cmd+K) and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset index, focus input on open, and lock background scroll
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);

      // Nonaktifkan scroll background
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Arrow key navigation
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      onClose();
      router.push(filtered[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Tool Grainox"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12161D] shadow-2xl overflow-hidden text-left"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-[#161B24]">
          <Search className="w-4 h-4 text-amber-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari tool (contoh: upscale, download video, convert)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none font-sans"
            aria-label="Ketik nama tool atau kata kunci"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 mr-1 text-slate-400 hover:text-white"
              aria-label="Hapus kata pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Tutup dialog pencarian"
          >
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-slate-300">ESC</kbd>
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.length > 0 ? (
            filtered.map((tool, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    onClose();
                    router.push(tool.path);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all focus-visible:outline-none ${
                    isSelected
                      ? "bg-amber-500/15 border border-amber-500/40 text-white"
                      : "text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{tool.name}</span>
                      {tool.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{tool.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{tool.path}</span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-300 font-medium">Tidak ada tool yang cocok dengan &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Coba kata kunci: upscale, tiktok, converter, webp</p>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0E1218] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Buka</span>
          </div>
          <span>Grainox Command Engine</span>
        </div>
      </div>
    </div>
  );
}
