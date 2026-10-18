"use client";
import { useMemo } from "react";
import { analyzeCreator } from "../analyze";
import type { Creator, CreatorAnalysis } from "../types";
import { sampleCreators, sampleNow } from "@/sample-data/creators";
import { useAppState } from "./store";

/** "Now" used for all calculations (fixed per day in the demo). */
export const NOW = sampleNow();
const SAMPLE = sampleCreators(NOW);

/** Every creator in the database, with the team's edits applied. */
export function useCreators(): Creator[] {
  const { addedCreators, edits } = useAppState();
  return useMemo(
    () =>
      [...SAMPLE, ...addedCreators].map((c) => {
        const e = edits[c.id];
        return e ? { ...c, ...stripUndefined(e) } : c;
      }),
    [addedCreators, edits],
  );
}

/** Every creator with metrics, reach, flags and score worked out. */
export function useAnalyses(): CreatorAnalysis[] {
  const creators = useCreators();
  const { settings, campaignResults } = useAppState();
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
  return creators.find((c) => c.platform === platform && c.handle.toLowerCase() === h);
}

/** Accepts "@name", "name", or a profile/channel URL. */
export function normalizeHandle(input: string): string {
  let h = input.trim();
  const url = h.match(/(?:instagram\.com|youtube\.com)\/(?:@|c\/|user\/|channel\/)?([^/?#\s]+)/i);
  if (url) h = url[1];
  return h.replace(/^@/, "").toLowerCase();
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
