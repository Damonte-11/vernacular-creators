"use client";
import { discoveryPlan, type DiscoveryResult } from "../discover";
import { handleKey } from "../people";
import { IS_LIVE } from "../supabase/config";
import type { Creator } from "../types";
import { simulateLookup } from "@/sample-data/creators";
import { NOW } from "./creators";

/**
 * Possible accounts of this creator on the other platforms. Live: asks the
 * server, which checks Instagram and YouTube (free) and saves nothing. Demo:
 * matches saved sample creators, and pretends to find accounts named in the bio.
 */
export async function discoverAccounts(creator: Creator, all: Creator[]): Promise<{ results: DiscoveryResult[] } | { error: string }> {
  if (IS_LIVE) {
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(creator.id)}/discover`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      return res.ok ? { results: body.results ?? [] } : { error: body.error ?? `Search failed (${res.status}).` };
    } catch {
      return { error: "Couldn't reach the server. Check your internet connection." };
    }
  }

  await new Promise((r) => setTimeout(r, 500)); // pretend network delay
  const results: DiscoveryResult[] = [];
  const done = new Set<string>();
  for (const m of discoveryPlan(creator.bio, creator.handle, creator.platform)) {
    if (done.has(m.platform)) continue;
    const saved = all.find((c) => c.platform === m.platform && (c.handle.toLowerCase() === m.handle.toLowerCase() || handleKey(c.handle) === handleKey(m.handle)));
    if (saved) {
      if (saved.id !== creator.id && !(creator.personId && saved.personId === creator.personId)) results.push({ ...m, handle: saved.handle, savedId: saved.id });
      done.add(m.platform);
    } else if (m.source === "bio") {
      if (m.platform === "tiktok") results.push({ ...m, unchecked: true });
      else {
        const sim = simulateLookup(m.platform, m.handle, NOW);
        if (sim.ok) results.push({ ...m, preview: { name: sim.creator.name, followers: sim.creator.followers, photoUrl: null, bio: sim.creator.bio, platformId: sim.creator.platformId } });
      }
      done.add(m.platform);
    }
  }
  return { results };
}
