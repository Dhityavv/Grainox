import React from "react";

interface GrainoxLogoProps {
  className?: string;
  size?: number;
}

export default function GrainoxLogo({ className = "", size = 32 }: GrainoxLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src="/grainox-icon.png"
        alt="Grainox Logo"
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
      />
    </div>
  );
}
