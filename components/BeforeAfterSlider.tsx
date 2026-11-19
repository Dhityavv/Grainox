"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatioProp?: number;
  className?: string;
  beforeImageClassName?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Input Asli",
  afterLabel = "Target Pratinjau",
  aspectRatioProp,
  className = "",
  beforeImageClassName = "",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(aspectRatioProp || 16 / 9);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync prop or auto-detect from natural image dimensions
  useEffect(() => {
    if (aspectRatioProp) {
      setAspectRatio(aspectRatioProp);
      return;
    }
    if (!beforeImage) return;

    const img = new Image();
    img.src = beforeImage;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [beforeImage, aspectRatioProp]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(Math.round(percent));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPosition((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPosition((p) => Math.min(100, p + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      layout
      transition={{
        layout: { type: "spring", stiffness: 240, damping: 28 },
      }}
      role="slider"
      aria-label="Perbandingan Sebelum dan Sesudah"
      aria-valuenow={sliderPosition}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: "none",
        aspectRatio: `${aspectRatio}`,
      }}
      className={`relative select-none overflow-hidden rounded-xl border border-white/20 bg-[#0B0D10] cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 h-full max-h-full max-w-full shadow-2xl mx-auto ${className}`}
    >
      {/* Background (After / Enhanced Image) */}
      <img
        src={afterImage}
        alt="Hasil Enhanced"
        className="w-full h-full object-cover pointer-events-none select-none"
      />
      <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#12161D]/90 text-amber-400 border border-amber-500/30 backdrop-blur-md flex items-center gap-1 shadow-sm pointer-events-none">
        <Sparkles className="w-3 h-3 text-amber-400" /> {afterLabel}
      </span>

      {/* Clipped Overlay (Before Image) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Gambar Asli"
          className={`w-full h-full object-cover select-none ${beforeImageClassName}`}
        />
        <span className="absolute top-2.5 left-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0B0D10]/85 text-slate-300 border border-white/15 backdrop-blur-md shadow-sm pointer-events-none">
          {beforeLabel}
        </span>
      </div>

      {/* Divider Bar & Tactile Dragger */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] pointer-events-none transition-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-amber-500 text-[#0B0D10] border-2 border-[#0B0D10] shadow-xl flex items-center justify-center font-mono font-black text-[9px]">
          ◀▶
        </div>
      </div>
    </motion.div>
  );
}
