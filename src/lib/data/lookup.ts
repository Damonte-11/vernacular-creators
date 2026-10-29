"use client";
import type { Creator, Platform } from "../types";
import { IS_LIVE } from "../supabase/config";
import { simulateLookup } from "@/sample-data/creators";
import { findByHandle, normalizeHandle, NOW } from "./creators";
import { actions } from "./store";

export type LookupResult =
  | { status: "existing" | "added" | "refreshed"; creator: Creator }
  | { status: "error"; handle: string; error: string; code?: string; retryAfterSeconds?: number | null };

/**
 * Look up a creator. Saved creators come from the database (the server only
 * calls Instagram or YouTube when their data is older than the refresh
 * setting); new ones are fetched and saved. The demo pretends to fetch.
 */
export async function lookupCreator(platform: Platform, input: string, existing: Creator[]): Promise<LookupResult> {
  const handle = normalizeHandle(input);
  if (!handle) return { status: "error", handle, error: "Type a handle or paste a profile link first." };

  // Saved already? Open it without asking any platform.
  const saved = findByHandle(existing, platform, handle);
  if (saved) return { status: "existing", creator: saved };

  if (IS_LIVE) {
    try {
      const res = await fetch("/api/creators/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { status: "error", handle, error: body.error ?? `Lookup failed (${res.status}).`, code: body.code, retryAfterSeconds: body.retryAfterSeconds };
      }
      actions.upsertCreator(body.creator);
      return body as LookupResult;
    } catch {
      return { status: "error", handle, error: "Couldn't reach the server. Check your internet connection." };
    }
  }

  await new Promise((r) => setTimeout(r, 450 + Math.random() * 400)); // pretend network delay
  const result = simulateLookup(platform, handle, NOW);
  if (!result.ok) return { status: "error", handle, error: result.error };
  actions.upsertCreator(result.creator);
  return { status: "added", creator: result.creator };
}

/** Live mode: fetch fresh data for one creator now. */
export async function refreshCreator(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/creators/${encodeURIComponent(id)}/refresh`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? `Refresh failed (${res.status}).` };
    actions.upsertCreator(body.creator);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your internet connection." };
  }
}
