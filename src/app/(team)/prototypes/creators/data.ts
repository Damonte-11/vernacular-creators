/**
 * Shared data for the creator-side prototypes: the made-up sample creators,
 * scored by the real engine, plus prototype-only extras (collaborations,
 * audience signals from comments, Chorus history) generated from a seed.
 * Nothing here is a real person or a real result.
 */
import { analyzeCreator } from "@/lib/analyze";
import { DEFAULT_SETTINGS } from "@/lib/data/demo-store";
import type { CreatorAnalysis, Platform, Post } from "@/lib/types";
import { sampleCreators, sampleNow } from "@/sample-data/creators";

export const NOW = sampleNow();

export interface Collab {
  brand: string;
  initials: string;
  tone: string;
  posts: number;
  paid: boolean;
}

export interface Pro {
  a: CreatorAnalysis;
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  niche: string;
  city: string;
  followers: number;
  score: number | null;
  er: number | null;
  avgViews: number | null;
  /** Typical views ÷ followers. */
  viewsRatio: number | null;
  trend: number | null;
  postsPerWeek: number;
  lastPostDays: number;
  email: boolean;
  flags: CreatorAnalysis["flags"];
  recent: Post[];
  best: Post[];
  /** Views of the last 12 posts, oldest first (null where none). */
  viewSeries: (number | null)[];
  /** Followers each month, last 12 months. */
  growth: { m: string; followers: number }[];
  collabs: Collab[];
  paidShare: number;
  languages: { label: string; share: number }[];
  countries: { label: string; share: number }[];
  spamShare: number;
  sentiment: { positive: number; neutral: number; negative: number };
  commentThemes: string[];
  topics: string[];
  chorus: { campaign: string; client: string; month: string; vsUsual: number; onTime: boolean }[];
  watchSeconds: number | null;
  rate: string | null;
  verdict: string;
  why: string[];
  watchOut: string[];
}

