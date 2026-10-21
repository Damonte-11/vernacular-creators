import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeCreator } from "../analyze";
import { computeMetrics } from "../metrics";
import {
  campaignResultFromRow,
  CREATOR_SELECT,
  creatorFromRow,
  settingsFromRow,
  shortlistFromRow,
  SHORTLIST_SELECT,
  type CampaignResultRow,
  type CreatorRow,
  type SettingsRow,
  type ShortlistRow,
} from "../supabase/mappers";
import type { Creator, CreatorAnalysis, Platform, Settings, Shortlist } from "../types";
import type { FetchedCreator } from "./fetched";

const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
};

export async function loadSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db.from("settings").select("*").eq("id", 1).maybeSingle<SettingsRow>();
  if (error) throw error;
  return settingsFromRow(data);
}

export async function getCreator(db: SupabaseClient, id: string): Promise<Creator | null> {
  const { data, error } = await db.from("creators").select(CREATOR_SELECT).eq("id", id).maybeSingle<CreatorRow>();
  if (error) throw error;
  return data ? creatorFromRow(data) : null;
}

/** Finds a saved creator by handle (handles are saved in lowercase) or, for YouTube, by channel ID. */
export async function findCreator(db: SupabaseClient, platform: Platform, handleOrId: string): Promise<Creator | null> {
  const { data, error } = await db
    .from("creators")
    .select(CREATOR_SELECT)
    .eq("platform", platform)
    .or(`handle.eq.${quote(handleOrId.toLowerCase())},platform_id.eq.${quote(handleOrId)}`)
    .limit(1)
    .maybeSingle<CreatorRow>();
  if (error) throw error;
  return data ? creatorFromRow(data) : null;
}

/**
 * Saves fresh API data: profile, latest posts, a follower snapshot, and the
 * score and flags at this moment. Team-entered fields (niche, city, notes,
 * tags) are never overwritten.
 */
export async function saveFetchedCreator(
  db: SupabaseClient,
  f: FetchedCreator,
  settings: Settings,
  userId: string | null,
): Promise<Creator> {
  const now = new Date().toISOString();
  const profile = {
    platform: f.platform,
    platform_id: f.platformId,
    handle: f.handle.toLowerCase(),
    name: f.name,
    photo_url: f.photoUrl,
    bio: f.bio,
    followers: f.followers,
    media_count: f.mediaCount,
    account_type: f.accountType,
    last_fetched_at: now,
  };

  const { data: existing } = await db
    .from("creators")
    .select("id, country")
    .eq("platform", f.platform)
    .eq("platform_id", f.platformId)
    .maybeSingle<{ id: string; country: string }>();

  let id: string;
  if (existing) {
    id = existing.id;
    const { error } = await db.from("creators").update(profile).eq("id", id);
    if (error) throw error;
  } else {
    const country = f.country ? (COUNTRY_NAMES[f.country] ?? f.country) : "Nigeria";
    const { data, error } = await db
      .from("creators")
      .insert({ ...profile, country, created_by: userId })
      .select("id")
      .single<{ id: string }>();
    if (error?.code === "23505") {
      // Someone else saved this creator a moment ago: update theirs instead.
      const { data: other, error: findError } = await db
        .from("creators")
        .update(profile)
        .eq("platform", f.platform)
        .eq("platform_id", f.platformId)
        .select("id")
        .single<{ id: string }>();
      if (findError) throw findError;
      id = other.id;
    } else if (error) {
      throw error;
    } else {
      id = data.id;
    }
  }

  // Posts: keep exactly the latest set the API returned.
  if (f.posts.length) {
    const rows = f.posts.map((p) => ({
      creator_id: id,
      platform_post_id: p.platformPostId,
      type: p.type,
      posted_at: p.postedAt,
      likes: p.likes,
      comments: p.comments,
      views: p.views,
      url: p.url,
      caption: p.caption,
    }));
    const { error } = await db.from("posts").upsert(rows, { onConflict: "creator_id,platform_post_id" });
    if (error) throw error;
    const keep = f.posts.map((p) => quote(p.platformPostId)).join(",");
    const { error: delError } = await db.from("posts").delete().eq("creator_id", id).not("platform_post_id", "in", `(${keep})`);
    if (delError) throw delError;
  } else {
    await db.from("posts").delete().eq("creator_id", id);
  }

  const creator = await getCreator(db, id);
  if (!creator) throw new Error("Creator disappeared while saving.");

  // Snapshot + score + flags, using the settings at this moment.
  const nowMs = Date.now();
  const metrics = computeMetrics(creator, settings, nowMs);
  const { error: snapError } = await db.from("creator_snapshots").insert({
    creator_id: id,
    followers: f.followers,
    avg_likes: metrics.avgLikes,
    avg_comments: metrics.avgComments,
    avg_views: metrics.avgViews,
    engagement_rate: metrics.engagementRate,
    captured_at: now,
  });
  if (snapError) throw snapError;

  const withSnapshot = { ...creator, snapshots: [...creator.snapshots, { followers: f.followers, capturedAt: now }] };
  const analysis = analyzeCreator(withSnapshot, settings, nowMs);
  await db.from("scores").upsert({
    creator_id: id,
    total: analysis.score.total,
    breakdown: analysis.score.breakdown,
    weights_used: analysis.score.weightsUsed,
    computed_at: now,
  });
  await db.from("flags").delete().eq("creator_id", id);
  if (analysis.flags.length) {
    await db.from("flags").insert(analysis.flags.map((fl) => ({ creator_id: id, type: fl.type, message: fl.message, severity: fl.severity })));
  }
  return withSnapshot;
}

