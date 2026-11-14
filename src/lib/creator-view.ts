/**
 * What the creator pages show about each creator, worked out from the real
 * data only (posts, follower history, score and flags). Nothing here is
 * estimated beyond what the score engine already does.
 */
import { SIZE_BANDS, type SizeBandId } from "@config/size-bands";
import type { CreatorAnalysis, Platform, Post } from "./types";

const DAY = 86_400_000;

export interface CreatorView {
  a: CreatorAnalysis;
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  photoUrl: string | null;
  niche: string | null;
  city: string | null;
  country: string;
  band: SizeBandId;
  followers: number;
  score: number | null;
  er: number | null;
  /** Typical views per post (what a booking can expect). */
  views: number | null;
  /** Typical views ÷ followers. */
  reach: number | null;
  trend: number | null;
  postsPerWeek: number | null;
  lastPostDays: number | null;
  email: string | null;
  found: "auto" | "manual";
  verified: boolean;
  /** Newest first. */
  recent: Post[];
  /** Most viewed (or liked) first. */
  best: Post[];
  /** Views of the last 12 posts, oldest first. */
  viewSeries: (number | null)[];
  /** Followers at each saved refresh, oldest first. */
  growth: { at: string; followers: number }[];
  /** Accounts and brands they tag in captions, most often first. */
  mentions: { handle: string; posts: number; paid: boolean }[];
  verdict: string;
  why: string[];
  watchOut: string[];
}

const PAID = /#ad\b|#sponsored|#partner|paid partnership|#collab|in partnership with/i;

export function creatorView(a: CreatorAnalysis, now: number): CreatorView {
  const c = a.creator;
  const m = a.metrics;
  const recent = [...c.posts].sort((x, y) => y.postedAt.localeCompare(x.postedAt));
  const counted = recent.filter((p) => !p.excluded);
  const best = [...counted].sort((x, y) => (y.views ?? (y.likes ?? 0) * 10) - (x.views ?? (x.likes ?? 0) * 10));
  const last12 = recent.slice(0, 12);
  const span = last12.length > 1 ? (Date.parse(last12[0].postedAt) - Date.parse(last12.at(-1)!.postedAt)) / DAY : null;
  const postsPerWeek = span && span > 0 ? Math.min(21, ((last12.length - 1) / span) * 7) : null;
  const lastPostDays = recent[0] ? Math.max(0, Math.floor((now - Date.parse(recent[0].postedAt)) / DAY)) : null;

  const tally = new Map<string, { posts: number; paid: boolean }>();
  for (const p of recent) {
    const paid = PAID.test(p.caption);
    for (const h of new Set((p.caption.match(/@[\w.]{2,30}/g) ?? []).map((x) => x.toLowerCase()))) {
      if (h.slice(1) === c.handle.toLowerCase()) continue;
      const t = tally.get(h) ?? { posts: 0, paid: false };
      tally.set(h, { posts: t.posts + 1, paid: t.paid || paid });
    }
  }
  const mentions = [...tally].map(([handle, t]) => ({ handle, ...t })).sort((x, y) => Number(y.paid) - Number(x.paid) || y.posts - x.posts);

  const reach = m.avgViews !== null && c.followers ? m.avgViews / c.followers : null;
  const why: string[] = [];
  if (m.engagementLabel === "great" || m.engagementLabel === "good") why.push("Their audience reacts more than most creators this size");
  if (reach !== null && reach >= 0.3) why.push(`A typical post reaches about ${Math.round(reach * 100)}% of their followers`);
  if (m.trend && m.trend.change >= 0.15) why.push(`Latest posts are up ${Math.round(m.trend.change * 100)}% on their usual`);
  if (postsPerWeek !== null && postsPerWeek >= 3) why.push(`Posts about ${Math.round(postsPerWeek)} times a week`);
  if (!a.flags.length && a.score.total !== null) why.push("No warning signs in their numbers");
  const watchOut = a.flags.map((f) => f.message);
  if (lastPostDays !== null && lastPostDays > 21) watchOut.push(`Hasn't posted in ${lastPostDays} days`);
  if (m.lowConfidence) watchOut.push("Based on only a few posts, so the numbers may move");

  const niche = (c.niche ?? "").toLowerCase() || "their niche";
  const s = a.score.total;
  const verdict =
    s === null
      ? "Not enough posts yet to judge."
      : s >= 75
        ? `Strong pick for ${niche}. ${why[0] ?? "Numbers hold up well"}.`
        : s >= 55
          ? `Solid ${niche} creator${watchOut.length ? "; read the watch-outs before booking" : ""}.`
          : `Risky: ${(watchOut[0] ?? "the numbers don't hold up").replace(/\.$/, "")}.`;

  return {
    a,
    id: c.id,
    name: c.name,
    handle: c.handle,
    platform: c.platform,
    photoUrl: c.photoUrl,
    niche: c.niche,
    city: c.city,
    country: c.country,
    band: m.band,
    followers: c.followers,
    score: s,
    er: m.engagementRate,
    views: m.avgViews,
    reach,
    trend: m.trend?.change ?? null,
    postsPerWeek,
    lastPostDays,
    email: c.email ?? c.bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null,
    found: c.discoveredVia ? "auto" : "manual",
    verified: c.verified,
    recent,
    best,
    viewSeries: last12.reverse().map((p) => p.views),
    growth: [...c.snapshots].sort((x, y) => x.capturedAt.localeCompare(y.capturedAt)).map((x) => ({ at: x.capturedAt, followers: x.followers })),
    mentions,
    verdict,
    why: why.slice(0, 3),
    watchOut: watchOut.slice(0, 4),
  };
}

