"use client";

import { useState, useEffect } from "react";
import { Activity, ShieldCheck, Zap, Database, Cpu } from "lucide-react";
import NumberTicker from "@/components/ui/NumberTicker";
import { getAnalyticsData, fetchGlobalStats, type AnalyticsData } from "@/lib/stats-service";
import { useLanguage } from "@/lib/i18n";

export default function GlobalAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { lang, t } = useLanguage();

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

  const totalOps = data
    ? data.upscaleCount + data.downloadCount + data.convertCount
    : 0;

  const totalSavedValue = data?.totalSavedMb || 0;
  const isGb = totalSavedValue >= 1024;
  const totalSavedDisplay = isGb
    ? (totalSavedValue / 1024).toFixed(1)
    : totalSavedValue.toString();
  const totalSavedUnit = isGb ? "GB" : "MB";

  return (
    <section className="clean-card p-5 sm:p-6 space-y-4">
      {/* Clean Minimal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {t.telemetry.sectionTitle}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>{t.telemetry.systemOnline}</span>
        </div>
      </div>

      {/* 4 Minimal Metric Columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-1">
        {/* Metric 1 */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400 block font-normal">
            {t.telemetry.totalProcessed}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            <NumberTicker value={totalOps} />
          </div>
          <span className="text-xs text-slate-400 block">
            {totalOps > 0 ? t.telemetry.totalSubtextLive : t.telemetry.totalSubtextStart}
          </span>
        </div>

        {/* Metric 2 */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400 block font-normal">
            {t.telemetry.bandwidthSaved}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            <span>{totalSavedDisplay}</span>
            <span className="text-sm font-normal text-slate-400 ml-1.5">{totalSavedUnit}</span>
          </div>
          <span className="text-xs text-slate-400 block">
            {t.telemetry.bandwidthSubtext}
          </span>
        </div>

        {/* Metric 3 */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400 block font-normal">
            {t.telemetry.speedTitle}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            <span>&lt; 1.2</span>
            <span className="text-sm font-normal text-slate-400 ml-1.5">
              {lang === "en" ? "Sec" : "Detik"}
            </span>
          </div>
          <span className="text-xs text-slate-400 block">
            {t.telemetry.speedSubtext}
          </span>
        </div>

        {/* Metric 4 */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400 block font-normal">
            {t.telemetry.privacyTitle}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            100%
            <span className="text-sm font-normal text-slate-400 ml-1.5">
              {t.telemetry.privacyValue}
            </span>
          </div>
          <span className="text-xs text-slate-400 block">
            {t.telemetry.privacySubtext}
          </span>
        </div>
      </div>
    </section>
  );
}