/** Creators whose data is older than the refresh interval, oldest first. */
/** How many fetches (follower snapshots) of this platform's creators were saved since `since`. */
export async function countFetchesSince(db: SupabaseClient, platform: Platform, since: string): Promise<number> {
  const { count, error } = await db
    .from("creator_snapshots")
    .select("id, creators!inner(platform)", { count: "exact", head: true })
    .eq("creators.platform", platform)
    .gte("captured_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Creators due a refresh. TikTok is left out: each refresh costs Apify credit, so it's refreshed by hand. */
export async function staleCreators(db: SupabaseClient, intervalHours: number, limit: number): Promise<{ id: string; platform: Platform; handle: string; platform_id: string }[]> {
  const cutoff = new Date(Date.now() - intervalHours * 3_600_000).toISOString();
  const { data, error } = await db
    .from("creators")
    .select("id, platform, handle, platform_id")
    .neq("platform", "tiktok")
    .lt("last_fetched_at", cutoff)
    .order("last_fetched_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface ShareReportData {
  list: Pick<Shortlist, "name" | "client">;
  /** Analyses with private team fields (notes, tags) removed. */
  rows: CreatorAnalysis[];
}

/**
 * Everything a public report needs, found by its secret share token. Scores
 * are worked out here on the server, so campaign results and team notes never
 * reach the public page.
 */
export async function loadShareReport(db: SupabaseClient, token: string): Promise<ShareReportData | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { data: row, error } = await db.from("shortlists").select(SHORTLIST_SELECT).eq("share_token", token).maybeSingle<ShortlistRow>();
  if (error) throw error;
  if (!row) return null;
  const list = shortlistFromRow(row);
  const ids = list.items.map((i) => i.creatorId);

  const [creatorsRes, settings, resultsRes] = await Promise.all([
    ids.length ? db.from("creators").select(CREATOR_SELECT).in("id", ids) : Promise.resolve({ data: [], error: null }),
    loadSettings(db),
    db.from("campaign_results").select("*"),
  ]);
  if (creatorsRes.error) throw creatorsRes.error;
  if (resultsRes.error) throw resultsRes.error;
  const creators = ((creatorsRes.data ?? []) as CreatorRow[]).map(creatorFromRow);
  const results = ((resultsRes.data ?? []) as CampaignResultRow[]).map(campaignResultFromRow);

  // Reach blending needs the size and niche of every creator with logged results.
  const resultIds = [...new Set(results.map((r) => r.creatorId))].filter((id) => !ids.includes(id));
  let others: Creator[] = [];
  if (resultIds.length) {
    const { data, error: e } = await db.from("creators").select("*").in("id", resultIds);
    if (e) throw e;
    others = ((data ?? []) as CreatorRow[]).map(creatorFromRow);
  }
  const everyone = [...creators, ...others];
  const now = Date.now();
  const byId = new Map(creators.map((c) => [c.id, c]));

  const rows = list.items
    .map((i) => byId.get(i.creatorId))
    .filter((c): c is Creator => !!c)
    .map((c) => {
      const a = analyzeCreator(c, settings, now, results, everyone);
      return { ...a, creator: { ...a.creator, notes: "", tags: [] } };
    });
  return { list: { name: list.name, client: list.client }, rows };
}

/** Quote a value for a PostgREST filter (handles commas, dots and brackets safely). */
function quote(v: string): string {
  return `"${v.replace(/["\\]/g, "\\$&")}"`;
}
