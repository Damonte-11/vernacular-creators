import type { Platform } from "./types";

/**
 * Where a possible other account came from: "bio" is the creator's own word,
 * "handle" is a guess, "saved" is a similar account already in the database.
 */
export type DiscoverySource = "bio" | "handle" | "saved";

export interface Mention {
  platform: Platform;
  handle: string;
  source: DiscoverySource;
}

const HANDLE = "@?([A-Za-z0-9._-]{2,40})";
const SEP = "\\s*(?:[:\\-–—|]|on)?\\s*";
const TEXT_PATTERNS: [Platform, RegExp][] = [
  ["tiktok", new RegExp(`\\b(?:tiktok|tik tok|tt)${SEP}${HANDLE}`, "gi")],
  ["youtube", new RegExp(`\\b(?:youtube|yt)${SEP}${HANDLE}`, "gi")],
  ["instagram", new RegExp(`\\b(?:instagram|insta|ig)${SEP}${HANDLE}`, "gi")],
];
const URL_PATTERNS: [Platform, RegExp][] = [
  ["tiktok", /tiktok\.com\/@([A-Za-z0-9._]{2,30})/gi],
  ["youtube", /youtube\.com\/(?:@|c\/|user\/)?([A-Za-z0-9._-]{2,40})/gi],
  ["instagram", /instagram\.com\/([A-Za-z0-9._]{2,30})/gi],
];
/** Words that follow "YouTube:" etc. but aren't handles. */
const NOT_HANDLES = new Set(["channel", "link", "below", "page", "account", "handle", "videos", "watch", "com", "same", "and", "the"]);

/** Handles of other platforms that the creator mentions in their bio, e.g. "TikTok: @kiekie" or a youtube.com link. */
export function bioMentions(bio: string, own: Platform): Mention[] {
  const found = new Map<string, Mention>();
  const add = (platform: Platform, raw: string) => {
    const handle = raw.replace(/^@/, "").replace(/[._-]+$/, "");
    if (platform === own || handle.length < 2 || NOT_HANDLES.has(handle.toLowerCase())) return;
    const key = `${platform}:${handle.toLowerCase()}`;
    if (!found.has(key)) found.set(key, { platform, handle, source: "bio" });
  };
  for (const [platform, re] of URL_PATTERNS) for (const m of bio.matchAll(re)) add(platform, m[1]);
  // Remove URLs so their parts aren't read again as "ig: something".
  const text = bio.replace(/https?:\/\/\S+|\b\S+\.com\/\S*/gi, " ");
  for (const [platform, re] of TEXT_PATTERNS) for (const m of text.matchAll(re)) add(platform, m[1]);
  return [...found.values()];
}

/** The same handle, and a tidied version, to try on another platform. A guess, so always confirmed by a person. */
export function handleGuesses(handle: string): string[] {
  const h = handle.toLowerCase().replace(/^@/, "");
  const tidy = h.replace(/[._-]+/g, "").replace(/(official|tv)$/, "");
  return [...new Set([h, tidy])].filter((x) => /^[a-z0-9._-]{2,30}$/.test(x));
}

/**
 * What to try on each other platform: bio mentions first, then handle guesses
 * (only for platforms the bio doesn't mention).
 */
export function discoveryPlan(bio: string, handle: string, own: Platform): Mention[] {
  const mentions = bioMentions(bio, own);
  const others = (["instagram", "youtube", "tiktok"] as Platform[]).filter((p) => p !== own && !mentions.some((m) => m.platform === p));
  const guesses = others.flatMap((platform) => handleGuesses(handle).map((h): Mention => ({ platform, handle: h, source: "handle" })));
  return [...mentions, ...guesses];
}

/** A possible account of the same person, as shown to the team. */
export interface DiscoveryResult {
  platform: Platform;
  handle: string;
  source: DiscoverySource;
  /** Already saved in the database: linking it is free. */
  savedId?: string;
  /** Found on the platform (not saved yet). */
  preview?: { name: string; followers: number; photoUrl: string | null; bio: string; platformId: string };
  /** TikTok: not checked, because each check uses paid Apify credit. */
  unchecked?: boolean;
}
