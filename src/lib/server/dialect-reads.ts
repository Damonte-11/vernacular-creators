import "server-only";
/**
 * Numbers for Dialect posts (the brand's own pages):
 * - a new post is read within the hour,
 * - this month's posts are read again every 7 days,
 * - on the 1st (to the 3rd, in case a run is missed) last month's posts get a
 *   final read, which the month's report uses.
 * Follower counts are read with them. A post far above the page's usual is
 * flagged as a possible ad and held back until a manager decides.
 *
 * Instagram: Business Discovery on the brand's account (its latest posts).
 * TikTok and X: one Apify run each. YouTube: videos.list.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, isPossibleAd, monthOf, type DialectPlatform, type DialectPost, type DialectProject } from "../dialect";
import { DIALECT_SELECT, dialectProjectFromRow, type DialectPostRow, type DialectProjectRow } from "../dialect-rows";
import { instagramShortcode, youtubeVideoId } from "../post-links";
import { normaliseUrl, todayLagos } from "../projects";
import type { Fetcher } from "./fetched";
import { fetchInstagramCreator, IG_MEDIA_LIMIT, instagramConfigFromEnv } from "./instagram";
import { apifyPosts } from "./post-checks";
import { resolveTikTok } from "./tiktok-oembed";
import { readXPosts, tweetId } from "./x-posts";
import { youtubeKeyFromEnv } from "./youtube";

const WEEK = 7 * 86_400_000;
/** Posts per platform per project per run, so one run stays within its time and Apify's cap. */
const PER_RUN = 80;

export interface DialectReadSummary {
  read: number;
  problems: number;
  flagged: number;
  notes: string[];
  message: string;
}

type Numbers = Partial<Pick<DialectPost, "views" | "likes" | "comments" | "shares" | "saves">> & { postedAt?: string | null; caption?: string | null };
type Outcome = { numbers: Numbers } | { problem: string };

/** Which of a project's posts are due a read now. */
export function duePosts(p: DialectProject, now: number, opts: { force?: boolean; postId?: string } = {}): DialectPost[] {
  if (opts.postId) return p.posts.filter((x) => x.id === opts.postId);
  const today = todayLagos(now);
  const month = monthOf(today);
  const last = addMonths(month, -1);
  const finalWindow = Number(today.slice(8, 10)) <= 3;
  const monthStart = Date.parse(`${month}-01T00:00:00+01:00`);
  return p.posts.filter((x) => {
    const read = x.lastReadAt ? Date.parse(x.lastReadAt) : null;
    if (read === null) return true;
    const m = monthOf(x.postedAt);
    if (opts.force) return m === month || (finalWindow && m === last);
    if (m === month) return now - read >= WEEK;
    if (m === last && finalWindow) return read < monthStart;
    return false;
  });
}

