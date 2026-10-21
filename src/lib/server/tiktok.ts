/**
 * TikTok, through Apify's "TikTok Scraper" actor (clockworks/tiktok-scraper).
 * TikTok has no official API for looking up other creators' stats, so this
 * uses a paid third-party service that collects the public profile and its
 * latest videos. It costs about $0.0037 per video on Apify's free plan, so one
 * lookup of TIKTOK_VIDEO_LIMIT videos is about $0.13.
 * Docs: docs.apify.com/api/v2 and apify.com/clockworks/tiktok-scraper
 */
import type { PostType } from "../types";
import { LookupError } from "./errors";
import type { FetchedCreator, Fetcher } from "./fetched";

/** Videos fetched per lookup: the 30 the maths uses, plus a few for posts too new to count. */
export const TIKTOK_VIDEO_LIMIT = 36;
/** Apify stops a run that would cost more than this (US dollars). */
export const TIKTOK_MAX_CHARGE_USD = 0.2;
const ACTOR = "clockworks~tiktok-scraper";
const API = "https://api.apify.com/v2";
/** How long Apify may take before we give up, in seconds. */
const RUN_TIMEOUT_SECS = 150;

export function apifyTokenFromEnv(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new LookupError("config", "TikTok isn't connected yet. Add APIFY_TOKEN (see docs/SETUP.md).");
  return token;
}

interface AuthorMeta {
  id?: string;
  name?: string;
  nickName?: string;
  avatar?: string;
  signature?: string;
  region?: string;
  fans?: number;
  video?: number;
  privateAccount?: boolean;
}

export interface ApifyTikTokItem {
  id?: string;
  text?: string;
  createTime?: number;
  createTimeISO?: string;
  webVideoUrl?: string;
  isAd?: boolean;
  isSlideshow?: boolean;
  isPinned?: boolean;
  authorMeta?: AuthorMeta;
  diggCount?: number;
  commentCount?: number;
  playCount?: number;
  error?: string;
  errorCode?: string;
}

export async function fetchTikTokCreator(handle: string, token: string, fetcher: Fetcher = fetch): Promise<FetchedCreator> {
  const input = handle.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(input)) {
    throw new LookupError("not_found", "That isn't a valid TikTok username. Use letters, numbers, dots and underscores only.");
  }

  const items = await runActor(fetcher, token, {
    profiles: [input],
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    resultsPerPage: TIKTOK_VIDEO_LIMIT,
    // Pinned videos are usually old hits; they'd skew the "latest posts" numbers.
    excludePinnedPosts: true,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
    shouldDownloadSlideshowImages: false,
  });

  const videos = items.filter((i) => !i.errorCode && i.id && i.authorMeta);
  if (videos.length === 0) throw itemError(items.find((i) => i.errorCode), input);

  const author = videos[0].authorMeta!;
  if (author.privateAccount) throw new LookupError("not_found", `@${input} is a private TikTok account, so its numbers aren't public.`);

  return {
    platform: "tiktok",
    platformId: author.id ?? input,
    handle: author.name ?? input,
    name: author.nickName || author.name || input,
    photoUrl: author.avatar ?? null,
    bio: (author.signature ?? "").slice(0, 1000),
    followers: author.fans ?? 0,
    mediaCount: author.video ?? videos.length,
    accountType: "creator",
    country: author.region ?? null,
    posts: videos
      // Ads appear in the feed but aren't the creator's own posts.
      .filter((v) => !v.isAd)
      .map((v) => ({
        platformPostId: v.id!,
        type: (v.isSlideshow ? "slideshow" : "video") as PostType,
        postedAt: v.createTimeISO ?? new Date((v.createTime ?? 0) * 1000).toISOString(),
        likes: typeof v.diggCount === "number" ? v.diggCount : null,
        comments: v.commentCount ?? 0,
        views: typeof v.playCount === "number" ? v.playCount : null,
        url: v.webVideoUrl ?? `https://www.tiktok.com/@${input}`,
        caption: (v.text ?? "").slice(0, 300),
      })),
  };
}

/** Turn Apify's "error item" for a profile into a message the team can act on. */
function itemError(item: ApifyTikTokItem | undefined, handle: string): LookupError {
  switch (item?.errorCode) {
    case "PROFILE_PRIVATE":
      return new LookupError("not_found", `@${handle} is a private TikTok account, so its numbers aren't public.`);
    case "PROFILE_EMPTY":
      return new LookupError("not_found", `@${handle} has no public TikTok videos to look at.`);
    case "NOT_FOUND":
    case undefined:
      return new LookupError("not_found", `We couldn't find a TikTok account called @${handle}. Check the spelling.`);
    default:
      return new LookupError("upstream", `Apify couldn't read @${handle} (${item?.error ?? item?.errorCode}). Please try again later.`);
  }
}

async function runActor(fetcher: Fetcher, token: string, input: Record<string, unknown>): Promise<ApifyTikTokItem[]> {
  const url = new URL(`${API}/acts/${ACTOR}/run-sync-get-dataset-items`);
  url.searchParams.set("timeout", String(RUN_TIMEOUT_SECS));
  url.searchParams.set("maxTotalChargeUsd", String(TIKTOK_MAX_CHARGE_USD));
  let res: Response;
  try {
    res = await fetcher(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    throw new LookupError("upstream", "Couldn't reach Apify. Please try again in a moment.");
  }
  const body = (await res.json().catch(() => null)) as ApifyTikTokItem[] | { error?: { type?: string; message?: string } } | null;
  if (res.ok && Array.isArray(body)) return body;
  throw mapApifyError(res.status, body && !Array.isArray(body) ? body.error : undefined);
}

export function mapApifyError(status: number, error: { type?: string; message?: string } | undefined): LookupError {
  const type = error?.type ?? "";
  if (status === 401 || type === "user-or-token-not-found") {
    return new LookupError("auth", "Our Apify token isn't valid. Check APIFY_TOKEN in Vercel (see docs/SETUP.md).");
  }
  if (status === 429 || type === "rate-limit-exceeded") {
    return new LookupError("rate_limited", "Apify asked us to slow down. Waiting a little before trying again.", 10);
  }
  if (status === 402 || /usage|credit|limit|payment/i.test(type)) {
    return new LookupError("quota", "Apify's monthly credit is used up. It renews at the start of your Apify billing month.");
  }
  if (status === 408) {
    return new LookupError("upstream", "TikTok took too long to answer through Apify. Please try again.");
  }
  if (status >= 500) return new LookupError("upstream", "Apify had a temporary problem. Please try again shortly.");
  return new LookupError("upstream", `Apify returned an error: ${error?.message ?? `HTTP ${status}`}`);
}