function seeded(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const BRANDS = [
  ["Zest Juice", "ZJ", "#e8a33d"],
  ["Glide Rides", "GR", "#171715"],
  ["Kora Pay", "KP", "#2f6f5e"],
  ["Mama's Pot", "MP", "#b8462c"],
  ["Lumi Phones", "LP", "#3a4fa3"],
  ["Ankara House", "AH", "#8a3d8f"],
  ["Sunny Malt", "SM", "#c6871c"],
  ["Naija Bet", "NB", "#1f7a3a"],
  ["Pure Skin", "PS", "#c46a7c"],
  ["Pally Data", "PD", "#0f6e8c"],
] as const;

const THEMES: Record<string, string[]> = {
  Food: ["asking for the recipe", "where to buy the ingredients", "jollof debates", "price of food stuff"],
  Comedy: ["quoting the punchline", "tagging friends", "asking for part 2", "Lagos traffic stories"],
  Fashion: ["where the outfit is from", "asking for prices", "styling tips", "fabric questions"],
  Tech: ["which phone to buy", "battery life", "price in naira", "network problems"],
  Lifestyle: ["parenting tips", "home decor", "asking about routines", "faith and family"],
  Music: ["asking for the full song", "lyrics", "concert dates", "comparing to other artists"],
  Beauty: ["product shades", "skin type questions", "where to buy", "prices"],
};

const monthLabel = (offset: number) => new Date(Date.UTC(2026, 10 - offset, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

function enrich(a: CreatorAnalysis): Pro {
  const c = a.creator;
  const r = seeded(c.id);
  const m = a.metrics;
  const recent = [...c.posts].sort((x, y) => y.postedAt.localeCompare(x.postedAt));
  const best = [...recent].sort((x, y) => (y.views ?? (y.likes ?? 0) * 12) - (x.views ?? (x.likes ?? 0) * 12)).slice(0, 9);
  const viewSeries = recent
    .slice(0, 12)
    .reverse()
    .map((p) => p.views);
  const snaps = [...c.snapshots].sort((x, y) => x.capturedAt.localeCompare(y.capturedAt));
  const start = snaps[0]?.followers ?? c.followers * 0.8;
  const growth = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const wobble = 1 + (r() - 0.5) * 0.02;
    return { m: monthLabel(11 - i), followers: Math.round((start + (c.followers - start) * Math.pow(t, 1.3)) * wobble) };
  });
  growth[11].followers = c.followers;
  const nCollabs = Math.floor(r() * 5);
  const pool = [...BRANDS].sort(() => r() - 0.5).slice(0, nCollabs);
  const collabs = pool.map(([brand, initials, tone]) => ({ brand, initials, tone, posts: 1 + Math.floor(r() * 4), paid: r() > 0.35 }));
  const english = 30 + Math.floor(r() * 30);
  const pidgin = 15 + Math.floor(r() * 30);
  const local = c.city === "Abuja" ? "Hausa" : c.city === "Port Harcourt" ? "Igbo" : "Yoruba";
  const localShare = 5 + Math.floor(r() * 15);
  const other = Math.max(0, 100 - english - pidgin - localShare);
  const ng = 70 + Math.floor(r() * 25);
  const gh = Math.floor(r() * 8);
  const uk = Math.floor(r() * (100 - ng - gh) * 0.6);
  const spamShare = a.flags.some((f) => f.type === "likes_comments_ratio" || f.type === "low_engagement") ? 12 + Math.floor(r() * 18) : 2 + Math.floor(r() * 6);
  const pos = 45 + Math.floor(r() * 35);
  const neg = 3 + Math.floor(r() * 12);
  const lastPostDays = recent[0] ? Math.max(0, Math.round((NOW - Date.parse(recent[0].postedAt)) / 86_400_000)) : 99;
  const span = recent.length > 1 ? (Date.parse(recent[0].postedAt) - Date.parse(recent[Math.min(recent.length, 12) - 1].postedAt)) / 86_400_000 : 30;
  const postsPerWeek = span > 0 ? Math.min(14, (Math.min(recent.length, 12) / span) * 7) : 0;
  const chorus =
    r() > 0.45
      ? [
          { campaign: "Malt can launch", client: "Sample client A", month: "Sep 2026", vsUsual: 0.7 + r() * 2.2, onTime: r() > 0.25 },
          ...(r() > 0.5 ? [{ campaign: "Year-end sale", client: "Sample client B", month: "Jul 2026", vsUsual: 0.6 + r() * 1.8, onTime: r() > 0.3 }] : []),
        ]
      : [];
  const viewsRatio = m.avgViews && c.followers ? m.avgViews / c.followers : null;
  const score = a.score.total;
  const why: string[] = [];
  const watchOut = a.flags.map((f) => f.message);
  if (m.engagementLabel === "great" || m.engagementLabel === "good") why.push("Audience reacts more than most creators this size");
  if (viewsRatio && viewsRatio > 0.5) why.push(`Typical post reaches ${Math.round(viewsRatio * 100)}% of followers`);
  if (m.trend && m.trend.change > 0.15) why.push(`Latest posts up ${Math.round(m.trend.change * 100)}% on usual`);
  if (chorus.some((x) => x.vsUsual > 1.3)) why.push("Beat their usual on a past Vernacular campaign");
  if (postsPerWeek >= 3) why.push(`Posts about ${Math.round(postsPerWeek)} times a week`);
  if (!why.length) why.push("Steady, predictable numbers");
  const verdict =
    score === null
      ? "Not enough posts yet to judge"
      : score >= 75
        ? `Strong pick for ${(c.niche ?? "lifestyle").toLowerCase()}: ${why[0].charAt(0).toLowerCase() + why[0].slice(1)}.`
        : score >= 55
          ? `Solid ${(c.niche ?? "lifestyle").toLowerCase()} creator; check the notes before booking.`
          : `Risky: ${(watchOut[0] ?? "numbers don't hold up").replace(/\.$/, "").toLowerCase()}.`;
  return {
    a,
    id: c.id,
    name: c.name,
    handle: c.handle,
    platform: c.platform,
    niche: c.niche ?? "Lifestyle",
    city: c.city ?? "Lagos",
    followers: c.followers,
    score,
    er: m.engagementRate,
    avgViews: m.avgViews,
    viewsRatio,
    trend: m.trend?.change ?? null,
    postsPerWeek,
    lastPostDays,
    email: r() > 0.4,
    flags: a.flags,
    recent,
    best,
    viewSeries,
    growth,
    collabs,
    paidShare: collabs.length ? 10 + Math.floor(r() * 40) : 0,
    languages: [
      { label: "English", share: english },
      { label: "Pidgin", share: pidgin },
      { label: local, share: localShare },
      { label: "Other", share: other },
    ].sort((x, y) => y.share - x.share),
    countries: [
      { label: "Nigeria", share: ng },
      { label: "Ghana", share: gh },
      { label: "United Kingdom", share: uk },
      { label: "Other", share: Math.max(0, 100 - ng - gh - uk) },
    ],
    spamShare,
    sentiment: { positive: pos, negative: neg, neutral: 100 - pos - neg },
    commentThemes: (THEMES[c.niche ?? "Lifestyle"] ?? THEMES.Lifestyle).slice(0, 3),
    topics: [c.niche ?? "Lifestyle", ...(c.tags ?? [])].slice(0, 3),
    chorus,
    watchSeconds: r() > 0.5 ? Math.round(6 + r() * 14) : null,
    rate: r() > 0.5 ? `₦${Math.round(((c.followers / 1000) * (800 + r() * 900)) / 5000) * 5}k` : null,
    verdict,
    why: why.slice(0, 3),
    watchOut: watchOut.slice(0, 3),
  };
}

let cache: Pro[] | null = null;
export function prototypeCreators(): Pro[] {
  if (cache) return cache;
  const all = sampleCreators(NOW);
  cache = all.map((c) => enrich(analyzeCreator(c, DEFAULT_SETTINGS, NOW, [], all)));
  return cache;
}

/* ---------- Search ---------- */

export type SizeBand = "nano" | "micro" | "mid" | "macro";
export const SIZE_BANDS: { id: SizeBand; label: string; min: number; max: number }[] = [
  { id: "nano", label: "Nano · under 10K", min: 0, max: 10_000 },
  { id: "micro", label: "Micro · 10K–100K", min: 10_000, max: 100_000 },
  { id: "mid", label: "Mid · 100K–500K", min: 100_000, max: 500_000 },
  { id: "macro", label: "Macro · 500K+", min: 500_000, max: Infinity },
];

export interface Filters {
  text: string;
  platforms: Platform[];
  niches: string[];
  cities: string[];
  sizes: SizeBand[];
  minEr: number | null;
  maxEr: number | null;
  /** Typical (expected) views per post. */
  minViews: number | null;
  maxViews: number | null;
  minScore: number | null;
  emailOnly: boolean;
  activeOnly: boolean;
  noFlags: boolean;
}
export const EMPTY_FILTERS: Filters = {
  text: "",
  platforms: [],
  niches: [],
  cities: [],
  sizes: [],
  minEr: null,
  maxEr: null,
  minViews: null,
  maxViews: null,
  minScore: null,
  emailOnly: false,
  activeOnly: false,
  noFlags: false,
};

export const NICHES = ["Food", "Comedy", "Fashion", "Tech", "Lifestyle", "Music", "Beauty"];
export const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan"];

/**
 * Turns a plain-language request into filters. The live app asks Gemini;
 * this prototype reads the obvious words so the screens can be tried.
 */
export function understand(q: string): { filters: Partial<Filters>; chips: string[] } {
  const s = q.toLowerCase();
  const f: Partial<Filters> = {};
  const chips: string[] = [];
  const niches = NICHES.filter(
    (n) =>
      s.includes(n.toLowerCase()) ||
      (n === "Comedy" && /skit|funny|comed/.test(s)) ||
      (n === "Food" && /cook|recipe|chef/.test(s)) ||
      (n === "Tech" && /gadget|phone/.test(s)),
  );
  if (niches.length) {
    f.niches = niches;
    chips.push(...niches);
  }
  const cities = CITIES.filter((c) => s.includes(c.toLowerCase()) || (c === "Port Harcourt" && /\bph\b/.test(s)));
  if (cities.length) {
    f.cities = cities;
    chips.push(...cities);
  }
  const platforms = (["instagram", "tiktok", "youtube"] as Platform[]).filter((p) => s.includes(p));
  if (platforms.length) {
    f.platforms = platforms;
    chips.push(...platforms.map((p) => p[0].toUpperCase() + p.slice(1)));
  }
  const sizes = SIZE_BANDS.filter((b) => s.includes(b.id));
  if (sizes.length) {
    f.sizes = sizes.map((b) => b.id);
    chips.push(...sizes.map((b) => b.label.split(" · ")[0]));
  }
  const over = s.match(/(over|above|more than)\s*(\d+)\s*(k|m)?/);
  if (over) {
    const n = Number(over[2]) * (over[3] === "m" ? 1e6 : over[3] === "k" ? 1e3 : 1);
    f.sizes = SIZE_BANDS.filter((b) => b.max > n).map((b) => b.id);
    chips.push(`Over ${over[2]}${over[3] ?? ""} followers`);
  }
  if (/engag|reacts|active audience/.test(s)) {
    f.minEr = 0.03;
    chips.push("Engagement 3%+");
  }
  if (/email|contact/.test(s)) {
    f.emailOnly = true;
    chips.push("Has email");
  }
  if (/safe|clean|no flags|trust/.test(s)) {
    f.noFlags = true;
    chips.push("No warning flags");
  }
  if (/posting|active|consistent/.test(s)) {
    f.activeOnly = true;
    chips.push("Posted this fortnight");
  }
  return { filters: f, chips };
}

export function applyFilters(list: Pro[], f: Filters): Pro[] {
  const t = f.text.trim().toLowerCase();
  return list.filter((x) => {
    if (t && !`${x.name} ${x.handle} ${x.niche} ${x.city} ${x.a.creator.bio}`.toLowerCase().includes(t)) return false;
    if (f.platforms.length && !f.platforms.includes(x.platform)) return false;
    if (f.niches.length && !f.niches.includes(x.niche)) return false;
    if (f.cities.length && !f.cities.includes(x.city)) return false;
    if (
      f.sizes.length &&
      !f.sizes.some((id) => {
        const b = SIZE_BANDS.find((y) => y.id === id)!;
        return x.followers >= b.min && x.followers < b.max;
      })
    )
      return false;
    if (f.minEr !== null && (x.er ?? 0) < f.minEr) return false;
    if (f.maxEr !== null && (x.er ?? Infinity) >= f.maxEr) return false;
    if (f.minViews !== null && (x.avgViews ?? 0) < f.minViews) return false;
    if (f.maxViews !== null && (x.avgViews ?? Infinity) >= f.maxViews) return false;
    if (f.minScore !== null && (x.score ?? 0) < f.minScore) return false;
    if (f.emailOnly && !x.email) return false;
    if (f.activeOnly && x.lastPostDays > 14) return false;
    if (f.noFlags && x.flags.length) return false;
    return true;
  });
}

export type SortKey = "score" | "followers" | "er" | "views" | "trend";
export function sortBy(list: Pro[], k: SortKey): Pro[] {
  const v = (x: Pro) => ({ score: x.score ?? -1, followers: x.followers, er: x.er ?? -1, views: x.avgViews ?? -1, trend: x.trend ?? -9 })[k];
  return [...list].sort((a, b) => v(b) - v(a));
}

/** Creators most like this one: same niche first, then size and engagement. */
export function lookalikes(x: Pro, all: Pro[], n = 6): Pro[] {
  return (
    all
      // Not the same person's other accounts.
      .filter((y) => y.id !== x.id && y.name !== x.name)
      .map((y) => ({
        y,
        d:
          (y.niche === x.niche ? 0 : 3) +
          Math.abs(Math.log10(y.followers + 1) - Math.log10(x.followers + 1)) +
          Math.abs((y.er ?? 0) - (x.er ?? 0)) * 20 +
          (y.city === x.city ? 0 : 0.5),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map((z) => z.y)
  );
}

/* ---------- Covers: designed post thumbnails (caption over colour) ---------- */

const COVER_TONES = [
  ["#1d1b16", "#f2eee3"],
  ["#f75115", "#171715"],
  ["#2f4f3e", "#efe6d2"],
  ["#7a2e1d", "#f6dcc8"],
  ["#e9d8b4", "#2a2620"],
  ["#23365e", "#e9edf7"],
  ["#5b3a5e", "#f3e3f2"],
  ["#c9a227", "#1d1b16"],
];
export function coverOf(p: Post): { bg: string; fg: string; text: string } {
  const r = seeded(p.id);
  const [bg, fg] = COVER_TONES[Math.floor(r() * COVER_TONES.length)];
  const words = p.caption
    .replace(/[^\p{L}\p{N}\s'’!?.,-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  return { bg, fg, text: words.slice(0, 5).join(" ") || "New post" };
}

export const fmt = (n: number | null | undefined, d = 1) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(d).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : d).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
};
export const pct = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? "—" : `${(n * 100).toFixed(d)}%`);
