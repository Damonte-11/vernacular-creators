"use client";
import { useMemo } from "react";
import { analyzeCreator } from "../analyze";
import { IS_LIVE } from "../supabase/config";
import type { CampaignResult, Creator, CreatorAnalysis, Settings } from "../types";
import { sampleNow } from "@/sample-data/creators";
import { useAppState } from "./store";

/**
 * "Now" used for all calculations. The demo fixes it per day so sample data
 * stays stable; live mode uses the real time when the page loads.
 */
export const NOW = IS_LIVE ? Date.now() : sampleNow();

/** Every creator in the database, with the team's edits applied. */
export function useCreators(): Creator[] {
  return useAppState().creators;
}

/**
 * Every creator with metrics, reach, flags and score worked out. Worked out once per change to the data and
 * shared by every part of the page: a page used to score the whole list again for each component that asked.
 */
let cache: { creators: Creator[]; settings: Settings; results: CampaignResult[]; out: CreatorAnalysis[] } | null = null;
/** Each creator's analysis, kept while the settings and campaign results stay the same: a change to one creator re-scores only that one. */
let perCreator = new WeakMap<Creator, CreatorAnalysis>();
let perFor: { settings: Settings; results: CampaignResult[] } | null = null;
export function analysesFor(creators: Creator[], settings: Settings, results: CampaignResult[]): CreatorAnalysis[] {
  if (cache && cache.creators === creators && cache.settings === settings && cache.results === results) return cache.out;
  // Logged campaign reach is blended across creators of the same size, so with any logged, everyone is re-scored.
  const blended = results.some((r) => r.reach !== null);
  if (!perFor || perFor.settings !== settings || perFor.results !== results || blended) {
    perCreator = new WeakMap();
    perFor = { settings, results };
  }
  const out = creators.map((c) => {
    let a = perCreator.get(c);
    if (!a) perCreator.set(c, (a = analyzeCreator(c, settings, NOW, results, creators)));
    return a;
  });
  cache = { creators, settings, results, out };
  return out;
}
export function useAnalyses(): CreatorAnalysis[] {
  const { creators, settings, campaignResults } = useAppState();
  return useMemo(() => analysesFor(creators, settings, campaignResults), [creators, settings, campaignResults]);
}

export function useAnalysis(id: string): CreatorAnalysis | undefined {
  const all = useAnalyses();
  return all.find((a) => a.creator.id === id);
}

export function findByHandle(creators: Creator[], platform: Creator["platform"], handle: string): Creator | undefined {
  const h = normalizeHandle(handle);
  return creators.find((c) => c.platform === platform && (c.handle.toLowerCase() === h.toLowerCase() || c.platformId.toLowerCase() === h.toLowerCase()));
}

/** Accepts "@name", "name", or a profile/channel URL. Keeps case (YouTube channel IDs need it). */
export function normalizeHandle(input: string): string {
  let h = input.trim();
  const url = h.match(/(?:instagram\.com|youtube\.com|tiktok\.com)\/(?:@|c\/|user\/|channel\/)?([^/?#\s]+)/i);
  if (url) h = url[1];
  h = h.replace(/^@/, "");
  return /^UC[A-Za-z0-9_-]{22}$/.test(h) ? h : h.toLowerCase();
}
