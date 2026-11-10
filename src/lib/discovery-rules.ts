import { BUSINESS_SIGNALS, MEDIA_SIGNALS, NIGERIA_SIGNALS, type DiscoverySettings } from "@config/discovery";
import type { EngagementLabel } from "./types";
import type { Platform } from "./types";

/** The parts of a fetched profile the rules look at. */
export interface ProfileFacts {
  name: string;
  bio: string;
  followers: number;
  /** Country code from the platform, where it gives one (YouTube, TikTok). */
  country: string | null;
  /** Newest post date (ISO), or null when there are no posts. */
  lastPostAt: string | null;
}

export type Decision = { decision: "add" | "review" | "skip"; reason: string };

const DAY = 86_400_000;

function hasWord(text: string, words: string[]): string | null {
  const t = ` ${text.toLowerCase()} `;
  // Emoji and multi-word signals match anywhere; single words must stand alone ("benin" not "beninese").
  return words.find((w) => (/^[a-z0-9]+$/.test(w) ? new RegExp(`[^a-z0-9]${w}[^a-z0-9]`).test(t) : t.includes(w))) ?? null;
}

export function nigeriaSignal(p: Pick<ProfileFacts, "name" | "bio" | "country">): string | null {
  if (p.country && /^(ng|nigeria)$/i.test(p.country)) return "country: Nigeria";
  const word = hasWord(`${p.name} ${p.bio}`, NIGERIA_SIGNALS);
  return word ? `bio mentions "${word}"` : null;
}

export function businessSignal(p: Pick<ProfileFacts, "name" | "bio">): string | null {
  return hasWord(`${p.name} ${p.bio}`, BUSINESS_SIGNALS);
}

export function mediaSignal(p: Pick<ProfileFacts, "name" | "bio">): string | null {
  return hasWord(`${p.name} ${p.bio}`, MEDIA_SIGNALS);
}

/** How good the account is, from the same maths as every creator profile. */
export interface Quality {
  score: number | null;
  engagementLabel: EngagementLabel | null;
  /** Messages of high-severity warning flags (likely fake or bought activity). */
  highFlags: string[];
}

/** Why an account isn't good enough to add, or null if it is. */
export function qualityProblem(q: Quality, minScore: number): string | null {
  if (q.highFlags.length) return `Warning signs: ${q.highFlags[0]}`;
  if (q.engagementLabel === "poor") return "Poor engagement for their size";
  if (q.score === null) return "Not enough data to score";
  if (q.score < minScore) return `Creator Score ${q.score} (under ${minScore})`;
  return null;
}

/**
 * What to do with an account discovery found:
 * - add: clearly a Nigerian creator, big and active enough
 * - review ("Worth a look"): fits, but the Nigeria link is only that a Nigerian creator tagged them
 * - skip: too small, inactive, a business, or not Nigerian
 * `taggedByNigerian` is true when the account came from a Nigerian creator's mention.
 */
export function decide(
  p: ProfileFacts,
  cfg: Pick<DiscoverySettings, "minFollowers" | "activeDays" | "reviewQueue" | "minScore">,
  taggedByNigerian: boolean,
  now: number,
  quality?: Quality,
): Decision {
  if (p.followers < cfg.minFollowers) return { decision: "skip", reason: `Under ${cfg.minFollowers.toLocaleString("en")} followers` };
  if (!p.lastPostAt) return { decision: "skip", reason: "No posts" };
  const days = Math.floor((now - new Date(p.lastPostAt).getTime()) / DAY);
  if (days > cfg.activeDays) return { decision: "skip", reason: `No posts in the last ${cfg.activeDays} days` };
  const business = businessSignal(p);
  if (business) return { decision: "skip", reason: `Looks like a business ("${business}")` };
  const media = mediaSignal(p);
  if (media) return { decision: "skip", reason: `Looks like a blog, news or fan page ("${media}")` };
  const problem = quality ? qualityProblem(quality, cfg.minScore) : null;
  if (problem) return { decision: "skip", reason: problem };
  const ng = nigeriaSignal(p);
  const scored = quality?.score != null ? `, score ${quality.score}` : "";
  if (ng) return { decision: "add", reason: `Nigerian creator (${ng}${scored})` };
  if (p.country) return { decision: "skip", reason: `Based outside Nigeria (${p.country})` };
  if (taggedByNigerian && cfg.reviewQueue) return { decision: "review", reason: "Tagged by a Nigerian creator, but no Nigeria link in their own profile" };
  return { decision: "skip", reason: "No sign they're Nigerian" };
}

/** @handles mentioned in a caption or bio, for the creator's own platform. Emails and the creator's own handle are left out. */
export function mentionedHandles(text: string, own: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(^|[^A-Za-z0-9._@])@([A-Za-z0-9._]{2,30})/g)) {
    const h = m[2].replace(/\.+$/, "").toLowerCase();
    if (h.length >= 2 && h !== own.toLowerCase()) found.add(h);
  }
  return [...found];
}

/** YouTube searches for this run: niche × city pairs, rotating day by day so every pair is used in turn. */
export function searchQueries(cfg: Pick<DiscoverySettings, "keywords" | "cities">, count: number, dayNumber: number): string[] {
  const pairs = cfg.keywords.flatMap((k) => cfg.cities.map((c) => `${k} ${c}`));
  if (pairs.length === 0) return [];
  const start = (dayNumber * count) % pairs.length;
  return Array.from({ length: Math.min(count, pairs.length) }, (_, i) => pairs[(start + i) % pairs.length]);
}

/** "Tagged by @kiekie" / "YouTube search: comedy Lagos" — shown on the creator. */
export function sourceLabel(source: { kind: "mention"; by: string; platform: Platform } | { kind: "search"; query: string }): string {
  return source.kind === "mention" ? `Tagged by @${source.by}` : `YouTube search: ${source.query}`;
}
