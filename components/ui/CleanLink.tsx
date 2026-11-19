"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface CleanLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function CleanLink({
  href,
  children,
  className = "",
  onClick,
  ...props
}: CleanLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (href.startsWith("#")) {
      const targetId = href.slice(1);
      const el = document.getElementById(targetId) || document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  };

  const handleAuxClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button === 1) {
      // Middle click support
      e.preventDefault();
      window.open(href, "_blank");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className={`cursor-pointer inline-flex items-center text-left ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