export async function readDialectNumbers(
  db: SupabaseClient,
  opts: { projectId?: string; postId?: string; force?: boolean; deadline: number; now?: number; fetcher?: Fetcher },
): Promise<DialectReadSummary> {
  const now = opts.now ?? Date.now();
  const fetcher = opts.fetcher ?? fetch;
  const summary: DialectReadSummary = { read: 0, problems: 0, flagged: 0, notes: [], message: "" };
  let q = db.from("dialect_projects").select(DIALECT_SELECT);
  if (opts.projectId) q = q.eq("id", opts.projectId);
  const { data, error } = await q;
  if (error) throw error;

  for (const p of (data as DialectProjectRow[]).map(dialectProjectFromRow)) {
    const due = duePosts(p, now, opts);
    if (due.length === 0) continue;
    const followers: DialectProject["followerReads"] = [];
    const stamp = new Date(now).toISOString();
    const save = async (x: DialectPost, o: Outcome) => {
      if ("problem" in o) {
        summary.problems++;
        await db.from("dialect_posts").update({ read_problem: o.problem, last_read_at: stamp }).eq("id", x.id);
        return;
      }
      const n = o.numbers;
      const patch: Partial<DialectPostRow> = { read_problem: null, last_read_at: stamp };
      // Numbers typed in by hand stay unless the platform now gives them.
      for (const k of ["views", "likes", "comments", "shares", "saves"] as const) if (typeof n[k] === "number") patch[k] = n[k] as number;
      if (n.postedAt) patch.posted_at = n.postedAt;
      if (n.caption) patch.caption = n.caption.slice(0, 2200);
      if ((!x.title || x.title === "New post") && n.caption) patch.title = n.caption.split("\n")[0].slice(0, 70);
      // Far above the page's usual (or over the set line): held back as a possible ad until someone decides.
      const updated: DialectPost = { ...x, views: patch.views ?? x.views };
      if (!x.possibleAd && !x.decision && isPossibleAd(p, updated)) {
        patch.possible_ad = true;
        summary.flagged++;
      }
      summary.read++;
      await db.from("dialect_posts").update(patch).eq("id", x.id);
    };
    const handle = (pl: DialectPlatform) => p.platforms.find((x) => x.platform === pl)?.handle?.replace(/^@/, "") ?? null;

    for (const platform of ["instagram", "tiktok", "x", "youtube"] as const) {
      const list = due.filter((x) => x.platform === platform).slice(0, PER_RUN);
      if (list.length === 0) continue;
      if (Date.now() > opts.deadline) {
        summary.notes.push("Out of time; the rest are read next hour.");
        break;
      }
      try {
        if (platform === "instagram") await readInstagram(list, handle("instagram"), fetcher, save, followers, stamp);
        if (platform === "tiktok") await readTikTok(list, handle("tiktok"), fetcher, save, followers, stamp);
        if (platform === "x") await readX(list, fetcher, save, followers, stamp);
        if (platform === "youtube") await readYouTube(list, fetcher, save);
      } catch (e) {
        // A whole platform failing (no key, a limit) leaves its posts for the next run.
        summary.notes.push(`${p.brand}, ${platform}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (followers.length) {
      const reads = [...p.followerReads, ...followers].slice(-500);
      await db.from("dialect_projects").update({ follower_reads: reads }).eq("id", p.id);
    }
  }
  const parts = [`Read ${summary.read} ${summary.read === 1 ? "post" : "posts"}`];
  if (summary.problems) parts.push(`${summary.problems} couldn't be read (the reason is on each post)`);
  if (summary.flagged) parts.push(`${summary.flagged} flagged as a possible ad`);
  summary.message = `${parts.join(", ")}.${summary.notes.length ? ` ${summary.notes.join(" ")}` : ""}`;
  return summary;
}

type Save = (x: DialectPost, o: Outcome) => Promise<void>;

async function readInstagram(
  list: DialectPost[],
  handle: string | null,
  fetcher: Fetcher,
  save: Save,
  followers: DialectProject["followerReads"],
  stamp: string,
) {
  if (!handle) {
    for (const x of list) await save(x, { problem: "Add the brand's Instagram handle in Targets and settings." });
    return;
  }
  const fetched = await fetchInstagramCreator(handle, instagramConfigFromEnv(), fetcher);
  followers.push({ at: stamp, platform: "instagram", followers: fetched.followers });
  const byCode = new Map(fetched.posts.map((x) => [instagramShortcode(x.url), x]));
  for (const x of list) {
    const code = instagramShortcode(x.url);
    const found = code ? byCode.get(code) : undefined;
    if (!code) await save(x, { problem: "This isn't an Instagram post link we can read." });
    else if (!found)
      await save(x, {
        problem: x.lastReadAt
          ? `No longer among @${handle}'s ${IG_MEDIA_LIMIT} latest posts; its last numbers are kept.`
          : `Not among @${handle}'s ${IG_MEDIA_LIMIT} latest posts (or not this brand's), so Instagram can't read it. Type the numbers in.`,
      });
    else await save(x, { numbers: { views: found.views, likes: found.likes, comments: found.comments, postedAt: found.postedAt, caption: found.caption } });
  }
}

async function readTikTok(list: DialectPost[], handle: string | null, fetcher: Fetcher, save: Save, followers: DialectProject["followerReads"], stamp: string) {
  const targets: { x: DialectPost; url: string; id: string | null }[] = [];
  for (const x of list) {
    const ref = await resolveTikTok(x.url, fetcher);
    targets.push({ x, url: ref?.url ?? x.url, id: ref?.id ?? null });
  }
  type Item = Awaited<ReturnType<typeof apifyPosts>>[number] & { collectCount?: number };
  const items = (await apifyPosts(
    targets.map((t) => t.url),
    fetcher,
  )) as Item[];
  const ok = items.filter((i) => i.id && !i.errorCode);
  const fans = ok.find((i) => !handle || i.authorMeta?.name?.toLowerCase() === handle.toLowerCase())?.authorMeta?.fans;
  if (typeof fans === "number") followers.push({ at: stamp, platform: "tiktok", followers: fans });
  for (const t of targets) {
    const item =
      (t.id && ok.find((i) => String(i.id) === t.id)) ||
      ok.find((i) => {
        const asked = i.submittedVideoUrl ?? i.inputUrl;
        return asked && normaliseUrl(asked) === normaliseUrl(t.url);
      });
    if (!item) {
      await save(t.x, { problem: "TikTok didn't return this post (deleted, private or a broken link)." });
      continue;
    }
    await save(t.x, {
      numbers: {
        views: item.playCount ?? null,
        likes: item.diggCount ?? null,
        comments: item.commentCount ?? null,
        shares: item.shareCount ?? null,
        saves: typeof item.collectCount === "number" ? item.collectCount : null,
        postedAt: item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : null),
        caption: item.text ?? null,
      },
    });
  }
}

async function readX(list: DialectPost[], fetcher: Fetcher, save: Save, followers: DialectProject["followerReads"], stamp: string) {
  const withId = list.map((x) => ({ x, id: tweetId(x.url) }));
  for (const w of withId.filter((w) => !w.id)) await save(w.x, { problem: "This isn't an X post link we can read." });
  const items = await readXPosts(
    withId.filter((w) => w.id).map((w) => w.x.url),
    fetcher,
  );
  const f = items.find((i) => i.authorFollowers !== null)?.authorFollowers;
  if (typeof f === "number") followers.push({ at: stamp, platform: "x", followers: f });
  for (const w of withId.filter((w) => w.id)) {
    const i = items.find((t) => t.id === w.id);
    if (!i) {
      await save(w.x, { problem: "X didn't return this post (deleted, private or a broken link)." });
      continue;
    }
    await save(w.x, {
      numbers: {
        views: i.views,
        likes: i.likes,
        comments: i.replies,
        shares: i.reposts === null && i.quotes === null ? null : (i.reposts ?? 0) + (i.quotes ?? 0),
        saves: i.bookmarks,
        postedAt: i.postedAt,
        caption: i.text,
      },
    });
  }
}

async function readYouTube(list: DialectPost[], fetcher: Fetcher, save: Save) {
  const key = youtubeKeyFromEnv();
  const withId = list.map((x) => ({ x, id: youtubeVideoId(x.url) }));
  for (const w of withId.filter((w) => !w.id)) await save(w.x, { problem: "This isn't a YouTube video link we can read." });
  const ok = withId.filter((w): w is { x: DialectPost; id: string } => !!w.id);
  for (let i = 0; i < ok.length; i += 50) {
    const batch = ok.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,snippet");
    url.searchParams.set("id", batch.map((w) => w.id).join(","));
    url.searchParams.set("key", key);
    const res = await fetcher(url, { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as {
      items?: {
        id: string;
        snippet?: { publishedAt?: string; title?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      }[];
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`YouTube returned an error: ${body.error?.message ?? `HTTP ${res.status}`}`);
    const found = new Map((body.items ?? []).map((v) => [v.id, v]));
    for (const w of batch) {
      const v = found.get(w.id);
      const num = (s?: string) => (s === undefined ? null : Number(s));
      if (!v) await save(w.x, { problem: "YouTube says this video is deleted or private." });
      else
        await save(w.x, {
          numbers: {
            views: num(v.statistics?.viewCount),
            likes: num(v.statistics?.likeCount),
            comments: num(v.statistics?.commentCount),
            postedAt: v.snippet?.publishedAt ?? null,
            caption: v.snippet?.title ?? null,
          },
        });
    }
  }
}
