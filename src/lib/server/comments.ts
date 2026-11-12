import "server-only";
/**
 * Reading a campaign's comments, once, when its report is made.
 * - YouTube: the official API (free).
 * - TikTok and Instagram: Apify (uses Apify credit), one run per platform.
 * Each post gives at most `cap` comments (newest or top ones, as the source returns them).
 */
import { instagramShortcode, tiktokVideoId, youtubeVideoId } from "../post-links";
import { normaliseUrl } from "../projects";
import type { RawComment } from "../campaign-report";
import type { ProjectPost } from "../types";
import { LookupError } from "./errors";
import type { Fetcher } from "./fetched";
import { mapApifyError, withApify } from "./tiktok";
import { resolveTikTok } from "./tiktok-oembed";
import { youtubeKeyFromEnv } from "./youtube";

/** Most an Apify comment run may spend, in US dollars (Apify's lowest cap is $0.50). Override with COMMENTS_MAX_CHARGE_USD. */
function maxCharge(): string {
  const n = Number(process.env.COMMENTS_MAX_CHARGE_USD);
  return String(Number.isFinite(n) && n >= 0.5 ? n : 1);
}

export interface CommentsResult {
  comments: RawComment[];
  sources: { platform: string; posts: number; comments: number; note?: string }[];
}

export async function readComments(posts: ProjectPost[], cap: number, fetcher: Fetcher = fetch): Promise<CommentsResult> {
  const out: CommentsResult = { comments: [], sources: [] };
  if (cap <= 0) return out;
  const by = (p: string) => posts.filter((x) => x.platform === p);
  for (const [platform, run] of [
    ["youtube", () => youtube(by("youtube"), cap, fetcher)],
    ["tiktok", () => tiktok(by("tiktok"), cap, fetcher)],
    ["instagram", () => instagram(by("instagram"), cap, fetcher)],
  ] as const) {
    const list = by(platform);
    if (list.length === 0) continue;
    try {
      const got = await run();
      out.comments.push(...got);
      out.sources.push({ platform, posts: list.length, comments: got.length });
    } catch (e) {
      out.sources.push({ platform, posts: list.length, comments: 0, note: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

async function youtube(posts: ProjectPost[], cap: number, fetcher: Fetcher): Promise<RawComment[]> {
  const key = youtubeKeyFromEnv();
  const out: RawComment[] = [];
  for (const p of posts) {
    const vid = youtubeVideoId(p.url);
    if (!vid) continue;
    let token: string | undefined;
    let got = 0;
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("videoId", vid);
      url.searchParams.set("maxResults", String(Math.min(100, cap - got)));
      url.searchParams.set("order", "relevance");
      url.searchParams.set("textFormat", "plainText");
      url.searchParams.set("key", key);
      if (token) url.searchParams.set("pageToken", token);
      const res = await fetcher(url, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        items?: { snippet?: { totalReplyCount?: number; topLevelComment?: { snippet?: { textOriginal?: string; likeCount?: number } } } }[];
        nextPageToken?: string;
        error?: { errors?: { reason?: string }[] };
      };
      if (!res.ok) {
        if (body.error?.errors?.[0]?.reason === "commentsDisabled") break;
        if (/quota/i.test(body.error?.errors?.[0]?.reason ?? "")) throw new LookupError("quota", "YouTube's daily allowance is used up; try again tomorrow.");
        break;
      }
      for (const it of body.items ?? []) {
        const s = it.snippet?.topLevelComment?.snippet;
        if (!s?.textOriginal) continue;
        out.push({ postId: p.id, text: s.textOriginal.slice(0, 1000), likes: s.likeCount ?? 0, replies: it.snippet?.totalReplyCount ?? 0 });
        got++;
      }
      token = body.nextPageToken;
    } while (token && got < cap);
  }
  return out;
}

interface ApifyComment {
  text?: string;
  comment?: string;
  diggCount?: number;
  likesCount?: number;
  replyCommentTotal?: number;
  repliesCount?: number;
  videoWebUrl?: string;
  submittedVideoUrl?: string;
  postUrl?: string;
  inputUrl?: string;
  url?: string;
  awemeId?: string;
  error?: string;
}

async function apify(actor: string, input: Record<string, unknown>, maxItems: number, fetcher: Fetcher): Promise<ApifyComment[]> {
  return withApify(async (token) => {
    const run = new URL(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items`);
    run.searchParams.set("timeout", "200");
    run.searchParams.set("maxTotalChargeUsd", maxCharge());
    run.searchParams.set("maxItems", String(maxItems));
    const res = await fetcher(run, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as ApifyComment[] | { error?: { type?: string; message?: string } } | null;
    if (!res.ok || !Array.isArray(body)) throw mapApifyError(res.status, body && !Array.isArray(body) ? body.error : undefined);
    return body.filter((c) => !c.error && (c.text ?? c.comment));
  });
}

/** Which post a comment belongs to, from the link the source says it came from. */
function postOf(c: ApifyComment, keyOf: (url: string) => string | null, byKey: Map<string, string>, only: string | null): string | null {
  for (const u of [c.videoWebUrl, c.submittedVideoUrl, c.postUrl, c.inputUrl, c.url]) {
    const k = u ? keyOf(u) : null;
    if (k && byKey.has(k)) return byKey.get(k)!;
  }
  if (c.awemeId && byKey.has(c.awemeId)) return byKey.get(c.awemeId)!;
  return only;
}

async function tiktok(posts: ProjectPost[], cap: number, fetcher: Fetcher): Promise<RawComment[]> {
  const targets: { post: ProjectPost; url: string; id: string | null }[] = [];
  for (const p of posts) {
    const ref = await resolveTikTok(p.url, fetcher);
    targets.push({ post: p, url: ref?.url ?? p.url, id: ref?.id ?? tiktokVideoId(p.url) });
  }
  const byKey = new Map<string, string>();
  for (const t of targets) {
    if (t.id) byKey.set(t.id, t.post.id);
    byKey.set(normaliseUrl(t.url), t.post.id);
  }
  const items = await apify(
    "clockworks~tiktok-comments-scraper",
    { postURLs: targets.map((t) => t.url), commentsPerPost: cap, maxRepliesPerComment: 0 },
    targets.length * cap + 10,
    fetcher,
  );
  const only = targets.length === 1 ? targets[0].post.id : null;
  return items.map((c) => ({
    postId: postOf(c, (u) => tiktokVideoId(u) ?? normaliseUrl(u), byKey, only),
    text: String(c.text ?? c.comment).slice(0, 1000),
    likes: c.diggCount ?? c.likesCount ?? 0,
    replies: c.replyCommentTotal ?? c.repliesCount ?? 0,
  }));
}

async function instagram(posts: ProjectPost[], cap: number, fetcher: Fetcher): Promise<RawComment[]> {
  const byKey = new Map<string, string>();
  for (const p of posts) {
    const code = instagramShortcode(p.url);
    if (code) byKey.set(code, p.id);
  }
  const items = await apify("apify~instagram-comment-scraper", { directUrls: posts.map((p) => p.url), resultsLimit: cap }, posts.length * cap + 10, fetcher);
  const only = posts.length === 1 ? posts[0].id : null;
  return items.map((c) => ({
    postId: postOf(c, (u) => instagramShortcode(u), byKey, only),
    text: String(c.text ?? c.comment).slice(0, 1000),
    likes: c.likesCount ?? c.diggCount ?? 0,
    replies: c.repliesCount ?? c.replyCommentTotal ?? 0,
  }));
}
