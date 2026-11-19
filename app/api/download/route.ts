import { NextRequest, NextResponse } from "next/server";
import { extractMedia, detectPlatform } from "@/lib/downloader-engine";
import { incrementPlatformStats } from "@/lib/server-stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter 'url' wajib disertakan dan berupa tautan yang valid.",
          },
        },
        { status: 400 }
      );
    }

    const targetUrl = body.url.trim();
    const detected = detectPlatform(targetUrl);

    if (!detected) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNSUPPORTED_PLATFORM",
            message: "Platform belum didukung. Gunakan tautan dari TikTok, Instagram, Twitter/X, Threads, YouTube, Spotify, Pinterest, Pixiv, atau Facebook.",
          },
        },
        { status: 422 }
      );
    }

    const result = await extractMedia(targetUrl);

    // Auto increment server telemetry on successful media extraction
    try {
      incrementPlatformStats("download", 3.0);
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Downloader API Error:", error?.message || error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EXTRACTION_FAILED",
          message: error?.message || "Gagal mengunduh media dari link tersebut. Pastikan konten bersifat publik.",
        },
      },
      { status: 502 }
    );
  }
}
