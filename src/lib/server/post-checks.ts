import "server-only";
/**
 * Automatic post numbers for Projects: reads views, likes, comments (and
 * shares on TikTok) for campaign posts on their day 1, 3 and 7.
 *
 * - Instagram: Business Discovery on the creator, then the post is found among
 *   their recent posts by its link. One call per creator, however many posts.
 * - YouTube: videos.list, 50 videos per call (1 quota unit).
 * - TikTok: one Apify run for all due posts, within a monthly cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { TIKTOK_LIMITS } from "@config/app";
import { dueCheckDay, instagramShortcode, isShortTikTokLink, lagosDate, postAge, tiktokVideoId, youtubeVideoId } from "../post-links";
import { todayLagos } from "../projects";
import type { Platform, PostCheck } from "../types";
import { LookupError } from "./errors";
import type { Fetcher } from "./fetched";
import { fetchInstagramCreator, IG_MEDIA_LIMIT, instagramConfigFromEnv } from "./instagram";
import { loadSettings, saveFetchedCreator } from "./repository";
import { apifyTokenFromEnv, mapApifyError, type ApifyTikTokItem } from "./tiktok";
import { youtubeKeyFromEnv } from "./youtube";

/** Instagram creators read per run, leaving most of the ~200 an hour for lookups and imports. */
export const POST_CHECK_IG_CALLS_PER_RUN = 40;
/** TikTok posts per Apify run (Apify's lowest spending cap of $0.50 covers well over this). */
const TIKTOK_POSTS_PER_RUN = 100;

export function tiktokPostCheckLimit(): number {
  const n = Number(process.env.TIKTOK_POST_CHECKS_PER_MONTH);
  return Number.isInteger(n) && n >= 0 ? n : TIKTOK_LIMITS.postChecksPerMonth;
}

interface PostRow {
  id: string;
  project_id: string;
  url: string;
  platform: Platform | null;
  posted_date: string | null;
  checks: PostCheck[] | null;
  last_tried_at: string | null;
  creator_id: string | null;
  creators: { handle: string; platform: Platform } | null;
}

interface Due {
  row: PostRow;
  day: number;
}

export interface PostCheckSummary {
  checked: number;
  problems: number;
  /** Posts still due that this run didn't reach (a limit, or out of time). */
  waiting: number;
  instagramCalls: number;
  notes: string[];
}

/** What a reading found: numbers, a corrected posting date, or why it couldn't be read. */
type Result = { numbers: Omit<PostCheck, "day" | "checkedAt" | "source">; postedAt?: string } | { problem: string };

