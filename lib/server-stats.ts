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
  downloadCount: 0,
  convertCount: 0,
  totalSavedMb: 0,
  lastUpdated: Date.now(),
};

let memoryStats: PlatformStats = { ...DEFAULT_STATS };

function getFilePath(): string {
  return path.join(process.cwd(), "data", "platform-stats.json");
}

export function readPlatformStats(): PlatformStats {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      memoryStats = {
        upscaleCount: Number(parsed.upscaleCount) || 0,
        downloadCount: Number(parsed.downloadCount) || 0,
        convertCount: Number(parsed.convertCount) || 0,
        totalSavedMb: Number(parsed.totalSavedMb) || 0,
        lastUpdated: Number(parsed.lastUpdated) || Date.now(),
      };
      return memoryStats;
    }
  } catch (err) {
    console.error("Error reading platform stats file:", err);
  }
  return memoryStats;
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

  try {
    const filePath = getFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write platform stats to disk (fallback to memory):", err);
  }

  return updated;
}
