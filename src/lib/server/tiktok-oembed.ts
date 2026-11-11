import "server-only";
/**
 * TikTok's free, official oEmbed service: give it any video link (including
 * short vm./vt.tiktok.com links) and it says whose video it is and its ID.
 * No key and no Apify credit. Docs: developers.tiktok.com/doc/embed-videos
 */
import { isShortTikTokLink, tiktokVideoId } from "../post-links";
import type { Fetcher } from "./fetched";

export interface TikTokVideoRef {
  /** Video ID. */
  id: string;
  /** The creator's handle (without @). */
  handle: string | null;
  /** A full link: tiktok.com/@handle/video/ID. */
  url: string;
}

/** Work out the video ID and creator behind a TikTok link. Null when TikTok can't say (deleted, private, not a video). */
export async function resolveTikTok(url: string, fetcher: Fetcher = fetch): Promise<TikTokVideoRef | null> {
  const direct = tiktokVideoId(url);
  const handleInLink = url.match(/tiktok\.com\/@([\w.]+)/i)?.[1] ?? null;
  if (direct && handleInLink) return { id: direct, handle: handleInLink, url: `https://www.tiktok.com/@${handleInLink}/video/${direct}` };
  try {
    const res = await fetcher(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) console.warn("TikTok oEmbed", res.status, url);
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { author_unique_id?: string; embed_product_id?: string; html?: string; author_url?: string };
      const id = body.embed_product_id ?? body.html?.match(/data-video-id="(\d+)"/)?.[1] ?? direct;
      const handle = body.author_unique_id ?? body.author_url?.match(/@([\w.]+)/)?.[1] ?? handleInLink;
      if (id) return { id, handle, url: handle ? `https://www.tiktok.com/@${handle}/video/${id}` : url };
    }
  } catch {
    // Fall through to following the short link.
  }
  if (isShortTikTokLink(url)) {
    try {
      const res = await fetcher(url, { redirect: "follow", cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
      const id = tiktokVideoId(res.url);
      const handle = res.url.match(/tiktok\.com\/@([\w.]+)/i)?.[1] ?? null;
      if (id) return { id, handle, url: handle ? `https://www.tiktok.com/@${handle}/video/${id}` : res.url };
      console.warn("TikTok short link didn't lead to a video", res.status, res.url.slice(0, 120));
    } catch {
      // Nothing more to try.
    }
  }
  return direct ? { id: direct, handle: handleInLink, url } : null;
}