/* ---------- Filters ---------- */

export interface ViewFilters {
  text: string;
  platforms: Platform[];
  niches: string[];
  cities: string[];
  bands: SizeBandId[];
  minViews: number | null;
  maxViews: number | null;
  minEr: number | null;
  maxEr: number | null;
  minScore: number | null;
  noFlags: boolean;
  emailOnly: boolean;
  activeOnly: boolean;
  found: "" | "auto" | "manual";
}

export const NO_FILTERS: ViewFilters = {
  text: "",
  platforms: [],
  niches: [],
  cities: [],
  bands: [],
  minViews: null,
  maxViews: null,
  minEr: null,
  maxEr: null,
  minScore: null,
  noFlags: false,
  emailOnly: false,
  activeOnly: false,
  found: "",
};

export function filterViews(list: CreatorView[], f: ViewFilters): CreatorView[] {
  const words = f.text.trim().toLowerCase().replace(/^@/, "").split(/\s+/).filter(Boolean);
  return list.filter((x) => {
    if (words.length) {
      const hay = `${x.name} ${x.handle} ${x.niche ?? ""} ${x.city ?? ""} ${x.country} ${x.a.creator.bio} ${x.a.creator.tags.join(" ")}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.platforms.length && !f.platforms.includes(x.platform)) return false;
    if (f.niches.length && !f.niches.includes(x.niche ?? "")) return false;
    if (f.cities.length && !f.cities.includes(x.city ?? "")) return false;
    if (f.bands.length && !f.bands.includes(x.band)) return false;
    if (f.minViews !== null && (x.views ?? -1) < f.minViews) return false;
    if (f.maxViews !== null && (x.views === null || x.views >= f.maxViews)) return false;
    if (f.minEr !== null && (x.er ?? -1) < f.minEr) return false;
    if (f.maxEr !== null && (x.er === null || x.er >= f.maxEr)) return false;
    if (f.minScore !== null && (x.score ?? -1) < f.minScore) return false;
    if (f.noFlags && x.a.flags.length) return false;
    if (f.emailOnly && !x.email) return false;
    if (f.activeOnly && (x.lastPostDays === null || x.lastPostDays > 14)) return false;
    if (f.found && x.found !== f.found) return false;
    return true;
  });
}

export type ViewSort = "score" | "views" | "er" | "followers" | "trend" | "name";
export function sortViews(list: CreatorView[], k: ViewSort): CreatorView[] {
  if (k === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
  const v = (x: CreatorView) => ({ score: x.score, views: x.views, er: x.er, followers: x.followers, trend: x.trend })[k] ?? -Infinity;
  return [...list].sort((a, b) => v(b) - v(a));
}

/** Creators most like this one: same niche first, then size, engagement and city. */
export function similar(x: CreatorView, all: CreatorView[], n = 6): CreatorView[] {
  const person = x.a.creator.personId;
  return all
    .filter((y) => y.id !== x.id && !(person && y.a.creator.personId === person))
    .map((y) => ({
      y,
      d:
        (y.niche && y.niche === x.niche ? 0 : 3) +
        Math.abs(Math.log10(y.followers + 1) - Math.log10(x.followers + 1)) +
        Math.abs((y.er ?? 0) - (x.er ?? 0)) * 20 +
        (y.city && y.city === x.city ? 0 : 0.5) +
        (y.platform === x.platform ? 0 : 0.3),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((z) => z.y);
}

/** Plain-language search read without AI: niche, city, platform and size words become filters, the rest is text. */
export function readQuery(q: string, niches: string[], cities: string[]): { filters: Partial<ViewFilters>; chips: string[] } {
  let rest = ` ${q.toLowerCase()} `;
  const f: Partial<ViewFilters> = {};
  const chips: string[] = [];
  const take = (re: RegExp) => {
    const hit = re.test(rest);
    if (hit) rest = rest.replace(re, " ");
    return hit;
  };
  const add = (patch: Partial<ViewFilters>, ...labels: string[]) => {
    Object.assign(f, patch);
    chips.push(...labels);
  };
  const ns = niches.filter((n) => take(new RegExp(`\\b${n.toLowerCase()}\\w*\\b`)));
  if (ns.length) add({ niches: ns }, ...ns);
  const cs = cities.filter((c) => take(new RegExp(`\\b${c.toLowerCase()}\\b`)));
  if (cs.length) add({ cities: cs }, ...cs);
  const ps = (["instagram", "tiktok", "youtube"] as Platform[]).filter((p) => take(new RegExp(`\\b${p}\\b`)));
  if (ps.length) add({ platforms: ps }, ...ps.map((p) => ({ instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" })[p]));
  const bs = SIZE_BANDS.filter((b) => take(new RegExp(`\\b${b.id}\\b`)));
  if (bs.length) add({ bands: bs.map((b) => b.id) }, ...bs.map((b) => b.label));
  if (take(/\b(high|good|real|strong) engagement\b|\bengaging\b/)) add({ minEr: 0.03 }, "Engagement 3%+");
  if (take(/\bwith (an )?email\b|\bemail\b/)) add({ emailOnly: true }, "Has email");
  if (take(/\b(safe|clean|trusted|no flags)\b/)) add({ noFlags: true }, "No warning flags");
  if (take(/\b(active|posting|consistent)\b/)) add({ activeOnly: true }, "Posted this fortnight");
  const over = rest.match(/\b(over|above|more than)\s*([\d.]+)\s*(k|m)?\s*(views)?/);
  if (over) {
    const n = Number(over[2]) * (over[3] === "m" ? 1e6 : over[3] === "k" ? 1e3 : 1);
    rest = rest.replace(over[0], " ");
    if (over[4]) add({ minViews: n }, `${over[2]}${over[3] ?? ""}+ views`);
    else add({ bands: SIZE_BANDS.filter((b) => b.max > n).map((b) => b.id) }, `Over ${over[2]}${over[3] ?? ""} followers`);
  }
  const text = rest
    .replace(/\b(creators?|influencers?|who|that|with|in|on|and|the|a|an|for|get|gets|posting|post|posts|content|people)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text) add({ text }, `“${text}”`);
  return { filters: f, chips };
}
