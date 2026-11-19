"use client";

import React, { useRef, useState } from "react";
import BorderBeam from "@/components/ui/BorderBeam";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  withBorderBeam?: boolean;
  beamDuration?: number;
}

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(245, 158, 11, 0.18)",
  withBorderBeam = false,
  beamDuration = 9,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`card-pop relative rounded-2xl border border-white/[0.1] bg-[#11151D] overflow-hidden transition-all duration-300 hover:border-amber-500/40 ${className}`}
      {...props}
    >
      {/* 1. Border Beam directly hugging the outer border (Garis Hijau) */}
      {withBorderBeam && (
        <BorderBeam size={320} duration={beamDuration} colorFrom="#F59E0B" colorTo="#FEF08A" />
      )}

      {/* 2. Interactive Cursor Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(380px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />

      {/* 3. Card Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
