/**
 * DESIGN PREVIEW ONLY. Made-up Chorus projects so the team can judge the
 * Projects design before anything is saved to the database. No real clients,
 * creators or results: every name here is invented.
 *
 * The sample is frozen on a fixed day of each campaign so the numbers never
 * drift.
 */
import type { Platform } from "./types";

export type ChorusType = "Seedlings" | "Headliners" | "Salad";
export type Tier = "Nano" | "Micro" | "Mid-tier" | "Mega";

export interface SamplePost {
  id: string;
  url: string;
  postedDay: number; // day of the window, 1-based
  views: number | null; // null = link added, numbers not in yet
  engagements: number | null;
}

export interface SampleCreator {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  tier: Tier;
  dueDay: number;
  postsAgreed: number;
  posts: SamplePost[];
}

export interface SampleProject {
  id: string;
  name: string;
  client: string;
  type: ChorusType;
  vertical: string;
  start: string; // ISO date of day 1
  days: number; // length of the window
  today: number; // day of the window the sample is frozen on (0 = not started)
  guarantee: number; // views promised in writing
  creators: SampleCreator[];
}

/** Small deterministic random so the sample is the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const FIRST = ["Tolu", "Ada", "Kemi", "Chidi", "Ife", "Bayo", "Zainab", "Emeka", "Funmi", "Uche", "Seyi", "Amaka", "Dami", "Ngozi", "Femi", "Halima", "Kunle", "Obi", "Yemi", "Chioma", "Tobi", "Musa", "Bisi", "Ebuka", "Lola", "Sola", "Nkechi", "Wale"];
const STYLE = ["eats", "daily", "styles", "comedy", "vlogs", "fits", "skits", "talks", "cooks", "glow"];

/** How much of a post's final (day-7) views it has after N days. */
function grown(age: number): number {
  if (age >= 7) return 1;
  if (age >= 3) return 0.84 + (age - 3) * 0.04;
  if (age >= 1) return 0.62 + (age - 1) * 0.11;
  return 0.4;
}

function makeProject(p: Omit<SampleProject, "creators">, opts: { seed: number; count: number; tiers: Tier[]; late: number[]; noNumbers: number[]; postsEach?: number }): SampleProject {
  const rand = seeded(opts.seed);
  const platforms: Platform[] = ["instagram", "instagram", "tiktok", "instagram", "youtube", "tiktok"];
  const viewRange: Record<Tier, [number, number]> = { Nano: [9_000, 42_000], Micro: [30_000, 110_000], "Mid-tier": [120_000, 380_000], Mega: [600_000, 1_400_000] };
  const creators: SampleCreator[] = [];
  for (let i = 0; i < opts.count; i++) {
    const first = FIRST[(i + opts.seed) % FIRST.length];
    const tier = opts.tiers[i % opts.tiers.length];
    const platform = platforms[(i * 5 + opts.seed) % platforms.length];
    const dueDay = Math.min(p.days - 2, 1 + Math.floor((i / opts.count) * (p.days - 3)));
    const postsAgreed = opts.postsEach ?? 1;
    const handle = `${first.toLowerCase()}.${STYLE[(i * 3 + opts.seed) % STYLE.length]}`;
    const posts: SamplePost[] = [];
    if (!opts.late.includes(i)) {
      for (let n = 0; n < postsAgreed; n++) {
        const day = dueDay + n * 4 + (rand() < 0.25 ? 1 : 0);
        if (day > p.today) break;
        const [lo, hi] = viewRange[tier];
        const final = Math.round(lo + rand() * (hi - lo));
        const age = p.today - day;
        const pending = opts.noNumbers.includes(i) && n === 0;
        const views = pending ? null : Math.round(final * grown(age));
        const er = 0.035 + rand() * 0.06 - (tier === "Mega" ? 0.02 : 0);
        posts.push({
          id: `${p.id}-${i}-${n}`,
          url: `https://www.${platform === "youtube" ? "youtube.com/shorts" : platform === "tiktok" ? "tiktok.com/@" + handle + "/video" : "instagram.com/reel"}/${(opts.seed * 7919 + i * 104729 + n).toString(36)}`,
          postedDay: day,
          views,
          engagements: views === null ? null : Math.round(views * er),
        });
      }
    }
    creators.push({ id: `${p.id}-c${i}`, name: `${first} ${String.fromCharCode(65 + ((i * 7) % 26))}.`, handle, platform, tier, dueDay, postsAgreed, posts });
  }
  return { ...p, creators };
}

export const SAMPLE_PROJECTS: SampleProject[] = [
  makeProject(
    { id: "sample-seedlings", name: "Malt drink launch", client: "Sample client A", type: "Seedlings", vertical: "Food & drink", start: "2026-11-01", days: 21, today: 10, guarantee: 750_000 },
    { seed: 3, count: 24, tiers: ["Nano", "Micro", "Nano"], late: [4, 9], noNumbers: [11, 12] },
  ),
  makeProject(
    { id: "sample-headliners", name: "Year-end sale", client: "Sample client B", type: "Headliners", vertical: "Retail", start: "2026-10-06", days: 14, today: 14, guarantee: 4_000_000 },
    { seed: 11, count: 6, tiers: ["Mid-tier", "Mega", "Mid-tier"], late: [], noNumbers: [], postsEach: 2 },
  ),
  makeProject(
    { id: "sample-salad", name: "App sign-ups push", client: "Sample client C", type: "Salad", vertical: "Fintech", start: "2026-11-20", days: 28, today: 0, guarantee: 2_500_000 },
    { seed: 7, count: 14, tiers: ["Nano", "Micro", "Mid-tier", "Nano", "Mega"], late: [], noNumbers: [] },
  ),
];

