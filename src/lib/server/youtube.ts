/**
 * YouTube Data API v3. Uses about 3 quota units per creator:
 *   channels.list (1) → playlistItems.list of the uploads playlist (1) → videos.list (1).
 * We never use search.list, which costs 100 units.
 * Official docs: developers.google.com/youtube/v3
 */
import type { PostType } from "../types";
import { LookupError } from "./errors";
import type { FetchedCreator, Fetcher } from "./fetched";

export const YT_VIDEO_LIMIT = 25;
/** Videos this short or shorter are counted as Shorts. */
const SHORT_MAX_SECONDS = 60;
const API = "https://www.googleapis.com/youtube/v3";

export function youtubeKeyFromEnv(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new LookupError("config", "YouTube isn't connected yet. Add YOUTUBE_API_KEY (see docs/SETUP.md).");
  return key;
}

/** "UC" + 22 characters is a channel ID; anything else is treated as a handle. */
export function isChannelId(s: string): boolean {
  return /^UC[A-Za-z0-9_-]{22}$/.test(s);
}

interface YtChannel {
  id: string;
  snippet: { title: string; description?: string; customUrl?: string; country?: string; thumbnails?: Record<string, { url: string }> };
  statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface YtVideo {
  id: string;
  snippet: { title: string; publishedAt: string; liveBroadcastContent?: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
}

export async function fetchYouTubeCreator(handleOrId: string, key: string, fetcher: Fetcher = fetch): Promise<FetchedCreator> {
  const input = handleOrId.trim().replace(/^@/, "");
  if (!input || !/^[A-Za-z0-9._-]{1,100}$/.test(input)) {
    throw new LookupError("not_found", "That doesn't look like a YouTube handle, channel link or channel ID.");
  }

  const channelParams: Record<string, string> = { part: "snippet,statistics,contentDetails" };
  if (isChannelId(input)) channelParams.id = input;
  else channelParams.forHandle = `@${input}`;
  const channels = await call<{ items?: YtChannel[] }>(fetcher, "channels", channelParams, key);
  const ch = channels.items?.[0];
  if (!ch) throw new LookupError("not_found", `We couldn't find a YouTube channel for "${input}". Check the handle or paste the channel link.`);
  if (ch.statistics.hiddenSubscriberCount) {
    throw new LookupError("hidden_subscribers", "This channel hides its subscriber count, so we can't work out engagement or a score for it.");
  }

  let videos: YtVideo[] = [];
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    const items = await call<{ items?: { contentDetails: { videoId: string } }[] }>(
      fetcher,
      "playlistItems",
      { part: "contentDetails", playlistId: uploads, maxResults: String(YT_VIDEO_LIMIT) },
      key,
      true,
    );
    const ids = (items.items ?? []).map((i) => i.contentDetails.videoId);
    if (ids.length) {
      const v = await call<{ items?: YtVideo[] }>(fetcher, "videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") }, key);
      videos = (v.items ?? []).filter((x) => x.snippet.liveBroadcastContent !== "upcoming" && x.snippet.liveBroadcastContent !== "live");
    }
  }

  const thumbs = ch.snippet.thumbnails ?? {};
  return {
    platform: "youtube",
    platformId: ch.id,
    handle: (ch.snippet.customUrl ?? ch.id).replace(/^@/, ""),
    name: ch.snippet.title,
    photoUrl: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
    bio: (ch.snippet.description ?? "").slice(0, 1000),
    followers: Number(ch.statistics.subscriberCount ?? 0),
    mediaCount: Number(ch.statistics.videoCount ?? 0),
    accountType: "channel",
    country: ch.snippet.country ?? null,
    posts: videos.map((v) => ({
      platformPostId: v.id,
      type: ytType(v.contentDetails?.duration),
      postedAt: new Date(v.snippet.publishedAt).toISOString(),
      likes: v.statistics.likeCount !== undefined ? Number(v.statistics.likeCount) : null,
      comments: Number(v.statistics.commentCount ?? 0),
      views: v.statistics.viewCount !== undefined ? Number(v.statistics.viewCount) : null,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      caption: v.snippet.title.slice(0, 300),
    })),
  };
}

/** ISO 8601 duration ("PT1M5S") to seconds. */
export function durationSeconds(iso: string | undefined): number | null {
  const m = iso?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

function ytType(duration: string | undefined): PostType {
  const secs = durationSeconds(duration);
  return secs !== null && secs <= SHORT_MAX_SECONDS ? "short" : "video";
}

async function call<T>(fetcher: Fetcher, method: string, params: Record<string, string>, key: string, allowNotFound = false): Promise<T> {
  const url = new URL(`${API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  let res: Response;
  try {
    res = await fetcher(url, { cache: "no-store" });
  } catch {
    throw new LookupError("upstream", "Couldn't reach YouTube. Please try again in a moment.");
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: { code?: number; message?: string; errors?: { reason?: string }[] } };
  if (res.ok) return body;

  const reason = body.error?.errors?.[0]?.reason ?? "";
  if (allowNotFound && res.status === 404) return {} as T; // channel has no uploads playlist yet
  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    throw new LookupError("quota", "We've used today's YouTube allowance. It resets at midnight Pacific Time (8 or 9am in Lagos).");
  }
  if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || res.status === 429) {
    throw new LookupError("rate_limited", "YouTube asked us to slow down. Waiting a little before trying again.", 10);
  }
  if (res.status === 400 && /api key/i.test(body.error?.message ?? "")) {
    throw new LookupError("auth", "Our YouTube API key isn't valid. Check the key in the settings (see docs/SETUP.md).");
  }
  if (res.status === 403) {
    throw new LookupError("auth", "YouTube refused our API key. Make sure the YouTube Data API is enabled for it (see docs/SETUP.md).");
  }
  if (res.status >= 500) throw new LookupError("upstream", "YouTube had a temporary problem. Please try again shortly.");
  throw new LookupError("upstream", `YouTube returned an error: ${body.error?.message ?? `HTTP ${res.status}`}`);
}
