"use client";

import React, { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      href,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const router = useRouter();

    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

    const variants = {
      primary:
        "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 border-t border-amber-200/40",
      secondary:
        "bg-[#1A202C] hover:bg-[#232B3B] active:bg-[#141A24] text-slate-100 border border-white/10 hover:border-amber-500/30 hover:shadow-md",
      outline:
        "bg-transparent hover:bg-amber-500/10 active:bg-amber-500/20 text-slate-200 hover:text-amber-400 border border-white/15 hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/10",
      ghost:
        "bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] text-slate-300 hover:text-white",
      danger:
        "bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-md shadow-red-600/10",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs gap-1.5 min-w-[70px]",
      md: "h-11 px-4 text-sm gap-2 min-w-[90px]",
      lg: "h-12 px-6 text-base gap-2.5 min-w-[110px]",
    };

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </>
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || !href) return;

      if (e.metaKey || e.ctrlKey) {
        window.open(href, "_blank");
      } else {
        router.push(href);
      }
    };

    const handleAuxClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (href && e.button === 1) {
        e.preventDefault();
        window.open(href, "_blank");
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
