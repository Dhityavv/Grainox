"use client";

// Shared platform analytics client service
export interface AnalyticsData {
  upscaleCount: number;
  downloadCount: number;
  convertCount: number;
  totalSavedMb: number;
  lastUpdated: number;
}

const STORAGE_KEY = "grainox_analytics_v3_clean";

const ZERO_STATS: AnalyticsData = {
  upscaleCount: 0,
  downloadCount: 0,
  convertCount: 0,
  totalSavedMb: 0,
  lastUpdated: Date.now(),
};

// In-memory cache for fast synchronous access
let cachedStats: AnalyticsData = { ...ZERO_STATS };
let isFetching = false;

// Auto-cleanup old dummy localStorage keys from earlier development
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("grainox_analytics_v1");
    localStorage.removeItem("grainox_analytics_v2");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cachedStats = {
        upscaleCount: Number(parsed.upscaleCount) || 0,
        downloadCount: Number(parsed.downloadCount) || 0,
        convertCount: Number(parsed.convertCount) || 0,
        totalSavedMb: Number(parsed.totalSavedMb) || 0,
        lastUpdated: Number(parsed.lastUpdated) || Date.now(),
      };
    }
    // Fetch fresh global stats from server immediately
    fetchGlobalStats();
  } catch {
    // safe fallback
  }
}

export async function fetchGlobalStats(): Promise<AnalyticsData> {
  if (typeof window === "undefined") return ZERO_STATS;
  if (isFetching) return cachedStats;

  isFetching = true;
  try {
    const res = await fetch("/api/stats", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      cachedStats = {
        upscaleCount: Number(data.upscaleCount) || 0,
        downloadCount: Number(data.downloadCount) || 0,
        convertCount: Number(data.convertCount) || 0,
        totalSavedMb: Number(data.totalSavedMb) || 0,
        lastUpdated: Number(data.lastUpdated) || Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
      window.dispatchEvent(new Event("grainox_analytics_updated"));
    }
  } catch (err) {
    // network fallback: keep memory
  } finally {
    isFetching = false;
  }
  return cachedStats;
}

export function getAnalyticsData(): AnalyticsData {
  return cachedStats;
}

export async function recordToolUsage(
  tool: "upscale" | "download" | "convert",
  extraSavedMb: number = 2.0
) {
  if (typeof window === "undefined") return;

  // Optimistic update for instant UI feedback
  cachedStats = {
    ...cachedStats,
    upscaleCount: tool === "upscale" ? cachedStats.upscaleCount + 1 : cachedStats.upscaleCount,
    downloadCount: tool === "download" ? cachedStats.downloadCount + 1 : cachedStats.downloadCount,
    convertCount: tool === "convert" ? cachedStats.convertCount + 1 : cachedStats.convertCount,
    totalSavedMb: Math.round((cachedStats.totalSavedMb + extraSavedMb) * 10) / 10,
    lastUpdated: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
  } catch {}

  window.dispatchEvent(new Event("grainox_analytics_updated"));

  // Persist to central server so ALL visitors see the incremented count
  try {
    const res = await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, savedMb: extraSavedMb }),
    });
    if (res.ok) {
      const serverData = await res.json();
      cachedStats = {
        upscaleCount: Number(serverData.upscaleCount) || 0,
        downloadCount: Number(serverData.downloadCount) || 0,
        convertCount: Number(serverData.convertCount) || 0,
        totalSavedMb: Number(serverData.totalSavedMb) || 0,
        lastUpdated: Number(serverData.lastUpdated) || Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
      window.dispatchEvent(new Event("grainox_analytics_updated"));
    }
  } catch (err) {
    // server unreachable fallback
  }
}
