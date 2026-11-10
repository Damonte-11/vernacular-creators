import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REVIEW_EXPIRY_DAYS, REVIEW_PER_RUN, YOUTUBE_SEARCHES_PER_RUN } from "@config/discovery";
import { bioMentions } from "../discover";
import { decide, mentionedHandles, searchQueries, sourceLabel } from "../discovery-rules";
import { analyzeCreator } from "../analyze";
import type { Creator, Platform } from "../types";
import { LookupError } from "./errors";
import type { FetchedCreator } from "./fetched";
import { fetchFromPlatform } from "./lookup-service";
import { loadSettings, saveFetchedCreator } from "./repository";
import { searchYouTubeChannels } from "./youtube";

type Source = { kind: "mention"; by: string; platform: Platform } | { kind: "search"; query: string };
interface Candidate {
  platform: Platform;
  /** Handle, or a YouTube channel ID from search. */
  lookup: string;
  source: Source;
  /** How many saved creators mention this account. */
  mentions: number;
}

export interface DiscoverySummary {
  checked: number;
  added: number;
  review: number;
  skipped: number;
  /** Why the run stopped early, if it did. */
  stopped: string | null;
  expired: number;
}

const DAY = 86_400_000;

/**
 * One discovery run: find accounts that saved creators tag, plus YouTube
 * search results for Nigerian niches, then check each and add, queue or skip
 * it by the rules in discovery-rules.ts. Only Instagram and YouTube are
 * checked (free); TikTok would use paid Apify credit.
 */
export async function runDiscovery(db: SupabaseClient, deadline: number, now = Date.now()): Promise<DiscoverySummary> {
  const settings = await loadSettings(db);
  const cfg = settings.discovery;
  const summary: DiscoverySummary = { checked: 0, added: 0, review: 0, skipped: 0, stopped: null, expired: 0 };

  // "Worth a look" items nobody acted on are ignored after a while, so the pile never grows.
  const { data: expired } = await db
    .from("discovery_candidates")
    .update({ status: "ignored", reason: `Not reviewed within ${REVIEW_EXPIRY_DAYS} days`, decided_at: new Date(now).toISOString() })
    .eq("status", "review")
    .lt("created_at", new Date(now - REVIEW_EXPIRY_DAYS * DAY).toISOString())
    .select("id");
  summary.expired = expired?.length ?? 0;

  // Everything already saved or already looked at is never checked again.
  const creators = await selectAll<{ platform: string; handle: string; platform_id: string; bio: string; posts: { caption: string }[] | null }>(db, "creators", "platform, handle, platform_id, bio, posts(caption)");
  const seenRows = await selectAll<{ platform: string; handle: string; platform_id: string | null }>(db, "discovery_candidates", "platform, handle, platform_id");
  const known = new Set<string>();
  for (const c of [...creators, ...seenRows]) {
    known.add(`${c.platform}:${String(c.handle).toLowerCase()}`);
    if (c.platform_id) known.add(`${c.platform}:id:${c.platform_id}`);
  }

  // 1. Accounts that saved creators tag in captions or name in their bio.
  const mentioned = new Map<string, Candidate>();
  for (const c of creators) {
    if (c.platform === "tiktok") continue; // checking TikTok accounts costs Apify credit
    const own = c.platform as Platform;
    const texts = [c.bio ?? "", ...(c.posts ?? []).map((p) => p.caption ?? "")];
    const found: { platform: Platform; handle: string }[] = texts.flatMap((t) => mentionedHandles(t, c.handle).map((h) => ({ platform: own, handle: h })));
    for (const m of bioMentions(c.bio ?? "", own)) if (m.platform !== "tiktok") found.push({ platform: m.platform, handle: m.handle.toLowerCase() });
    for (const f of found) {
      const key = `${f.platform}:${f.handle}`;
      if (known.has(key)) continue;
      const cand = mentioned.get(key) ?? { platform: f.platform, lookup: f.handle, source: { kind: "mention", by: c.handle, platform: own }, mentions: 0 };
      cand.mentions++;
      mentioned.set(key, cand);
    }
  }
  const queue: Candidate[] = [...mentioned.values()].sort((a, b) => b.mentions - a.mentions);

  // 2. YouTube channels for Nigerian niche searches, rotating through niche × city pairs.
  if (process.env.YOUTUBE_API_KEY) {
    for (const query of searchQueries(cfg, YOUTUBE_SEARCHES_PER_RUN, Math.floor(now / DAY))) {
      try {
        for (const id of await searchYouTubeChannels(query, process.env.YOUTUBE_API_KEY)) {
          if (!known.has(`youtube:id:${id}`)) queue.push({ platform: "youtube", lookup: id, source: { kind: "search", query }, mentions: 0 });
          known.add(`youtube:id:${id}`);
        }
      } catch (e) {
        if (e instanceof LookupError && (e.code === "quota" || e.code === "auth" || e.code === "config")) break;
        throw e;
      }
    }
  }

  // 3. Check each, until the daily limit, the check limit or the time runs out.
  const maxChecks = Math.min(cfg.dailyLimit * 4, 200);
  const stoppedPlatforms = new Set<Platform>();
  for (const cand of queue) {
    if (summary.added >= cfg.dailyLimit) {
      summary.stopped = `Daily limit of ${cfg.dailyLimit} reached`;
      break;
    }
    if (summary.checked >= maxChecks) {
      summary.stopped = `Checked ${maxChecks} accounts (the most per run)`;
      break;
    }
    if (Date.now() > deadline) {
      summary.stopped = "Out of time for this run; it carries on next time";
      break;
    }
    if (stoppedPlatforms.has(cand.platform)) continue;

    let f: FetchedCreator;
    summary.checked++;
    try {
      f = await fetchFromPlatform(cand.platform, cand.lookup, 1);
    } catch (e) {
      if (e instanceof LookupError && ["not_found", "not_professional", "hidden_subscribers"].includes(e.code)) {
        await record(db, cand, "skipped", e.code === "hidden_subscribers" ? "Hides subscriber count" : "Personal, private or not found");
        summary.skipped++;
      } else if (e instanceof LookupError) {
        // Limits or keys: stop that platform for this run and try these accounts again next time.
        stoppedPlatforms.add(cand.platform);
        summary.checked--;
        summary.stopped = `${cand.platform}: ${e.message}`;
      } else throw e;
      continue;
    }
    if (known.has(`${f.platform}:id:${f.platformId}`) || known.has(`${f.platform}:${f.handle.toLowerCase()}`)) continue;
    known.add(`${f.platform}:id:${f.platformId}`);
    // Never touch a creator the team already has, even if the lists above missed them.
    const { data: existing } = await db.from("creators").select("id").eq("platform", f.platform).eq("platform_id", f.platformId).maybeSingle();
    if (existing) continue;

    const lastPostAt = f.posts.reduce<string | null>((m, p) => (!m || p.postedAt > m ? p.postedAt : m), null);
    const facts = { name: f.name, bio: f.bio, followers: f.followers, country: f.country, lastPostAt };
    // Being tagged by a creator in our (Nigerian) database, or found by a Nigeria search, is a weak link on its own.
    // Score it with the same maths as every profile, so only good creators get in.
    const a = analyzeCreator(asCreator(f, now), settings, now);
    const quality = {
      score: a.score.total,
      engagementLabel: a.metrics.engagementLabel,
      highFlags: a.flags.filter((x) => x.severity === "high").map((x) => x.message),
    };
    const d = decide(facts, cfg, true, now, quality);
    const via = sourceLabel(cand.source);

    if (d.decision === "add") {
      const saved = await saveFetchedCreator(db, f, settings, null);
      await db.from("creators").update({ discovered_via: via, discovered_at: new Date(now).toISOString() }).eq("id", saved.id);
      await record(db, cand, "added", d.reason, f, lastPostAt, saved.id);
      summary.added++;
    } else if (d.decision === "review") {
      if (summary.review >= REVIEW_PER_RUN) continue; // not recorded, so it can come up another day
      await record(db, cand, "review", d.reason, f, lastPostAt);
      summary.review++;
    } else {
      await record(db, cand, "skipped", d.reason, f, lastPostAt);
      summary.skipped++;
    }
  }
  return summary;
}