export async function runPostChecks(
  db: SupabaseClient,
  opts: { projectId?: string; deadline: number; igCalls?: number; now?: number; fetcher?: Fetcher } = { deadline: Date.now() + 120_000 },
): Promise<PostCheckSummary> {
  const now = opts.now ?? Date.now();
  const today = todayLagos(now);
  const fetcher = opts.fetcher ?? fetch;
  const summary: PostCheckSummary = { checked: 0, problems: 0, waiting: 0, instagramCalls: 0, notes: [] };

  let query = db
    .from("project_posts")
    .select("id, project_id, url, platform, posted_date, checks, last_tried_at, creator_id, creators(handle, platform)")
    .not("creator_id", "is", null)
    .gte("posted_date", addDaysStr(today, -45))
    .limit(2000);
  if (opts.projectId) query = query.eq("project_id", opts.projectId);
  const { data, error } = await query;
  if (error) throw error;

  const due: Due[] = [];
  for (const row of (data ?? []) as unknown as PostRow[]) {
    const day = dueCheckDay({ creatorId: row.creator_id, postedDate: row.posted_date, checks: row.checks ?? [] }, today, row.last_tried_at, now);
    if (day !== null) due.push({ row, day });
  }
  if (due.length === 0) return summary;

  const byPlatform = (p: Platform) => due.filter((d) => (d.row.platform ?? d.row.creators?.platform) === p);
  const save = async (d: Due, r: Result) => {
    const stamp = new Date(now).toISOString();
    if ("problem" in r) {
      summary.problems++;
      await db.from("project_posts").update({ problem: r.problem, last_tried_at: stamp }).eq("id", d.row.id);
      return;
    }
    // A post checked later than planned still counts as the reading for its real age, capped at day 7.
    const posted = r.postedAt ? lagosDate(r.postedAt) : d.row.posted_date!;
    const day = [7, 3, 1].find((x) => x <= postAge(posted, today)) ?? 1;
    const check: PostCheck = { day, checkedAt: stamp, ...r.numbers, source: "auto" };
    const checks = [...(d.row.checks ?? []).filter((c) => c.day !== day), check];
    summary.checked++;
    await db.from("project_posts").update({ checks, problem: null, last_tried_at: stamp, posted_date: posted }).eq("id", d.row.id);
  };

  for (const [platform, run] of [
    ["youtube", () => checkYouTube(byPlatform("youtube"), fetcher, save)],
    ["instagram", () => checkInstagram(db, byPlatform("instagram"), opts.igCalls ?? POST_CHECK_IG_CALLS_PER_RUN, opts.deadline, fetcher, save, summary)],
    ["tiktok", () => checkTikTok(db, byPlatform("tiktok"), now, fetcher, save, summary)],
  ] as const) {
    if (byPlatform(platform).length === 0) continue;
    if (Date.now() > opts.deadline) {
      summary.notes.push("Out of time; the rest are read next hour.");
      break;
    }
    try {
      await run();
    } catch (e) {
      // A whole platform failing (no key, a limit) leaves its posts for the next run.
      summary.notes.push(`${platform}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // Anything due that wasn't tried this run.
  const { data: after } = await db
    .from("project_posts")
    .select("id, last_tried_at")
    .in(
      "id",
      due.map((d) => d.row.id),
    );
  summary.waiting = (after ?? []).filter((r: { last_tried_at: string | null }) => !r.last_tried_at || Date.parse(r.last_tried_at) < now).length;
  return summary;
}

function addDaysStr(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/* ── YouTube ─────────────────────────────────────────────────── */

async function checkYouTube(list: Due[], fetcher: Fetcher, save: (d: Due, r: Result) => Promise<void>) {
  const key = youtubeKeyFromEnv();
  const withId = list.map((d) => ({ d, id: youtubeVideoId(d.row.url) }));
  for (const x of withId.filter((x) => !x.id)) await save(x.d, { problem: "This isn't a YouTube video link we can read." });
  const ok = withId.filter((x): x is { d: Due; id: string } => !!x.id);
  for (let i = 0; i < ok.length; i += 50) {
    const batch = ok.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,snippet");
    url.searchParams.set("id", batch.map((x) => x.id).join(","));
    url.searchParams.set("key", key);
    const res = await fetcher(url, { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as {
      items?: { id: string; snippet?: { publishedAt?: string }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[];
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    if (!res.ok) {
      const reason = body.error?.errors?.[0]?.reason ?? "";
      if (/quota/i.test(reason)) throw new LookupError("quota", "YouTube's daily allowance is used up; the rest are read tomorrow.");
      throw new LookupError("upstream", `YouTube returned an error: ${body.error?.message ?? `HTTP ${res.status}`}`);
    }
    const found = new Map((body.items ?? []).map((v) => [v.id, v]));
    for (const { d, id } of batch) {
      const v = found.get(id);
      if (!v) {
        await save(d, { problem: "YouTube says this video is deleted or private." });
        continue;
      }
      const n = (s?: string) => (s === undefined ? null : Number(s));
      await save(d, {
        numbers: { views: n(v.statistics?.viewCount), likes: n(v.statistics?.likeCount), comments: n(v.statistics?.commentCount), shares: null },
        postedAt: v.snippet?.publishedAt,
      });
    }
  }
}

/* ── Instagram ───────────────────────────────────────────────── */

async function checkInstagram(
  db: SupabaseClient,
  list: Due[],
  maxCalls: number,
  deadline: number,
  fetcher: Fetcher,
  save: (d: Due, r: Result) => Promise<void>,
  summary: PostCheckSummary,
) {
  const config = instagramConfigFromEnv();
  const settings = await loadSettings(db);
  const byCreator = new Map<string, Due[]>();
  for (const d of list) {
    const handle = d.row.creators?.handle;
    if (!handle) continue;
    byCreator.set(handle, [...(byCreator.get(handle) ?? []), d]);
  }
  for (const [handle, posts] of byCreator) {
    if (summary.instagramCalls >= maxCalls) {
      summary.notes.push(`Instagram: read ${maxCalls} creators this run (the safe share of the hourly limit); the rest are read next hour.`);
      return;
    }
    if (Date.now() > deadline) return;
    summary.instagramCalls++;
    let fetched;
    try {
      fetched = await fetchInstagramCreator(handle, config, fetcher);
    } catch (e) {
      if (e instanceof LookupError && (e.code === "not_professional" || e.code === "not_found")) {
        for (const d of posts) await save(d, { problem: `Instagram won't share @${handle}'s posts (a personal or renamed account). Type the numbers in.` });
        continue;
      }
      throw e; // a limit or a token problem: stop Instagram for this run
    }
    // The creator's own numbers came with it, so their profile is refreshed too.
    await saveFetchedCreator(db, fetched, settings, null).catch(() => undefined);
    const byCode = new Map(fetched.posts.map((p) => [instagramShortcode(p.url), p]));
    for (const d of posts) {
      const code = instagramShortcode(d.row.url);
      const p = code ? byCode.get(code) : undefined;
      if (!code) await save(d, { problem: "This isn't an Instagram post link we can read." });
      else if (!p)
        await save(d, {
          problem: `Not among @${handle}'s ${IG_MEDIA_LIMIT} latest posts (or it was deleted), so Instagram's API can't read it. Type the numbers in.`,
        });
      else await save(d, { numbers: { views: p.views, likes: p.likes, comments: p.comments, shares: null }, postedAt: p.postedAt });
    }
  }
}

