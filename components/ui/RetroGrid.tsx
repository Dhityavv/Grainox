"use client";

/**
 * 21st.dev / Magic UI: Retro Grid Background
 * Subtle, high-performance living background ambiance for Grainox.
 */
export default function RetroGrid({
  className = "",
  angle = 65,
}: {
  className?: string;
  angle?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-30 [perspective:200px] -z-10 ${className}`}
    >
      {/* Grid Plane */}
      <div className="absolute inset-0 [transform-origin:100%_0_0]">
        <div
          style={{ transform: `rotateX(${angle}deg)` }}
          className="animate-grid [background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw] [background-image:linear-gradient(to_right,rgba(245,158,11,0.12)_1px,transparent_0),linear-gradient(to_bottom,rgba(245,158,11,0.12)_1px,transparent_0)]"
        />
      </div>

      {/* Radial Gradient Vignette so grid fades smoothly at edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090B10] via-transparent to-[#090B10]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#090B10] via-transparent to-[#090B10]" />
    </div>
  );
}