/** A fetched profile shaped like a saved creator, so it can be scored before saving. */
function asCreator(f: FetchedCreator, now: number): Creator {
  const at = new Date(now).toISOString();
  return {
    id: `discovery-${f.platform}-${f.platformId}`,
    platform: f.platform,
    platformId: f.platformId,
    handle: f.handle,
    name: f.name,
    photoUrl: f.photoUrl,
    bio: f.bio,
    niche: null,
    city: null,
    country: "Nigeria",
    followers: f.followers,
    mediaCount: f.mediaCount,
    accountType: f.accountType,
    verified: false,
    lastFetchedAt: at,
    notes: "",
    tags: [],
    posts: f.posts.map((p) => ({ ...p, id: `${f.platformId}-${p.platformPostId}` })),
    snapshots: [{ followers: f.followers, capturedAt: at }],
    isSample: false,
  };
}

/** Every row of a table, 1,000 at a time (Supabase returns at most 1,000 per request). */
async function selectAll<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

async function record(
  db: SupabaseClient,
  cand: Candidate,
  status: "added" | "review" | "skipped",
  reason: string,
  f?: FetchedCreator,
  lastPostAt?: string | null,
  creatorId?: string,
) {
  const { error } = await db.from("discovery_candidates").insert({
    platform: f?.platform ?? cand.platform,
    handle: f?.handle ?? cand.lookup,
    platform_id: f?.platformId ?? null,
    status,
    source: sourceLabel(cand.source),
    reason,
    name: f?.name ?? "",
    photo_url: f?.photoUrl ?? null,
    bio: (f?.bio ?? "").slice(0, 500),
    followers: f?.followers ?? null,
    last_post_at: lastPostAt ?? null,
    creator_id: creatorId ?? null,
    decided_at: status === "review" ? null : new Date().toISOString(),
  });
  // Already recorded by an earlier run: fine.
  if (error && error.code !== "23505") throw error;
}

/** Adds a "Worth a look" account the team approved. */
export async function addCandidate(db: SupabaseClient, id: number, userId: string): Promise<string> {
  const { data: cand, error } = await db.from("discovery_candidates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!cand) throw new LookupError("not_found", "This suggestion no longer exists.");
  if (cand.creator_id) return cand.creator_id as string;
  const settings = await loadSettings(db);
  // YouTube looks up by channel ID; Instagram only by username.
  const lookup = cand.platform === "youtube" && cand.platform_id ? (cand.platform_id as string) : (cand.handle as string);
  const f = await fetchFromPlatform(cand.platform as Platform, lookup, 1);
  const saved = await saveFetchedCreator(db, f, settings, userId);
  await db.from("creators").update({ discovered_via: cand.source, discovered_at: new Date().toISOString() }).eq("id", saved.id);
  await db.from("discovery_candidates").update({ status: "added", creator_id: saved.id, decided_at: new Date().toISOString() }).eq("id", id);
  return saved.id;
}
