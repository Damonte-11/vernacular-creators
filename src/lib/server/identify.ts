import "server-only";
/**
 * Working out who posted a link when they aren't booked on the project yet:
 * from the handle in the link, the video's channel (YouTube), or the handle
 * written in the sheet. Saved creators come from the database; anyone new is
 * looked up on their platform and saved, within a per-run allowance.
 *
 * Only sure identities are used. A handle typed in the sheet (not in the link)
 * is accepted for a new Instagram creator only if the post is among their
 * latest posts, so a typo can't attach someone else.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { instagramShortcode, youtubeVideoId } from "../post-links";
import { handleInUrl } from "../projects";
import type { Creator, Platform, Settings } from "../types";
import { LookupError } from "./errors";
import type { Fetcher } from "./fetched";
import { assertTikTokAllowance, fetchFromPlatform } from "./lookup-service";
import { CREATOR_SELECT, creatorFromRow, type CreatorRow } from "../supabase/mappers";
import { findCreator, saveFetchedCreator } from "./repository";
import { youtubeKeyFromEnv } from "./youtube";

/** New-creator lookups allowed in one sync, per platform (Instagram's hourly limit, TikTok's cost). */
export interface LookupBudget {
  instagram: number;
  tiktok: number;
  youtube: number;
  deadline: number;
}

/** Hourly runs stay small; a "Sync now" someone clicked can do more (it has up to 5 minutes). */
export function defaultBudget(manual = false): LookupBudget {
  return manual
    ? { instagram: 30, tiktok: 3, youtube: 50, deadline: Date.now() + 200_000 }
    : { instagram: 10, tiktok: 1, youtube: 20, deadline: Date.now() + 45_000 };
}

export interface Identified {
  creator: Creator | null;
  /** How they were found, or why not, in words for the team. */
  note: string;
  /** True when they were looked up on the platform and saved just now. */
  added?: boolean;
}

const USERNAME = /^[A-Za-z0-9._]{2,30}$/;

/**
 * A handle as people write it in a sheet: "@Kemi.Cooks ", "kemi.cooks",
 * a profile link (instagram.com/kemi.cooks, tiktok.com/@kemi.cooks), or
 * several platforms in one cell ("IG: @kemi / TT: @kemi.cooks"), in which case
 * the one for this platform is used.
 */
