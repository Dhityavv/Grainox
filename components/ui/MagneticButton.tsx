"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import CleanLink from "@/components/ui/CleanLink";

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  href?: string;
  strength?: number;
}

export default function MagneticButton({
  children,
  className = "",
  href,
  strength = 0.22,
  onClick,
  ...props
}: MagneticButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distX = (e.clientX - centerX) * strength;
      const distY = (e.clientY - centerY) * strength;
      xTo(distX);
      yTo(distY);
    };

    const handleMouseLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return (
    <div ref={containerRef} className="inline-block">
      {href ? (
        href.startsWith("#") ? (
          <a href={href} className={className}>
            {children}
          </a>
        ) : (
          <CleanLink href={href} className={className}>
            {children}
          </CleanLink>
        )
      ) : (
        <button onClick={onClick} className={className} {...props}>
          {children}
        </button>
      )}
    </div>
  );
}
