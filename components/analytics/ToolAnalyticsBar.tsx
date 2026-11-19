"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import NumberTicker from "@/components/ui/NumberTicker";
import { getAnalyticsData, fetchGlobalStats, type AnalyticsData } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";

interface ToolAnalyticsBarProps {
  tool: "upscale" | "download" | "convert";
}

interface StatCardItem {
  label: string;
  value?: number;
  rawText?: string;
  subtext: string;
}

export default function ToolAnalyticsBar({ tool }: ToolAnalyticsBarProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setData(getAnalyticsData());
    fetchGlobalStats().then((res) => setData(res));

    const handleUpdate = () => {
      setData(getAnalyticsData());
    };

    window.addEventListener("grainox_analytics_updated", handleUpdate);
    const interval = setInterval(() => {
      fetchGlobalStats().then((res) => setData(res));
    }, 15000);

    return () => {
      window.removeEventListener("grainox_analytics_updated", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const getCards = (): StatCardItem[] => {
    if (!data) return [];

    switch (tool) {
      case "upscale":
        return [
          {
            label: t.toolAnalytics.upscale.total,
            value: data.upscaleCount,
            subtext: data.upscaleCount > 0 ? t.toolAnalytics.totalSubLive : t.toolAnalytics.totalSubStart,
          },
          {
            label: t.toolAnalytics.upscale.peakRes,
            rawText: "4K Ultra HD",
            subtext: t.toolAnalytics.upscale.peakResSub,
          },
          {
            label: t.toolAnalytics.upscale.gpuTime,
            rawText: t.toolAnalytics.upscale.gpuTimeVal,
            subtext: t.toolAnalytics.upscale.gpuTimeSub,
          },
          {
            label: t.toolAnalytics.upscale.fidelity,
            rawText: "99.6%",
            subtext: t.toolAnalytics.upscale.fidelitySub,
          },
        ];

      case "download":
        return [
          {
            label: t.toolAnalytics.download.total,
            value: data.downloadCount,
            subtext: data.downloadCount > 0 ? t.toolAnalytics.totalSubLive : t.toolAnalytics.totalSubStart,
          },
          {
            label: t.toolAnalytics.download.peakAudio,
            rawText: "320 kbps",
            subtext: t.toolAnalytics.download.peakAudioSub,
          },
          {
            label: t.toolAnalytics.download.streamSpeed,
            rawText: t.toolAnalytics.download.streamSpeedVal,
            subtext: t.toolAnalytics.download.streamSpeedSub,
          },
          {
            label: t.toolAnalytics.download.platforms,
            rawText: t.toolAnalytics.download.platformsVal,
            subtext: t.toolAnalytics.download.platformsSub,
          },
        ];

      case "convert":
        return [
          {
            label: t.toolAnalytics.convert.total,
            value: data.convertCount,
            subtext: data.convertCount > 0 ? t.toolAnalytics.totalSubLive : t.toolAnalytics.totalSubStart,
          },
          {
            label: t.toolAnalytics.convert.efficiency,
            rawText: "~68%",
            subtext: t.toolAnalytics.convert.efficiencySub,
          },
          {
            label: t.toolAnalytics.convert.speed,
            rawText: t.toolAnalytics.convert.speedVal,
            subtext: t.toolAnalytics.convert.speedSub,
          },
          {
            label: t.toolAnalytics.convert.privacy,
            rawText: "100%",
            subtext: t.toolAnalytics.convert.privacySub,
          },
        ];
    }
  };

  const cards = getCards();

  return (
    <div className="clean-card p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {t.toolAnalytics.modulePerformance}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>{t.toolAnalytics.active}</span>
        </div>
      </div>

      {/* 4 Clean Minimal Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
        {cards.map((c, i) => (
          <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
            <span className="text-xs text-slate-400 block font-normal truncate">
              {c.label}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {typeof c.value === "number" ? (
                <NumberTicker value={c.value} />
              ) : (
                <span>{c.rawText}</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">
              {c.subtext}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