export function cleanHandle(s: string, platform: Platform | null = null): string | null {
  const text = s.trim();
  if (!text) return null;
  // A profile link.
  const link =
    text.match(/instagram\.com\/([A-Za-z0-9._]{2,30})(?:[/?#]|$)/i)?.[1] ??
    text.match(/tiktok\.com\/@([A-Za-z0-9._]{2,30})/i)?.[1] ??
    text.match(/youtube\.com\/@([A-Za-z0-9._-]{2,30})/i)?.[1];
  if (link && !["p", "reel", "reels", "tv", "stories", "explore"].includes(link.toLowerCase())) return link;
  // Several platforms in one cell: take the part labelled for this one.
  if (platform) {
    const label = { instagram: "(?:ig|insta(?:gram)?)", tiktok: "(?:tt|tik\\s*tok)", youtube: "(?:yt|you\\s*tube)" }[platform];
    const m = text.match(new RegExp(`\\b${label}\\s*[:\\-]?\\s*@?([A-Za-z0-9._]{2,30})`, "i"));
    if (m) return m[1];
  }
  // Otherwise the first thing that looks like a username, preferring one written with @.
  const at = text.match(/@([A-Za-z0-9._]{2,30})/)?.[1];
  if (at) return at.replace(/\.+$/, "");
  // Words with spaces are a name, not a handle.
  if (/\s/.test(text)) return null;
  return USERNAME.test(text) ? text : null;
}

export async function identifyCreator(
  db: SupabaseClient,
  row: { url: string; platform: Platform | null; handle: string; name?: string },
  settings: Settings,
  budget: LookupBudget,
  fetcher: Fetcher = fetch,
): Promise<Identified> {
  const platform = row.platform;
  if (!platform) return { creator: null, note: "Couldn't tell which platform the link is on." };

  // YouTube: the video says which channel posted it.
  if (platform === "youtube") {
    const vid = youtubeVideoId(row.url);
    const channelId = vid ? await youtubeChannelOf(vid, fetcher) : null;
    if (!channelId) return { creator: null, note: "YouTube didn't say which channel posted this video." };
    const saved = await findCreator(db, "youtube", channelId);
    if (saved) return { creator: saved, note: "Found in the database from the video's channel." };
    if (budget.youtube <= 0 || Date.now() > budget.deadline) return { creator: null, note: "Waiting to look the channel up (next sync)." };
    budget.youtube--;
    return lookUp(db, "youtube", channelId, settings, "the video's channel");
  }

  const fromLink = handleInUrl(row.url);
  const fromSheet = cleanHandle(row.handle, platform);
  const handle = fromLink ?? fromSheet;
  // No handle anywhere: a full name that matches exactly one saved creator on this platform is enough.
  if (!handle && row.name && /\s/.test(row.name.trim())) {
    const byName = await findByExactName(db, platform, row.name);
    if (byName) return { creator: byName, note: "Found in the database by the full name in the sheet." };
  }
  if (!handle)
    return {
      creator: null,
      note: row.handle ? `"${row.handle}" isn't a handle that can be looked up.` : "The sheet has no handle for this link, only a name.",
    };
  const where = fromLink ? "the handle in the link" : "the handle in the sheet";

  const saved = await findCreator(db, platform, handle);
  if (saved) return { creator: saved, note: `Found in the database from ${where}.` };

  if (Date.now() > budget.deadline) return { creator: null, note: "Waiting to be looked up (next sync)." };
  if (platform === "instagram") {
    if (budget.instagram <= 0) return { creator: null, note: "Waiting to be looked up on Instagram (next sync)." };
    budget.instagram--;
    let fetched;
    try {
      fetched = await fetchFromPlatform("instagram", handle, 1);
    } catch (e) {
      return { creator: null, note: lookupProblem(e, handle, "Instagram") };
    }
    // A typed handle could be a typo for someone else: only trust it if this post is theirs.
    if (!fromLink) {
      const code = instagramShortcode(row.url);
      if (!code || !fetched.posts.some((p) => instagramShortcode(p.url) === code)) {
        return {
          creator: null,
          note: `Found @${fetched.handle} on Instagram, but this post isn't among their latest posts, so they weren't added automatically.`,
        };
      }
    }
    return {
      creator: await saveFetchedCreator(db, fetched, settings, null),
      note: `Looked up on Instagram from ${where} and added to the database.`,
      added: true,
    };
  }

  // TikTok: costs Apify credit, so few per run and within the monthly allowance.
  if (budget.tiktok <= 0) return { creator: null, note: "Waiting to be looked up on TikTok (next sync)." };
  budget.tiktok--;
  try {
    await assertTikTokAllowance(db);
  } catch (e) {
    return { creator: null, note: e instanceof Error ? e.message : String(e) };
  }
  return lookUp(db, "tiktok", handle, settings, where);
}

async function lookUp(db: SupabaseClient, platform: Platform, handleOrId: string, settings: Settings, where: string): Promise<Identified> {
  try {
    const fetched = await fetchFromPlatform(platform, handleOrId, 1);
    const name = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" }[platform];
    return {
      creator: await saveFetchedCreator(db, fetched, settings, null),
      note: `Looked up on ${name} from ${where} and added to the database.`,
      added: true,
    };
  } catch (e) {
    return { creator: null, note: lookupProblem(e, handleOrId, platform) };
  }
}

function lookupProblem(e: unknown, handle: string, platform: string): string {
  if (e instanceof LookupError) {
    if (e.code === "not_found" || e.code === "not_professional") return `Couldn't find @${handle} on ${platform}: ${e.message}`;
    if (e.code === "rate_limited") return `${platform} asked us to slow down; trying again next sync.`;
    return e.message;
  }
  return `The ${platform} lookup failed; trying again next sync.`;
}

/** The one saved creator on this platform whose name is exactly this (ignoring case and punctuation), if only one is. */
async function findByExactName(db: SupabaseClient, platform: Platform, name: string): Promise<Creator | null> {
  const words = name
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return null;
  const { data, error } = await db
    .from("creators")
    .select("id")
    .eq("platform", platform)
    .ilike("name", `%${words.join("%")}%`)
    .limit(5);
  if (error || !data) return null;
  const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const ids = (data as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return null;
  const { data: full } = await db.from("creators").select(CREATOR_SELECT).in("id", ids);
  const exact = ((full ?? []) as CreatorRow[]).map(creatorFromRow).filter((c) => squash(c.name) === squash(name));
  return exact.length === 1 ? exact[0] : null;
}

async function youtubeChannelOf(videoId: string, fetcher: Fetcher): Promise<string | null> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", youtubeKeyFromEnv());
    const res = await fetcher(url, { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { items?: { snippet?: { channelId?: string } }[] };
    return body.items?.[0]?.snippet?.channelId ?? null;
  } catch {
    return null;
  }
}
