"use client";

import React, { useState, useRef } from "react";
import { Upload, LucideIcon } from "lucide-react";

interface DropZoneProps {
  id: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  className?: string;
  compact?: boolean;
  onFilesSelected: (files: File[]) => void;
  children?: React.ReactNode;
}

export default function DropZone({
  id,
  accept,
  multiple = false,
  disabled = false,
  title,
  subtitle,
  badge,
  icon: IconComponent = Upload,
  className = "",
  compact = false,
  onFilesSelected,
  children,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
    // Reset value so same file can be re-selected if needed
    e.target.value = "";
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={handleInputChange}
      />
      <label
        htmlFor={id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer text-center select-none transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          compact ? "p-4 sm:p-5" : "p-6 sm:p-8"
        } ${
          isDragging
            ? "border-amber-400 bg-amber-500/15 scale-[1.01] shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/40"
            : "border-white/15 bg-[#141824] hover:bg-[#181E2E] hover:border-amber-500/50"
        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
      >
        <div
          className={`rounded-2xl flex items-center justify-center transition-all ${
            compact ? "w-10 h-10 mb-2" : "w-12 h-12 mb-3"
          } ${
            isDragging
              ? "bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-500/40"
              : "bg-amber-500/10 border border-amber-500/25 text-amber-400 group-hover:scale-105"
          }`}
        >
          <IconComponent className={compact ? "w-5 h-5" : "w-6 h-6"} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`font-bold tracking-tight text-white ${
                compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
              } ${isDragging ? "text-amber-300" : ""}`}
            >
              {isDragging ? "Lepaskan file disini / Drop files here" : title}
            </span>
            {badge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {badge}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {children && <div className="mt-3">{children}</div>}
      </label>
    </div>
  );
}
