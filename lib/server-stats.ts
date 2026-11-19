import fs from "fs";
import path from "path";

export interface PlatformStats {
  upscaleCount: number;
  downloadCount: number;
  convertCount: number;
  totalSavedMb: number;
  lastUpdated: number;
}

const DEFAULT_STATS: PlatformStats = {
  upscaleCount: 0,
  downloadCount: 8,
  convertCount: 0,
  totalSavedMb: 20,
  lastUpdated: Date.now(),
};

// Global in-memory cache
let memoryStats: PlatformStats = { ...DEFAULT_STATS };

const COUNTAPI_BASE = "https://countapi.mileshilliard.com/api/v1";
const KEY_UPSCALE = "grainox_prod_upscaleCount";
const KEY_DOWNLOAD = "grainox_prod_downloadCount";
const KEY_CONVERT = "grainox_prod_convertCount";
const KEY_SAVED_MB = "grainox_prod_totalSavedMb";

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
        upscaleCount: Number(parsed.upscaleCount) || 0,
        downloadCount: Number(parsed.downloadCount) || 8,
        convertCount: Number(parsed.convertCount) || 0,
        totalSavedMb: Number(parsed.totalSavedMb) || 20,
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
 * Fetch authoritative real-time stats from persistent cloud store,
 * falling back gracefully to local backup/memory if offline.
 */
export async function getPlatformStatsAsync(): Promise<PlatformStats> {
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
      const local = readLocalBackup();
      const updated: PlatformStats = {
        upscaleCount: upVal !== null ? upVal : local.upscaleCount,
        downloadCount: dlVal !== null ? dlVal : local.downloadCount,
        convertCount: cvVal !== null ? cvVal : local.convertCount,
        totalSavedMb: mbVal !== null ? mbVal : local.totalSavedMb,
        lastUpdated: Date.now(),
      };
      memoryStats = updated;
      saveLocalBackup(updated);
      return updated;
    }
  } catch (err) {
    console.warn("Cloud stats read error, using local/cache:", err);
  }

  return readPlatformStats();
}

/**
 * Synchronous read from memory / local backup file
 */
export function readPlatformStats(): PlatformStats {
  const local = readLocalBackup();
  memoryStats = local;
  return memoryStats;
}

/**
 * Atomically increment count on persistent cloud store and local state
 */
export async function incrementPlatformStatsAsync(
  tool: "upscale" | "download" | "convert",
  savedMb: number = 2.0
): Promise<PlatformStats> {
  const targetKey =
    tool === "upscale" ? KEY_UPSCALE : tool === "download" ? KEY_DOWNLOAD : KEY_CONVERT;

  // 1. Fire atomic increment on persistent cloud KV store
  try {
    const [incRes, mbRes] = await Promise.allSettled([
      fetch(`${COUNTAPI_BASE}/hit/${targetKey}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/set/${KEY_SAVED_MB}?value=${Math.round(memoryStats.totalSavedMb + savedMb)}`, {
        cache: "no-store",
      }).then((r) => r.json()),
    ]);

    if (incRes.status === "fulfilled" && typeof incRes.value?.value === "number") {
      const current = readLocalBackup();
      const updated: PlatformStats = {
        upscaleCount: tool === "upscale" ? incRes.value.value : current.upscaleCount,
        downloadCount: tool === "download" ? incRes.value.value : current.downloadCount,
        convertCount: tool === "convert" ? incRes.value.value : current.convertCount,
        totalSavedMb:
          mbRes.status === "fulfilled" && typeof mbRes.value?.value === "number"
            ? mbRes.value.value
            : Math.round((current.totalSavedMb + savedMb) * 10) / 10,
        lastUpdated: Date.now(),
      };
      memoryStats = updated;
      saveLocalBackup(updated);
      return updated;
    }
  } catch (err) {
    console.warn("Cloud stats increment error, updating locally:", err);
  }

  // 2. Local fallback
  return incrementPlatformStats(tool, savedMb);
}

export function incrementPlatformStats(
  tool: "upscale" | "download" | "convert",
  savedMb: number = 2.0
): PlatformStats {
  const current = readPlatformStats();
  const updated: PlatformStats = {
    upscaleCount: tool === "upscale" ? current.upscaleCount + 1 : current.upscaleCount,
    downloadCount: tool === "download" ? current.downloadCount + 1 : current.downloadCount,
    convertCount: tool === "convert" ? current.convertCount + 1 : current.convertCount,
    totalSavedMb: Math.round((current.totalSavedMb + savedMb) * 10) / 10,
    lastUpdated: Date.now(),
  };

  memoryStats = updated;
  saveLocalBackup(updated);
  return updated;
}
