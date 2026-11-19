import { NextResponse } from "next/server";
import { readPlatformStats, incrementPlatformStats } from "@/lib/server-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = readPlatformStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        upscaleCount: 0,
        downloadCount: 0,
        convertCount: 0,
        totalSavedMb: 0,
        lastUpdated: Date.now(),
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tool = body.tool;
    const savedMb = Number(body.savedMb) || 1.5;

    if (tool === "upscale" || tool === "download" || tool === "convert") {
      const updated = incrementPlatformStats(tool, savedMb);
      return NextResponse.json(updated);
    }

    const current = readPlatformStats();
    return NextResponse.json(current);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update stats" }, { status: 500 });
  }
}