/* ── TikTok ──────────────────────────────────────────────────── */

async function checkTikTok(
  db: SupabaseClient,
  list: Due[],
  now: number,
  fetcher: Fetcher,
  save: (d: Due, r: Result) => Promise<void>,
  summary: PostCheckSummary,
) {
  const limit = tiktokPostCheckLimit();
  const used = await tiktokChecksThisMonth(db, now);
  const room = Math.max(0, Math.min(limit - used, TIKTOK_POSTS_PER_RUN));
  if (room === 0) {
    summary.notes.push(`TikTok: this month's ${limit} post checks are used up; they reset on the 1st. Type numbers in meanwhile.`);
    return;
  }
  const batch = list.slice(0, room);
  if (list.length > room) summary.notes.push(`TikTok: ${list.length - room} posts wait for the next run or next month's allowance.`);
  const token = apifyTokenFromEnv();

  // Short links (vm.tiktok.com) are opened first to find the video they point to.
  const targets: { d: Due; url: string; id: string | null }[] = [];
  for (const d of batch) {
    let url = d.row.url;
    if (isShortTikTokLink(url)) {
      try {
        const res = await fetcher(url, { redirect: "follow", cache: "no-store" });
        url = res.url || url;
      } catch {
        // Left as is; Apify may still open it.
      }
    }
    targets.push({ d, url, id: tiktokVideoId(url) });
  }

  const run = new URL("https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items");
  run.searchParams.set("timeout", "150");
  run.searchParams.set("maxTotalChargeUsd", "0.5");
  run.searchParams.set("maxItems", String(targets.length + 5));
  const res = await fetcher(run, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      postURLs: targets.map((t) => t.url),
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
      shouldDownloadSlideshowImages: false,
    }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as (ApifyTikTokItem & { shareCount?: number })[] | { error?: { type?: string; message?: string } } | null;
  if (!res.ok || !Array.isArray(body)) throw mapApifyError(res.status, body && !Array.isArray(body) ? body.error : undefined);

  const byId = new Map(body.filter((i) => i.id && !i.errorCode).map((i) => [String(i.id), i]));
  for (const t of targets) {
    const item = t.id ? byId.get(t.id) : undefined;
    if (!item) {
      await save(t.d, { problem: "TikTok didn't return this video (deleted, private or a broken link). Type the numbers in." });
      continue;
    }
    await save(t.d, {
      numbers: {
        views: typeof item.playCount === "number" ? item.playCount : null,
        likes: typeof item.diggCount === "number" ? item.diggCount : null,
        comments: item.commentCount ?? null,
        shares: typeof item.shareCount === "number" ? item.shareCount : null,
      },
      postedAt: item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined),
    });
  }
}

/** Automatic TikTok readings saved since the 1st of this month (UTC). */
async function tiktokChecksThisMonth(db: SupabaseClient, now: number): Promise<number> {
  const d = new Date(now);
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const { data, error } = await db.from("project_posts").select("checks").eq("platform", "tiktok").gte("last_tried_at", monthStart).limit(5000);
  if (error) throw error;
  return (data ?? []).reduce(
    (n: number, r: { checks: PostCheck[] | null }) => n + (r.checks ?? []).filter((c) => c.source === "auto" && c.checkedAt >= monthStart).length,
    0,
  );
}
