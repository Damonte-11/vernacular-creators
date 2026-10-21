"use client";
import { useMemo } from "react";
import { analyzeCreator } from "../analyze";
import { IS_LIVE } from "../supabase/config";
import type { Creator, CreatorAnalysis } from "../types";
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

/** Every creator with metrics, reach, flags and score worked out. */
export function useAnalyses(): CreatorAnalysis[] {
  const { creators, settings, campaignResults } = useAppState();
  return useMemo(
    () => creators.map((c) => analyzeCreator(c, settings, NOW, campaignResults, creators)),
    [creators, settings, campaignResults],
  );
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
