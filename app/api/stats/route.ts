import { NextResponse } from "next/server";
import { getPlatformStatsAsync, incrementPlatformStatsAsync, readPlatformStats } from "@/lib/server-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getPlatformStatsAsync();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    const fallback = readPlatformStats();
    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tool = body.tool;
    const savedMb = Number(body.savedMb) || 1.5;

    if (tool === "upscale" || tool === "download" || tool === "convert") {
      const updated = await incrementPlatformStatsAsync(tool, savedMb);
      return NextResponse.json(updated);
    }

    const current = await getPlatformStatsAsync();
    return NextResponse.json(current);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update stats" }, { status: 500 });
  }
}
