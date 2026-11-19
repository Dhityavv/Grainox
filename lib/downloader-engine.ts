import * as scrapr from "@coflyn/scrapr";
import * as btch from "btch-downloader";
import axios from "axios";

export interface MediaDownloadItem {
  type: "video" | "audio" | "image";
  quality: string;
  format: string;
  url: string;
  size?: string;
}

export interface DownloaderResult {
  platform: string;
  platformName: string;
  title: string;
  author: string;
  thumbnail?: string;
  duration?: string;
  downloads: MediaDownloadItem[];
}

// Deteksi platform dari URL
export function detectPlatform(rawUrl: string): string | null {
  const url = rawUrl.trim().toLowerCase();

  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/threads\.net|threads\.com/i.test(url)) return "threads";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/spotify\.com/i.test(url)) return "spotify";
  if (/pinterest\.com|pin\.it/i.test(url)) return "pinterest";
  if (/pixiv\.net/i.test(url)) return "pixiv";
  if (/facebook\.com|fb\.watch|fb\.me|fb\.com/i.test(url)) return "facebook";
  if (/bilibili\.com|b23\.tv/i.test(url)) return "bilibili";
  if (/douyin\.com/i.test(url)) return "douyin";
  if (/soundcloud\.com/i.test(url)) return "soundcloud";

  return null;
}

