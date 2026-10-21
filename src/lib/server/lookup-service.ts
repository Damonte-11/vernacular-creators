import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Creator, Platform } from "../types";
import { TIKTOK_LIMITS } from "@config/app";
import { LookupError, withRetry } from "./errors";
import type { FetchedCreator } from "./fetched";
import { fetchInstagramCreator, instagramConfigFromEnv } from "./instagram";
import { countFetchesSince, findCreator, loadSettings, saveFetchedCreator } from "./repository";
import { apifyTokenFromEnv, fetchTikTokCreator } from "./tiktok";
import { fetchYouTubeCreator, youtubeKeyFromEnv } from "./youtube";

export type LookupOutcome = { status: "existing" | "added" | "refreshed"; creator: Creator };

/** Fetch a creator's public data from the right official API. */
export async function fetchFromPlatform(platform: Platform, handleOrId: string, attempts = 2): Promise<FetchedCreator> {
  // No automatic retries for TikTok: each attempt costs Apify credit and can take minutes.
  if (platform === "tiktok") return fetchTikTokCreator(handleOrId, apifyTokenFromEnv());
  if (platform === "instagram") {
    const config = instagramConfigFromEnv();
    return withRetry(() => fetchInstagramCreator(handleOrId, config), attempts);
  }
  const key = youtubeKeyFromEnv();
  return withRetry(() => fetchYouTubeCreator(handleOrId, key), attempts);
}

/**
 * Look a creator up. Saved creators whose data is newer than the refresh
 * interval come straight from the database (saving API allowance); everyone
 * else is fetched from the API and saved.
 */
export async function lookupCreator(
  db: SupabaseClient,
  platform: Platform,
  handle: string,
  userId: string | null,
  force = false,
): Promise<LookupOutcome> {
  if (!handle) throw new LookupError("not_found", "Type a handle first.");
  const settings = await loadSettings(db);
  const saved = await findCreator(db, platform, handle);
  if (saved && !force) {
    const ageHours = (Date.now() - new Date(saved.lastFetchedAt).getTime()) / 3_600_000;
    const maxAge = platform === "tiktok" ? TIKTOK_LIMITS.refreshDays * 24 : settings.refreshIntervalHours;
    if (ageHours < maxAge) return { status: "existing", creator: saved };
  }
  if (platform === "tiktok") await assertTikTokAllowance(db);
  const fetched = await fetchFromPlatform(platform, saved?.platform === "youtube" ? saved.platformId : handle);
  const creator = await saveFetchedCreator(db, fetched, settings, userId);
  return { status: saved ? "refreshed" : "added", creator };
}

/** Monthly cap on TikTok fetches, so Apify's credit isn't overspent. */
export function tiktokMonthlyLimit(): number {
  const n = Number(process.env.TIKTOK_MONTHLY_LOOKUPS);
  return Number.isInteger(n) && n >= 0 ? n : TIKTOK_LIMITS.monthlyLookups;
}

/** Throws if this calendar month's TikTok lookups are used up. Each fetch saves one follower snapshot, so those are counted. */
export async function assertTikTokAllowance(db: SupabaseClient, now = new Date()): Promise<void> {
  const limit = tiktokMonthlyLimit();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const used = await countFetchesSince(db, "tiktok", monthStart);
  if (used >= limit) {
    throw new LookupError(
      "quota",
      `This month's TikTok allowance (${limit} lookups) is used up, to stay within Apify's free credit. It resets on the 1st. Saved TikTok creators can still be viewed.`,
    );
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof LookupError) {
    const status = { not_found: 404, not_professional: 404, hidden_subscribers: 422, rate_limited: 429, quota: 429, auth: 502, config: 503, upstream: 502 }[e.code];
    return Response.json({ error: e.message, code: e.code, retryAfterSeconds: e.retryAfterSeconds ?? null }, { status });
  }
  if (/creators_platform_check/.test(String((e as { message?: string })?.message))) {
    return Response.json({ error: "The database isn't ready for TikTok yet. Run database update 0006 (see docs/SETUP.md).", code: "config" }, { status: 503 });
  }
  console.error(e);
  return Response.json({ error: "Something went wrong on our side. Please try again.", code: "server" }, { status: 500 });
}
