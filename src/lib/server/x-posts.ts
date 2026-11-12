import "server-only";
/**
 * X (Twitter) post numbers through Apify, since X's own API is expensive.
 * The actor is set by APIFY_X_ACTOR (default below) and reads tweets by link.
 * Field names differ a little between actors, so several spellings are read.
 */
import type { Fetcher } from "./fetched";
import { mapApifyError, withApify } from "./tiktok";

export const DEFAULT_X_ACTOR = "apidojo~tweet-scraper";

export interface XPostNumbers {
  id: string;
  url: string | null;
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  bookmarks: number | null;
  postedAt: string | null;
  text: string | null;
  authorFollowers: number | null;
}

/** The tweet ID in an x.com or twitter.com status link. */
export function tweetId(url: string): string | null {
  return url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i)?.[1] ?? null;
}

type Raw = Record<string, unknown>;
const n = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v;
  for (const v of vals) if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
};

export function readXItem(i: Raw): XPostNumbers | null {
  const id = String(i.id ?? i.id_str ?? i.tweetId ?? "");
  if (!/^\d+$/.test(id)) return null;
  const author = (i.author ?? i.user ?? {}) as Raw;
  const created = (i.createdAt ?? i.created_at ?? null) as string | null;
  return {
    id,
    url: (i.url ?? i.twitterUrl ?? null) as string | null,
    views: n(i.viewCount, i.views, (i.views as Raw | undefined)?.count),
    likes: n(i.likeCount, i.favorite_count, i.favoriteCount),
    replies: n(i.replyCount, i.reply_count),
    reposts: n(i.retweetCount, i.retweet_count),
    quotes: n(i.quoteCount, i.quote_count),
    bookmarks: n(i.bookmarkCount, i.bookmark_count),
    postedAt: created && !Number.isNaN(Date.parse(created)) ? new Date(created).toISOString() : null,
    text: (i.text ?? i.fullText ?? i.full_text ?? null) as string | null,
    authorFollowers: n(author.followers, author.followers_count, author.followersCount),
  };
}

/** One Apify run reading these tweet links. */
export async function readXPosts(urls: string[], fetcher: Fetcher = fetch): Promise<XPostNumbers[]> {
  if (urls.length === 0) return [];
  const actor = process.env.APIFY_X_ACTOR || DEFAULT_X_ACTOR;
  return withApify(async (token) => {
    const run = new URL(`https://api.apify.com/v2/acts/${encodeURIComponent(actor).replace("%7E", "~")}/run-sync-get-dataset-items`);
    run.searchParams.set("timeout", "120");
    run.searchParams.set("maxTotalChargeUsd", "0.5");
    run.searchParams.set("maxItems", String(urls.length + 5));
    const res = await fetcher(run, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: urls, maxItems: urls.length + 5 }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as Raw[] | { error?: { type?: string; message?: string } } | null;
    if (!res.ok || !Array.isArray(body)) throw mapApifyError(res.status, body && !Array.isArray(body) ? body.error : undefined);
    return body.map(readXItem).filter((x): x is XPostNumbers => x !== null);
  });
}
