"use client";

// Shared platform analytics client service
export interface AnalyticsData {
  upscaleCount: number;
  downloadCount: number;
  convertCount: number;
  totalSavedMb: number;
  lastUpdated: number;
}

const STORAGE_KEY = "grainox_analytics_v4_global";
const DIRECT_BLOB_FALLBACK = "https://syos8dcy6lkkonti.public.blob.vercel-storage.com/stats.json";

const INITIAL_STATS: AnalyticsData = {
  upscaleCount: 10,
  downloadCount: 14,
  convertCount: 1,
  totalSavedMb: 41,
  lastUpdated: Date.now(),
};

// In-memory cache for fast synchronous access
let cachedStats: AnalyticsData = { ...INITIAL_STATS };
let isFetching = false;

// Auto-cleanup old dummy/stale localStorage keys
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("grainox_analytics_v1");
    localStorage.removeItem("grainox_analytics_v2");
    localStorage.removeItem("grainox_analytics_v3_clean");

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.downloadCount === "number") {
        cachedStats = {
          upscaleCount: Number(parsed.upscaleCount) || INITIAL_STATS.upscaleCount,
          downloadCount: Number(parsed.downloadCount) || INITIAL_STATS.downloadCount,
          convertCount: Number(parsed.convertCount) || INITIAL_STATS.convertCount,
          totalSavedMb: Number(parsed.totalSavedMb) || INITIAL_STATS.totalSavedMb,
          lastUpdated: Number(parsed.lastUpdated) || Date.now(),
        };
      }
    }

    // Immediately fetch authoritative global counts from server
    setTimeout(() => {
      fetchGlobalStats();
    }, 50);

    // Refresh when tab becomes visible (user switches back or unlocks phone)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        fetchGlobalStats();
      }
    });

    // Background real-time sync every 8 seconds
    setInterval(() => {
      fetchGlobalStats();
    }, 8000);
  } catch {
    // safe fallback
  }
}

export async function fetchGlobalStats(): Promise<AnalyticsData> {
  if (typeof window === "undefined") return INITIAL_STATS;
  if (isFetching) return cachedStats;

  isFetching = true;
  try {
    // 1. Try local API route with cache-busting timestamp
    const res = await fetch(`/api/stats?t=${Date.now()}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.downloadCount === "number") {
        cachedStats = {
          upscaleCount: Number(data.upscaleCount) || 0,
          downloadCount: Number(data.downloadCount) || 0,
          convertCount: Number(data.convertCount) || 0,
          totalSavedMb: Number(data.totalSavedMb) || 0,
          lastUpdated: Number(data.lastUpdated) || Date.now(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
        } catch {}
        window.dispatchEvent(new Event("grainox_analytics_updated"));
        return cachedStats;
      }
    }

    // 2. Direct Vercel Blob CDN fallback if API endpoint had network delay
    const blobRes = await fetch(`${DIRECT_BLOB_FALLBACK}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (blobRes.ok) {
      const data = await blobRes.json();
      if (typeof data.downloadCount === "number") {
        cachedStats = {
          upscaleCount: Number(data.upscaleCount) || 0,
          downloadCount: Number(data.downloadCount) || 0,
          convertCount: Number(data.convertCount) || 0,
          totalSavedMb: Number(data.totalSavedMb) || 0,
          lastUpdated: Number(data.lastUpdated) || Date.now(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
        } catch {}
        window.dispatchEvent(new Event("grainox_analytics_updated"));
      }
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

  // Optimistic update for instant visual feedback on current device
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

  // Persist to central Vercel Blob store so EVERY visitor on ANY device sees the updated count
  try {
    const res = await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, savedMb: extraSavedMb }),
    });
    if (res.ok) {
      const serverData = await res.json();
      if (typeof serverData.downloadCount === "number") {
        cachedStats = {
          upscaleCount: Number(serverData.upscaleCount) || 0,
          downloadCount: Number(serverData.downloadCount) || 0,
          convertCount: Number(serverData.convertCount) || 0,
          totalSavedMb: Number(serverData.totalSavedMb) || 0,
          lastUpdated: Number(serverData.lastUpdated) || Date.now(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStats));
        } catch {}
        window.dispatchEvent(new Event("grainox_analytics_updated"));
      }
    }
  } catch (err) {
    // server unreachable fallback
  }
}