export function sampleProject(id: string): SampleProject | undefined {
  return SAMPLE_PROJECTS.find((p) => p.id === id);
}

/* ── Derived numbers ─────────────────────────────────────────── */

export type CreatorState = "waiting" | "late" | "posted" | "final";

export const CREATOR_STATES: { key: CreatorState; label: string; hint: string }[] = [
  { key: "waiting", label: "Waiting to post", hint: "Not due yet" },
  { key: "late", label: "Late", hint: "Due date passed, no link" },
  { key: "posted", label: "Posted", hint: "Numbers still growing" },
  { key: "final", label: "Day-7 numbers in", hint: "Final numbers" },
];

export function creatorState(c: SampleCreator, today: number): CreatorState {
  if (c.posts.length === 0) return c.dueDay < today ? "late" : "waiting";
  const newest = Math.max(...c.posts.map((p) => p.postedDay));
  return today - newest >= 7 && c.posts.length >= c.postsAgreed ? "final" : "posted";
}

/** Which checkpoint a post's numbers come from. */
export function checkpoint(post: SamplePost, today: number): string {
  if (post.views === null) return "No numbers yet";
  const age = today - post.postedDay;
  if (age >= 7) return "Day 7";
  if (age >= 3) return "Day 3";
  if (age >= 1) return "Day 1";
  return "Posted today";
}

export interface ProjectTotals {
  views: number;
  engagements: number;
  erByViews: number | null;
  posts: number;
  postsAgreed: number;
  creators: number;
  pace: number; // views the campaign should have by today on a straight line to the guarantee
  verdict: "met" | "ahead" | "on-track" | "behind" | "not-started";
  gap: number; // views ahead (+) or behind (-) of pace
  postsByDay: number[]; // index 0 = day 1
  dueByDay: number[]; // posts still expected per day (from today on)
}

export function projectTotals(p: SampleProject): ProjectTotals {
  const posts = p.creators.flatMap((c) => c.posts);
  const counted = posts.filter((x) => x.views !== null);
  const views = counted.reduce((s, x) => s + (x.views ?? 0), 0);
  const engagements = counted.reduce((s, x) => s + (x.engagements ?? 0), 0);
  const pace = Math.round((p.guarantee * Math.min(p.today, p.days)) / p.days);
  const gap = views - pace;
  const verdict: ProjectTotals["verdict"] =
    p.today === 0 ? "not-started" : views >= p.guarantee ? "met" : gap >= p.guarantee * 0.05 ? "ahead" : gap >= -p.guarantee * 0.02 ? "on-track" : "behind";
  const postsByDay = Array.from({ length: p.days }, () => 0);
  posts.forEach((x) => (postsByDay[x.postedDay - 1] += 1));
  const dueByDay = Array.from({ length: p.days }, () => 0);
  p.creators.forEach((c) => {
    const missing = c.postsAgreed - c.posts.length;
    if (missing <= 0) return;
    const day = Math.max(c.dueDay, p.today + 1);
    if (day <= p.days) dueByDay[day - 1] += missing;
  });
  return {
    views,
    engagements,
    erByViews: views > 0 ? engagements / views : null,
    posts: posts.length,
    postsAgreed: p.creators.reduce((s, c) => s + c.postsAgreed, 0),
    creators: p.creators.length,
    pace,
    verdict,
    gap,
    postsByDay,
    dueByDay,
  };
}

export interface AttentionItem {
  id: string;
  tone: "bad" | "warn";
  title: string;
  detail: string;
  creatorId: string;
}

/** The short list of problems, worst first. */
export function attentionItems(p: SampleProject): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const c of p.creators) {
    if (creatorState(c, p.today) === "late") {
      const days = p.today - c.dueDay;
      items.push({ id: `${c.id}-late`, tone: "bad", title: `${c.name} hasn't posted`, detail: `Due ${days === 1 ? "yesterday" : `${days} days ago`} · no link yet`, creatorId: c.id });
    }
    for (const post of c.posts) {
      if (post.views === null) items.push({ id: `${post.id}-nonum`, tone: "warn", title: `${c.name}: no numbers yet`, detail: `Link added day ${post.postedDay} · views not checked`, creatorId: c.id });
      else if (post.engagements !== null && post.views > 0 && post.engagements / post.views < 0.03 && p.today - post.postedDay >= 3)
        items.push({ id: `${post.id}-er`, tone: "warn", title: `${c.name}: low engagement`, detail: `${((post.engagements / post.views) * 100).toFixed(1)}% by views, under 3%`, creatorId: c.id });
    }
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}

export function dayDate(p: SampleProject, day: number): string {
  const d = new Date(`${p.start}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Match pasted links to the project's creators by the handle in the URL. */
export function matchLinks(p: SampleProject, text: string): { url: string; creator: SampleCreator | null }[] {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  return urls.map((url) => {
    const lower = url.toLowerCase();
    const creator = p.creators.find((c) => lower.includes(`@${c.handle}`) || lower.includes(`/${c.handle}/`) || lower.includes(c.handle)) ?? null;
    return { url, creator };
  });
}
