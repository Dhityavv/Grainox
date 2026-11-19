"use client";

import React from "react";
import CleanLink from "@/components/ui/CleanLink";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  href?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function ShimmerButton({
  children,
  className = "",
  href,
  leftIcon,
  rightIcon,
  onClick,
  disabled,
  ...props
}: ShimmerButtonProps) {
  const content = (
    <div className="relative z-10 flex items-center justify-center gap-2">
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">
          {rightIcon}
        </span>
      )}
    </div>
  );

  const baseClasses = `group btn-pop relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-5 py-2.5 font-mono text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 border-t border-amber-200/40 transition-all duration-200 ${
    disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
  } ${className}`;

  if (href) {
    return (
      <CleanLink href={href} className={baseClasses}>
        {content}
      </CleanLink>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      {...props}
    >
      {content}
    </button>
  );
}
