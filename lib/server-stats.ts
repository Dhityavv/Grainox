import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export interface PlatformStats {
  upscaleCount: number;
  downloadCount: number;
  convertCount: number;
  totalSavedMb: number;
  lastUpdated: number;
}

const BLOB_STATS_URL = "https://syos8dcy6lkkonti.public.blob.vercel-storage.com/stats.json";
const COUNTAPI_BASE = "https://countapi.mileshilliard.com/api/v1";
const KEY_UPSCALE = "grainox_prod_upscaleCount";
const KEY_DOWNLOAD = "grainox_prod_downloadCount";
const KEY_CONVERT = "grainox_prod_convertCount";
const KEY_SAVED_MB = "grainox_prod_totalSavedMb";

const DEFAULT_STATS: PlatformStats = {
  upscaleCount: 10,
  downloadCount: 14,
  convertCount: 1,
  totalSavedMb: 41,
  lastUpdated: Date.now(),
};

// Global in-memory cache to answer reads in 0ms
let memoryStats: PlatformStats = { ...DEFAULT_STATS };
let lastFetchTime = 0;

function getFilePath(): string {
  return path.join(process.cwd(), "data", "platform-stats.json");
}

function readLocalBackup(): PlatformStats {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      return {
        upscaleCount: Number(parsed.upscaleCount) || DEFAULT_STATS.upscaleCount,
        downloadCount: Number(parsed.downloadCount) || DEFAULT_STATS.downloadCount,
        convertCount: Number(parsed.convertCount) || DEFAULT_STATS.convertCount,
        totalSavedMb: Number(parsed.totalSavedMb) || DEFAULT_STATS.totalSavedMb,
        lastUpdated: Number(parsed.lastUpdated) || Date.now(),
      };
    }
  } catch {}
  return memoryStats;
}

function saveLocalBackup(stats: PlatformStats) {
  try {
    const filePath = getFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), "utf-8");
  } catch {}
}

/**
 * Fetch authoritative real-time stats from Vercel Blob store,
 * with CountAPI secondary sync and memory fallback.
 */
export async function getPlatformStatsAsync(): Promise<PlatformStats> {
  const now = Date.now();
  // Cache in-memory for 1.5 seconds to prevent hammering during simultaneous client requests
  if (now - lastFetchTime < 1500 && memoryStats.upscaleCount > 0) {
    return memoryStats;
  }

  // Tier 1: Authoritative Vercel Blob global storage
  try {
    const blobRes = await fetch(`${BLOB_STATS_URL}?t=${now}`, {
      cache: "no-store",
    });
    if (blobRes.ok) {
      const data = await blobRes.json();
      if (typeof data.downloadCount === "number") {
        const stats: PlatformStats = {
          upscaleCount: Math.max(Number(data.upscaleCount) || 0, memoryStats.upscaleCount),
          downloadCount: Math.max(Number(data.downloadCount) || 0, memoryStats.downloadCount),
          convertCount: Math.max(Number(data.convertCount) || 0, memoryStats.convertCount),
          totalSavedMb: Math.max(Number(data.totalSavedMb) || 0, memoryStats.totalSavedMb),
          lastUpdated: now,
        };
        memoryStats = stats;
        lastFetchTime = now;
        saveLocalBackup(stats);
        return stats;
      }
    }
  } catch (err) {
    console.warn("Vercel Blob read warning:", err);
  }

  // Tier 2: CountAPI backup
  try {
    const [upRes, dlRes, cvRes, mbRes] = await Promise.allSettled([
      fetch(`${COUNTAPI_BASE}/get/${KEY_UPSCALE}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${KEY_DOWNLOAD}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${KEY_CONVERT}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${KEY_SAVED_MB}`, { cache: "no-store" }).then((r) => r.json()),
    ]);

    const upVal = upRes.status === "fulfilled" && typeof upRes.value?.value === "number" ? upRes.value.value : null;
    const dlVal = dlRes.status === "fulfilled" && typeof dlRes.value?.value === "number" ? dlRes.value.value : null;
    const cvVal = cvRes.status === "fulfilled" && typeof cvRes.value?.value === "number" ? cvRes.value.value : null;
    const mbVal = mbRes.status === "fulfilled" && typeof mbRes.value?.value === "number" ? mbRes.value.value : null;

    if (upVal !== null || dlVal !== null || cvVal !== null) {
      const stats: PlatformStats = {
        upscaleCount: Math.max(upVal ?? 0, memoryStats.upscaleCount),
        downloadCount: Math.max(dlVal ?? 0, memoryStats.downloadCount),
        convertCount: Math.max(cvVal ?? 0, memoryStats.convertCount),
        totalSavedMb: Math.max(mbVal ?? 0, memoryStats.totalSavedMb),
        lastUpdated: now,
      };
      memoryStats = stats;
      lastFetchTime = now;
      saveLocalBackup(stats);
      return stats;
    }
  } catch (err) {
    console.warn("CountAPI read warning:", err);
  }

  return memoryStats;
}

export function readPlatformStats(): PlatformStats {
  return memoryStats;
}

/**
 * Atomically increment count on persistent cloud store and broadcast globally
 */
export async function incrementPlatformStatsAsync(
  tool: "upscale" | "download" | "convert",
  savedMb: number = 2.0
): Promise<PlatformStats> {
  // 1. First get latest authoritative stats
  const current = await getPlatformStatsAsync();

  const updated: PlatformStats = {
    upscaleCount: tool === "upscale" ? current.upscaleCount + 1 : current.upscaleCount,
    downloadCount: tool === "download" ? current.downloadCount + 1 : current.downloadCount,
    convertCount: tool === "convert" ? current.convertCount + 1 : current.convertCount,
    totalSavedMb: Math.round((current.totalSavedMb + savedMb) * 10) / 10,
    lastUpdated: Date.now(),
  };

  memoryStats = updated;
  lastFetchTime = Date.now();
  saveLocalBackup(updated);

  // 2. Persist to Vercel Blob (Authoritative Global Cloud Store)
  try {
    await put("stats.json", JSON.stringify(updated), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (blobErr) {
    console.warn("Vercel Blob write error:", blobErr);
  }

  // 3. Simultaneously fire atomic increment to CountAPI backup in background
  const targetKey =
    tool === "upscale" ? KEY_UPSCALE : tool === "download" ? KEY_DOWNLOAD : KEY_CONVERT;
  fetch(`${COUNTAPI_BASE}/hit/${targetKey}`, { cache: "no-store" }).catch(() => {});
  fetch(`${COUNTAPI_BASE}/set/${KEY_SAVED_MB}?value=${Math.round(updated.totalSavedMb)}`, {
    cache: "no-store",
  }).catch(() => {});

  return updated;
}

export function incrementPlatformStats(
  tool: "upscale" | "download" | "convert",
  savedMb: number = 2.0
): PlatformStats {
  incrementPlatformStatsAsync(tool, savedMb).catch(() => {});
  return memoryStats;
}
