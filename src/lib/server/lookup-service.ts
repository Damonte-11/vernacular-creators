import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Creator, Platform } from "../types";
import { LookupError, withRetry } from "./errors";
import type { FetchedCreator } from "./fetched";
import { fetchInstagramCreator, instagramConfigFromEnv } from "./instagram";
import { findCreator, loadSettings, saveFetchedCreator } from "./repository";
import { fetchYouTubeCreator, youtubeKeyFromEnv } from "./youtube";

export type LookupOutcome = { status: "existing" | "added" | "refreshed"; creator: Creator };

/** Fetch a creator's public data from the right official API. */
export async function fetchFromPlatform(platform: Platform, handleOrId: string, attempts = 2): Promise<FetchedCreator> {
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
    if (ageHours < settings.refreshIntervalHours) return { status: "existing", creator: saved };
  }
  const fetched = await fetchFromPlatform(platform, saved?.platform === "youtube" ? saved.platformId : handle);
  const creator = await saveFetchedCreator(db, fetched, settings, userId);
  return { status: saved ? "refreshed" : "added", creator };
}

export function errorResponse(e: unknown): Response {
  if (e instanceof LookupError) {
    const status = { not_found: 404, not_professional: 404, hidden_subscribers: 422, rate_limited: 429, quota: 429, auth: 502, config: 503, upstream: 502 }[e.code];
    return Response.json({ error: e.message, code: e.code, retryAfterSeconds: e.retryAfterSeconds ?? null }, { status });
  }
  console.error(e);
  return Response.json({ error: "Something went wrong on our side. Please try again.", code: "server" }, { status: 500 });
}
