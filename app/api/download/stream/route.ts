import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "grainox-media.mp4";
  const isInline = searchParams.get("inline") === "1" || searchParams.get("preview") === "1";

  if (!targetUrl) {
    return new NextResponse("Parameter 'url' diperlukan.", { status: 400 });
  }

  // Jika URL mengarah ke token SnapTik yang Forbidden, tolak langsung
  if (targetUrl.includes("snaptik.app/api/hd") || targetUrl.includes("/api/hd?token=")) {
    return new NextResponse(
      "Link HD SnapTik diproteksi token browser asal. Silakan gunakan format resolusi lain yang tersedia.",
      { status: 403 }
    );
  }

  try {
    const urlObj = new URL(targetUrl);
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    // Forward Range header if browser requests seeking/partial content
    const clientRange = req.headers.get("range");
    if (clientRange) {
      headers["Range"] = clientRange;
    }

    // Platform-specific headers to bypass anti-hotlinking
    if (urlObj.hostname.includes("pixiv") || urlObj.hostname.includes("pximg")) {
      headers["Referer"] = "https://www.pixiv.net/";
    } else if (urlObj.hostname.includes("tiktok") || urlObj.hostname.includes("byteoversea")) {
      headers["Referer"] = "https://www.tiktok.com/";
    } else if (urlObj.hostname.includes("instagram") || urlObj.hostname.includes("cdninstagram")) {
      headers["Referer"] = "https://www.instagram.com/";
    } else if (urlObj.hostname.includes("twimg") || urlObj.hostname.includes("twitter") || urlObj.hostname.includes("x.com")) {
      headers["Referer"] = "https://twitter.com/";
    } else if (urlObj.hostname.includes("bilibili") || urlObj.hostname.includes("hdslb")) {
      headers["Referer"] = "https://www.bilibili.com/";
    }

    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (!res.ok && res.status !== 206) {
      return new NextResponse(`Gagal memproses media (HTTP ${res.status}).`, {
        status: res.status,
      });
    }

    const contentType = res.headers.get("content-type") || (isInline ? "video/mp4" : "application/octet-stream");
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Accept-Ranges", "bytes");

    if (isInline) {
      responseHeaders.set("Content-Disposition", "inline");
    } else {
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    return new NextResponse(res.body as any, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error("Stream Proxy Error:", err?.message || err);
    return new NextResponse("Terjadi kesalahan jaringan saat memproses media.", { status: 502 });
  }
}