// Ekstraktor TikTok Khusus (Tier 1: TikWM Direct HD 1080p, bebas token/Forbidden)
async function extractTikTok(url: string): Promise<any> {
  // Tier 1: TikWM Direct API (100% Direct CDN, True 1080p HD, No Token Gating)
  try {
    const res = await axios.post(
      "https://www.tikwm.com/api/",
      new URLSearchParams({ url, hd: "1" }),
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    if (res.data && res.data.code === 0 && res.data.data) {
      const d = res.data.data;
      const downloads: MediaDownloadItem[] = [];

      // 1. True Full HD (1080p) Video - hanya masukkan jika ukuran valid (> 0) dan bukan duplikat
      const hasValidHd = Boolean(
        d.hdplay &&
        d.hd_size &&
        d.hd_size > 0 &&
        d.hdplay !== d.play
      );

      if (hasValidHd) {
        downloads.push({
          type: "video",
          quality: "Full HD Video",
          format: "mp4",
          url: d.hdplay.startsWith("http") ? d.hdplay : `https://www.tikwm.com${d.hdplay}`,
          size: `${(d.hd_size / (1024 * 1024)).toFixed(1)} MB`,
        });
      }

      // 2. Normal Video (Original / Watermark-free)
      if (d.play) {
        downloads.push({
          type: "video",
          quality: hasValidHd ? "Original Video" : "HD Video",
          format: "mp4",
          url: d.play.startsWith("http") ? d.play : `https://www.tikwm.com${d.play}`,
          size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        });
      }

      // 3. Slideshow Photos (jika format foto)
      if (Array.isArray(d.images) && d.images.length > 0) {
        d.images.forEach((imgUrl: string, idx: number) => {
          downloads.push({
            type: "image",
            quality: d.images.length > 1 ? `Foto Slide #${idx + 1}` : "Foto HD",
            format: "jpg",
            url: imgUrl,
          });
        });
      }

      // 4. Music Audio MP3
      if (d.music) {
        downloads.push({
          type: "audio",
          quality: "Audio MP3",
          format: "mp3",
          url: d.music.startsWith("http") ? d.music : `https://www.tikwm.com${d.music}`,
        });
      }

      if (downloads.length > 0) {
        return {
          status: true,
          result: {
            title: d.title || "TikTok Video",
            author: d.author?.nickname || d.author?.unique_id || "TikTok Creator",
            thumbnail: d.cover || d.origin_cover || "",
            duration: d.duration ? `${d.duration}s` : undefined,
            downloads,
          },
        };
      }
    }
  } catch (err) {
    console.warn("TikWM Tier 1 error, trying next tier:", err);
  }

  // Tier 2: Scrapr tiktokio (Direct CDN Links)
  try {
    const res = await (scrapr as any).tiktok.tiktokio(url);
    if (res && res.status && res.result) return res;
  } catch {}

  // Tier 3: Scrapr ssstik
  try {
    const res = await (scrapr as any).tiktok.ssstik(url);
    if (res && res.status && res.result) return res;
  } catch {}

  // Tier 4: Scrapr tikdownloader
  try {
    const res = await (scrapr as any).tiktok.tikdownloader(url);
    if (res && res.status && res.result) return res;
  } catch {}

  // Tier 5: Scrapr snaptik (Filter out /api/hd?token= link agar TIDAK Forbidden!)
  try {
    const res = await (scrapr as any).tiktok.snaptik(url);
    if (res && res.status && res.result) {
      if (Array.isArray(res.result.downloads)) {
        res.result.downloads = res.result.downloads.filter(
          (d: any) => !d.url?.includes("/api/hd") && !d.url?.includes("token=")
        );
      }
      return res;
    }
  } catch {}

  throw new Error("Gagal mengunduh video TikTok. Pastikan video bersifat publik.");
}

// Ekstraktor Twitter / X Mandiri (Bebas 404/403, support video & foto)
async function extractTwitter(url: string): Promise<any> {
  const match = url.match(/(?:status|statuses)\/(\d+)/i);
  if (!match) {
    throw new Error("URL Twitter/X tidak valid. Pastikan link tweet lengkap.");
  }
  const tweetId = match[1];

  // Tier 1: Direct FxTwitter dengan Twitterbot UA (100% Unblocked & Cepat)
  try {
    const res = await axios.get(`https://api.fxtwitter.com/i/status/${tweetId}`, {
      headers: {
        "User-Agent": "Twitterbot/1.0",
        Accept: "application/json",
      },
      timeout: 8000,
    });

    if (res.data?.code === 200 && res.data.tweet) {
      const tw = res.data.tweet;
      const downloads: MediaDownloadItem[] = [];

      // Videos
      if (Array.isArray(tw.media?.videos)) {
        tw.media.videos.forEach((v: any) => {
          if (v.url) {
            downloads.push({
              type: "video",
              quality: v.width && v.height ? `${v.width}x${v.height}` : "HD (MP4)",
              format: "mp4",
              url: v.url,
            });
          }
        });
      }

      // Photos
      if (Array.isArray(tw.media?.photos)) {
        tw.media.photos.forEach((p: any, idx: number) => {
          if (p.url) {
            downloads.push({
              type: "image",
              quality: `Foto #${idx + 1}`,
              format: "jpg",
              url: p.url,
            });
          }
        });
      }

      // Fallback all media
      if (downloads.length === 0 && Array.isArray(tw.media?.all)) {
        tw.media.all.forEach((m: any, idx: number) => {
          if (m.url) {
            downloads.push({
              type: m.type === "photo" ? "image" : "video",
              quality: m.type === "photo" ? `Foto #${idx + 1}` : "HD (MP4)",
              format: m.type === "photo" ? "jpg" : "mp4",
              url: m.url,
            });
          }
        });
      }

      if (downloads.length > 0) {
        return {
          status: true,
          result: {
            title: tw.text ? tw.text.replace(/https:\/\/t\.co\/\S+/g, "").trim() : "Twitter / X Post",
            author: tw.author?.name || (tw.author?.screen_name ? `@${tw.author.screen_name}` : "Twitter User"),
            thumbnail: tw.media?.photos?.[0]?.url || tw.media?.videos?.[0]?.thumbnail_url || "",
            downloads,
          },
        };
      }
    }
  } catch (err) {
    console.warn("FxTwitter Tier 1 error, trying next tier:", err);
  }

  // Tier 2: VxTwitter dengan TelegramBot UA
  try {
    const res = await axios.get(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
      headers: {
        "User-Agent": "TelegramBot (like TwitterBot)",
        Accept: "application/json",
      },
      timeout: 8000,
    });

    if (res.data && res.data.tweetID) {
      const tw = res.data;
      const downloads: MediaDownloadItem[] = [];

      if (Array.isArray(tw.media_extended)) {
        tw.media_extended.forEach((m: any, idx: number) => {
          if (m.url) {
            downloads.push({
              type: m.type === "video" ? "video" : "image",
              quality: m.type === "video" ? "HD (MP4)" : `Foto #${idx + 1}`,
              format: m.type === "video" ? "mp4" : "jpg",
              url: m.url,
            });
          }
        });
      } else if (Array.isArray(tw.mediaURLs)) {
        tw.mediaURLs.forEach((u: string, idx: number) => {
          const isVid = u.includes(".mp4");
          downloads.push({
            type: isVid ? "video" : "image",
            quality: isVid ? "HD (MP4)" : `Foto #${idx + 1}`,
            format: isVid ? "mp4" : "jpg",
            url: u,
          });
        });
      }

      if (downloads.length > 0) {
        return {
          status: true,
          result: {
            title: tw.text ? tw.text.replace(/https:\/\/t\.co\/\S+/g, "").trim() : "Twitter / X Post",
            author: tw.user_name || (tw.user_screen_name ? `@${tw.user_screen_name}` : "Twitter User"),
            thumbnail: tw.mediaURLs?.[0] || "",
            downloads,
          },
        };
      }
    }
  } catch (err) {
    console.warn("VxTwitter Tier 2 error, trying next tier:", err);
  }

  // Tier 3: Scrapr TVD
  try {
    const res = await (scrapr as any).twitter.tvd(url);
    if (res && res.status && res.result) return res;
  } catch {}

  // Tier 4: Scrapr Tweeload
  try {
    const res = await (scrapr as any).twitter.tweeload(url);
    if (res && res.status && res.result) return res;
  } catch {}

  throw new Error("Gagal mengunduh media Twitter / X. Pastikan tweet bersifat publik dan memiliki foto/video.");
}

