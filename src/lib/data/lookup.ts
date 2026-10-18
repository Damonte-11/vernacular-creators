"use client";
import type { Creator, Platform } from "../types";
import { simulateLookup } from "@/sample-data/creators";
import { findByHandle, normalizeHandle, NOW } from "./creators";
import { actions } from "./store";

export type LookupResult =
  | { status: "existing"; creator: Creator }
  | { status: "added"; creator: Creator }
  | { status: "error"; handle: string; error: string };

/**
 * Look up a creator. If they're already saved, use the saved copy; otherwise
 * fetch them and save them. Stage 1 pretends to fetch; Stage 2 calls the
 * Instagram or YouTube API here.
 */
export async function lookupCreator(platform: Platform, input: string, existing: Creator[]): Promise<LookupResult> {
  const handle = normalizeHandle(input);
  const found = findByHandle(existing, platform, handle);
  if (found) return { status: "existing", creator: found };

  await new Promise((r) => setTimeout(r, 450 + Math.random() * 400)); // pretend network delay
  const result = simulateLookup(platform, handle, NOW);
  if (!result.ok) return { status: "error", handle, error: result.error };
  actions.addCreator(result.creator);
  return { status: "added", creator: result.creator };
}