// Ekstraktor Pinterest Khusus (Widgets API + HD Originals + Discard pink logo d53b014d86a6b6761bf649a0ed813c2b)
async function extractPinterest(rawUrl: string): Promise<any> {
  let url = rawUrl.trim();

  // 1. Follow redirect jika URL berupa shortlink pin.it atau vanity link
  if (url.includes("pin.it") || !/\/pin\/\d+/.test(url)) {
    try {
      const headRes = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
        maxRedirects: 5,
        timeout: 6000,
        validateStatus: () => true,
      });
      url = headRes.request?.res?.responseUrl || url;
    } catch (_) {}
  }

  // 2. Coba Widgets API resmi (unauthenticated v3 pidgets) jika ada Pin ID numerik
  const pinIdMatch = url.match(/\/pin\/(\d+)/);
  if (pinIdMatch) {
    const pinId = pinIdMatch[1];
    try {
      const wRes = await axios.get(
        `https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        }
      );

      const pin = wRes.data?.data?.[0];
      if (pin && !pin.error) {
        const title =
          pin.description ||
          pin.rich_metadata?.title ||
          pin.rich_metadata?.article?.name ||
          "Pinterest Pin";
        const author =
          pin.pinner?.full_name ||
          pin.native_creator?.full_name ||
          "Pinterest Creator";

        const downloads: MediaDownloadItem[] = [];
        let thumbnail = "";

        // Check video
        if (pin.videos && typeof pin.videos === "object") {
          const vList = pin.videos.video_list || pin.videos;
          const vKeys = ["V_720P", "V_EXP7", "V_HLSV4", "V_EXP6", "V_EXP5"];
          for (const k of vKeys) {
            if (vList[k]?.url) {
              downloads.push({
                type: "video",
                quality: k === "V_720P" ? "Video HD (720p)" : "Video (MP4)",
                format: "mp4",
                url: vList[k].url,
              });
              break;
            }
          }
        }

        // Image
        const imgObj = pin.images || {};
        const bestImg =
          imgObj["564x"]?.url || imgObj["237x"]?.url || imgObj["236x"]?.url;
        if (bestImg) {
          thumbnail = bestImg;
          const origUrl = bestImg.replace(
            /\/(?:564x|474x|237x|236x)\//,
            "/originals/"
          );
          downloads.push({
            type: "image",
            quality: "Original Image (HD)",
            format: origUrl.endsWith(".png") ? "png" : "jpg",
            url: origUrl,
          });
        }

        if (downloads.length > 0) {
          return {
            status: true,
            result: {
              title,
              author,
              thumbnail: thumbnail || downloads[0].url,
              type: downloads[0].type,
              downloads,
            },
          };
        }
      }
    } catch (err) {
      console.warn("Pinterest Widgets API fallback:", err);
    }
  }

  // 3. Fallback: Direct HTML scraping dengan Axios, buang keras asset logo d53b014d86a6b6761bf649a0ed813c2b
  try {
    const pageRes = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const html = typeof pageRes.data === "string" ? pageRes.data : "";
    if (html) {
      let title = "Pinterest Pin";
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      if (ogTitle && ogTitle[1]) {
        title = ogTitle[1].replace(/\s*\|\s*Pinterest$/i, "").trim();
      }

      const downloads: MediaDownloadItem[] = [];

      // Videos
      const videoMatches =
        html.match(/https:\/\/(?:v1\.pinimg\.com|7\.pinimg\.com|v\.pinimg\.com)\/[^"'\s]+\.mp4/gi) ||
        html.match(/https:\/\/[^"'\s]+\.mp4[^\s"']*/gi) ||
        [];
      const uniqueVideos = [...new Set(videoMatches)];
      uniqueVideos.forEach((vUrl) => {
        downloads.push({
          type: "video",
          quality: "HD Video",
          format: "mp4",
          url: vUrl,
        });
      });

      // Images
      const imgMatches =
        html.match(/https:\/\/i\.pinimg\.com\/(?:originals|736x|564x)\/[a-zA-Z0-9\/._-]+\.(?:jpg|jpeg|png|webp)/gi) || [];

      // Filter ketat: buang logo pink d53b014d86a6b6761bf649a0ed813c2b dan asset sistem
      const validImages = [...new Set(imgMatches)].filter(
        (u) =>
          !u.includes("d53b014d86a6b6761bf649a0ed813c2b") &&
          !u.includes("s.pinimg.com") &&
          !u.includes("/avatars/") &&
          !u.includes("/profile/")
      );

      validImages.forEach((imgUrl) => {
        const origUrl = imgUrl.replace(/\/(?:736x|564x)\//, "/originals/");
        downloads.push({
          type: "image",
          quality: "Original Image (HD)",
          format: origUrl.endsWith(".png") ? "png" : "jpg",
          url: origUrl,
        });
      });

      if (downloads.length > 0) {
        return {
          status: true,
          result: {
            title,
            author: "Pinterest Creator",
            thumbnail: downloads[0].url,
            type: downloads[0].type,
            downloads,
          },
        };
      }
    }
  } catch (err) {
    console.warn("Pinterest HTML fallback error:", err);
  }

  // 4. Fallback: pindown & direct tapi buang item d53b014d86a6b6761bf649a0ed813c2b
  try {
    const res = await (scrapr as any).pinterest.pindown(url);
    if (res && res.status && res.result && Array.isArray(res.result.downloads)) {
      res.result.downloads = res.result.downloads.filter(
        (d: any) => !d.url?.includes("d53b014d86a6b6761bf649a0ed813c2b")
      );
      if (res.result.downloads.length > 0) return res;
    }
  } catch (_) {}

  throw new Error("Gagal mengunduh media Pinterest. Pastikan link publik dan gambar/video tersedia.");
}

// Ekstraktor Facebook Khusus (Metadata Fetcher + SnapSave + Btch Multi-Tier)
async function extractFacebook(rawUrl: string): Promise<any> {
  const url = rawUrl.trim();
  let title = "Facebook Video";
  let thumbnail = "";

  // 1. Ambil metadata akurat (og:title, og:image) menggunakan crawler Facebook
  try {
    const metaRes = await axios.get(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 6000,
      maxRedirects: 5,
    });
    const html = typeof metaRes.data === "string" ? metaRes.data : "";
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogImgMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].replace(/&amp;/g, "&").trim();
    }
    if (ogImgMatch && ogImgMatch[1]) {
      thumbnail = ogImgMatch[1].replace(/&amp;/g, "&");
    }
  } catch (_) {}

  // Tier 1: Scrapr Facebook SnapSave (Direct video streams)
  try {
    const snapRes = await (scrapr as any).facebook.snapsave(url);
    if (snapRes && snapRes.status && snapRes.result && Array.isArray(snapRes.result.downloads)) {
      const downloads: MediaDownloadItem[] = [];
      const seen = new Set<string>();

      for (const d of snapRes.result.downloads) {
        if (!d.url || seen.has(d.url)) continue;
        seen.add(d.url);

        const q = (d.quality || "").toLowerCase();
        let label = "Video (MP4)";
        if (q.includes("hd") || q.includes("720") || q.includes("1080")) {
          label = "Video HD (720p)";
        } else if (q.includes("sd") || q.includes("normal") || q.includes("360")) {
          label = "Video SD (Normal)";
        }

        downloads.push({
          type: "video",
          quality: label,
          format: "mp4",
          url: d.url,
        });
      }

      if (downloads.length > 0) {
        return {
          status: true,
          result: {
            title: snapRes.result.title && snapRes.result.title !== "Facebook Video" ? snapRes.result.title : title,
            author: "Facebook Creator",
            thumbnail: thumbnail || snapRes.result.thumbnail || "",
            downloads,
          },
        };
      }
    }
  } catch (err) {
    console.warn("Facebook SnapSave error, trying Tier 2:", err);
  }

  // Tier 2: Btch Downloader (fbdown)
  try {
    const fbdownFn =
      typeof (btch as any).fbdown === "function"
        ? (btch as any).fbdown
        : (btch as any).default?.fbdown;

    if (typeof fbdownFn === "function") {
      const fbRes: any = await fbdownFn(url);
      if (fbRes && fbRes.status && (fbRes.HD || fbRes.Normal_video)) {
        const downloads: MediaDownloadItem[] = [];
        if (fbRes.HD) {
          downloads.push({
            type: "video",
            quality: "Video HD (720p)",
            format: "mp4",
            url: fbRes.HD,
          });
        }
        if (fbRes.Normal_video && fbRes.Normal_video !== fbRes.HD) {
          downloads.push({
            type: "video",
            quality: "Video SD (Normal)",
            format: "mp4",
            url: fbRes.Normal_video,
          });
        }

        if (downloads.length > 0) {
          return {
            status: true,
            result: {
              title,
              author: "Facebook Creator",
              thumbnail,
              downloads,
            },
          };
        }
      }
    }
  } catch (err) {
    console.warn("Facebook btch.fbdown error:", err);
  }

  throw new Error("Gagal mengunduh video Facebook. Pastikan video atau reel bersifat publik.");
}

// Ekstraktor dengan Multi-Tier Fallback agar reliabilitas 99%
export async function extractMedia(rawUrl: string): Promise<DownloaderResult> {
  const trimmedUrl = rawUrl.trim();
  const platform = detectPlatform(trimmedUrl);

  if (!platform) {
    throw new Error(
      "URL tidak didukung. Masukkan link dari TikTok, Instagram, Twitter/X, Threads, YouTube, Spotify, Pinterest, Pixiv, atau Facebook."
    );
  }

  let extractionData: any = null;
  let platformLabel = "Media";

  switch (platform) {
    case "tiktok": {
      platformLabel = "TikTok";
      extractionData = await extractTikTok(trimmedUrl);
      break;
    }

    case "twitter": {
      platformLabel = "Twitter / X";
      extractionData = await extractTwitter(trimmedUrl);
      break;
    }

    case "instagram": {
      platformLabel = "Instagram";
      const methods = [
        () => (scrapr as any).instagram.snapsave(trimmedUrl),
        () => (scrapr as any).instagram.indown(trimmedUrl),
        () => (scrapr as any).instagram.direct(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "threads": {
      platformLabel = "Threads";
      const methods = [
        () => (scrapr as any).threads.threadster(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "youtube": {
      platformLabel = "YouTube";
      const methods = [
        () => (scrapr as any).youtube.ytmp3(trimmedUrl, "mp4"),
        () => (scrapr as any).youtube.ytmp3gg(trimmedUrl, "mp4"),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "spotify": {
      platformLabel = "Spotify";
      const methods = [
        () => (scrapr as any).spotify.spotmate(trimmedUrl),
        () => (scrapr as any).spotify.spotidown(trimmedUrl),
        () => (scrapr as any).spotify.spotisaver(trimmedUrl),
        () => (scrapr as any).spotify.soundloaders(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "pinterest": {
      platformLabel = "Pinterest";
      extractionData = await extractPinterest(trimmedUrl);
      break;
    }

    case "pixiv": {
      platformLabel = "Pixiv";
      const methods = [
        () => (scrapr as any).pixiv.ajax(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "facebook": {
      platformLabel = "Facebook";
      extractionData = await extractFacebook(trimmedUrl);
      break;
    }

    case "bilibili": {
      platformLabel = "Bilibili";
      const methods = [
        () => (scrapr as any).bilibili.direct(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "douyin": {
      platformLabel = "Douyin";
      const methods = [
        () => (scrapr as any).douyin.direct(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    case "soundcloud": {
      platformLabel = "SoundCloud";
      const methods = [
        () => (scrapr as any).soundcloud.klickaud(trimmedUrl),
      ];
      extractionData = await runWithFallback(methods);
      break;
    }

    default:
      throw new Error(`Platform ${platform} belum didukung.`);
  }

  if (!extractionData || !extractionData.result) {
    throw new Error("Gagal mengekstrak media dari URL tersebut. Pastikan konten publik dan tautan valid.");
  }

  const res = extractionData.result;

  // Normalisasi Author
  let authorName = "";
  if (typeof res.author === "string" && res.author) {
    authorName = res.author;
  } else if (typeof res.author === "object" && res.author) {
    authorName = res.author.name || res.author.nickname || res.author.username || res.author.id || "";
  } else if (typeof res.artist === "string" && res.artist) {
    authorName = res.artist;
  }

  // Jika title dalam format "Artist - Song", ambil nama artist
  if (!authorName && res.title && res.title.includes(" - ")) {
    authorName = res.title.split(" - ")[0].trim();
  }

  if (!authorName) {
    authorName = `${platformLabel} Creator`;
  }

  // Normalisasi Downloads array, buang link invalid / ad-gated, dan dedup URL
  const rawDownloads: any[] = Array.isArray(res.downloads) ? res.downloads : [];
  const downloads: MediaDownloadItem[] = [];
  const seenUrls = new Set<string>();
  const seenQualityKeys = new Set<string>();

  let imageIndex = 1;
  let videoIndex = 1;

  for (const item of rawDownloads) {
    const mediaUrl = item.url || item.downloadUrl || item.link;
    if (!mediaUrl) continue;

    const rawType = (item.type || "").toLowerCase();
    const rawQuality = (item.quality || "").toLowerCase();

    // Khusus Spotify/SoundCloud: buang item "cover" gambar agar tidak terunduh sebagai MP3 palsu tak bersuara
    if (
      (platform === "spotify" || platform === "soundcloud") &&
      (rawQuality === "cover" || rawType.includes("photo") || rawType.includes("image"))
    ) {
      continue;
    }

    // Deduplikasi URL agar tidak ada tombol kembar
    const normalizedUrl = mediaUrl.trim();
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    // Proteksi: jangan masukkan link token /api/hd yang Forbidden
    if (normalizedUrl.includes("snaptik.app/api/hd") || normalizedUrl.includes("/api/hd?token=")) {
      continue;
    }

    let type: "video" | "audio" | "image" = "video";

    if (
      rawType.includes("audio") ||
      rawType.includes("mp3") ||
      rawType.includes("music") ||
      platform === "spotify" ||
      platform === "soundcloud"
    ) {
      type = "audio";
    } else if (
      rawType.includes("image") ||
      rawType.includes("photo") ||
      rawType.includes("jpg") ||
      rawType.includes("png") ||
      platform === "pixiv" ||
      platform === "pinterest"
    ) {
      type = "image";
    }

    let quality = item.quality;
    if (!quality || quality.toLowerCase() === "original" || quality.toLowerCase() === "photo") {
      if (type === "image") {
        quality = rawDownloads.length > 1 ? `Foto #${imageIndex++}` : "Foto HD";
      } else if (type === "video") {
        quality = rawDownloads.length > 1 ? `Video #${videoIndex++}` : "Video HD";
      } else {
        quality = "Audio MP3";
      }
    } else if (quality.toLowerCase() === "320kbps") {
      quality = "Audio MP3";
    }

    const format = item.format || (type === "video" ? "mp4" : type === "audio" ? "mp3" : "jpg");

    // Standardize & harmonize label nama button agar selalu serasi & logis
    if (type === "audio") {
      quality = "Audio MP3";
    }

    // Deduplikasi button kembar: Cegah tombol dengan fungsi, tipe, dan kualitas yang sama persis
    const qualityKey = `${type}_${quality.toLowerCase().trim()}_${format.toLowerCase().trim()}`;
    if (seenQualityKeys.has(qualityKey)) {
      const existing = downloads.find(
        (d) =>
          `${d.type}_${d.quality.toLowerCase().trim()}_${d.format.toLowerCase().trim()}` === qualityKey
      );
      if (existing && !existing.size && item.size) {
        existing.size = item.size;
      }
      continue;
    }
    seenQualityKeys.add(qualityKey);

    downloads.push({
      type,
      quality,
      format,
      url: normalizedUrl,
      size: item.size || item.fileSize || undefined,
    });
  }

  // Fallback jika downloads kosong tapi ada direct url di root
  if (downloads.length === 0 && (res.url || res.downloadUrl)) {
    downloads.push({
      type: platform === "spotify" ? "audio" : "video",
      quality: "HD / Original",
      format: platform === "spotify" ? "mp3" : "mp4",
      url: res.url || res.downloadUrl,
    });
  }

  return {
    platform,
    platformName: platformLabel,
    title: res.title || `${platformLabel} Media`,
    author: authorName,
    thumbnail: res.thumbnail || "",
    duration: res.duration || undefined,
    downloads,
  };
}

// Helper: Mencoba satu per satu metode sampai ada yang berhasil
async function runWithFallback(methods: Array<() => Promise<any>>): Promise<any> {
  let lastError = null;

  for (const method of methods) {
    try {
      const data = await method();
      if (data && data.status && data.result) {
        return data;
      }
      if (data && data.message) {
        lastError = new Error(data.message);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("Semua metode ekstraksi gagal.");
}
