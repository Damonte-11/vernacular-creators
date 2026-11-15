/**
 * Dialect: Vernacular runs a brand's own social pages month after month.
 * Pure types and maths, shared by the brand page, the needs-attention list
 * and the monthly report.
 *
 * Rules the team set:
 * - Targets come from the client agreement: totals for the whole agreement
 *   (e.g. 4 or 6 months), split evenly by month; any month can be changed.
 * - Boosted posts (ads) are not counted. A post far above the page's usual,
 *   or over a set number of views, is held back until a manager decides:
 *   count it (it went viral on its own), enter its organic numbers, or leave
 *   it out.
 * - Every post has a content type, set when it is logged. Brands can also have
 *   their own list of purposes (inDrive: differentiation, safety, trend); a
 *   brand without one doesn't ask for a purpose.
 * - Numbers the apps hide (e.g. Instagram carousel views and saves) are
 *   entered by hand.
 */

export type DialectPlatform = "instagram" | "tiktok" | "x" | "youtube";
export type PostFormat = "reel" | "video" | "carousel" | "photo" | "tweet" | "thread";
/** A brand's own purpose for a post, from its list (e.g. inDrive's differentiation, safety, trend). */
export type Purpose = string;
/** What a manager decided about a possible ad. */
export type AdDecision = "organic" | "manual" | "excluded";

export const DIALECT_PLATFORMS: { id: DialectPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X" },
  { id: "youtube", label: "YouTube" },
];
export const platformLabel = (p: DialectPlatform) => DIALECT_PLATFORMS.find((x) => x.id === p)!.label;

export const DEFAULT_CONTENT_TYPES = [
  "Skit",
  "Trend",
  "Educational",
  "Behind the scenes",
  "UGC",
  "Short-form video",
  "Trending sound",
  "Tweet",
  "Thread",
  "Meme",
];
/** inDrive's purposes: the first brand to use them. Other brands set their own list, or none. */
export const INDRIVE_PURPOSES: Purpose[] = ["differentiation", "safety", "trend"];
/** How a purpose reads on screen: the stored word with a capital letter. */
export const purposeLabel = (p: Purpose) => (p ? p[0].toUpperCase() + p.slice(1) : p);
/** A brand's purposes as choices for a picker. */
export const purposeOptions = (p: Pick<DialectProject, "purposes">) => p.purposes.map((id) => ({ id, label: purposeLabel(id) }));
/** Whether a post still needs labelling: a content type always, a purpose only for brands that use them. */
export const needsLabel = (p: Pick<DialectProject, "purposes">, x: DialectPost) => !x.contentType || (p.purposes.length > 0 && !x.purpose);
export const FORMAT_LABEL: Record<PostFormat, string> = {
  reel: "Reel",
  video: "Video",
  carousel: "Carousel",
  photo: "Photo",
  tweet: "Tweet",
  thread: "Thread",
};

export interface DialectPost {
  id: string;
  platform: DialectPlatform;
  url: string;
  title: string;
  /** When it went up (ISO, Lagos time). */
  postedAt: string;
  format: PostFormat;
  contentType: string | null;
  purpose: Purpose | null;
  /** Latest numbers; null when the app can't read them (entered by hand instead). */
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  /** Numbers typed in by a manager rather than read. */
  manual?: boolean;
  /** Held back as a possible ad until a manager decides. */
  possibleAd?: boolean;
  decision?: AdDecision | null;
  /** Organic numbers entered for a boosted post. */
  organic?: { views: number; engagements: number } | null;
  lastReadAt?: string | null;
  /** Why the numbers couldn't be read last time. */
  readProblem?: string | null;
}

export interface Totals {
  views: number;
  followers: number;
  posts: number;
  engagements: number;
}
export type Metric = keyof Totals;
export const METRICS: { id: Metric; label: string }[] = [
  { id: "views", label: "Organic views" },
  { id: "followers", label: "New followers" },
  { id: "posts", label: "Posts" },
  { id: "engagements", label: "Engagements" },
];

export interface Commitment {
  text: string;
  result: string;
  status: "done" | "on_track" | "paused" | "missed" | null;
}

export interface DialectProject {
  id: string;
  brand: string;
  client: string;
  platforms: { platform: DialectPlatform; handle: string }[];
  /** First month of the agreement, YYYY-MM. */
  startMonth: string;
  months: number;
  /** Agreed for the whole agreement. */
  totals: Totals;
  /** Per month, YYYY-MM → targets (an even split unless changed). */
  monthTargets: Record<string, Totals>;
  adRule: { views: number; timesUsual: number };
  competitors: string[];
  contentTypes: string[];
  /** This brand's purposes (empty: posts aren't given one). */
  purposes: Purpose[];
  /** Follower counts read with the numbers, each platform, oldest first. */
  followerReads: { at: string; platform: DialectPlatform; followers: number }[];
  /** Followers gained typed in for a month (all platforms), used instead of the reads when set. */
  followersManual: Record<string, number>;
  /** Saved monthly reports, YYYY-MM → report (made from the 1st of the next month). */
  reports: Record<string, unknown>;
  /** What the team committed to for each month, YYYY-MM → list. */
  commitments: Record<string, Commitment[]>;
  /** Monthly cap on Apify spend for mentions and competitors, in US dollars. */
  listeningCapUsd: number;
  posts: DialectPost[];
}

/** YYYY-MM of an ISO date. */
export const monthOf = (iso: string) => iso.slice(0, 7);
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function daysIn(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function monthName(month: string, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: style, timeZone: "UTC" });
}
export function agreementMonths(p: Pick<DialectProject, "startMonth" | "months">): string[] {
  return Array.from({ length: p.months }, (_, i) => addMonths(p.startMonth, i));
}

/** Split agreement totals evenly by month; the last month takes the rounding. */
export function splitTargets(totals: Totals, startMonth: string, months: number): Record<string, Totals> {
  const out: Record<string, Totals> = {};
  const n = Math.max(1, months);
  const each = (v: number) => Math.floor(v / n);
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    out[addMonths(startMonth, i)] = {
      views: last ? totals.views - each(totals.views) * (n - 1) : each(totals.views),
      followers: last ? totals.followers - each(totals.followers) * (n - 1) : each(totals.followers),
      posts: last ? totals.posts - each(totals.posts) * (n - 1) : each(totals.posts),
      engagements: last ? totals.engagements - each(totals.engagements) * (n - 1) : each(totals.engagements),
    };
  }
  return out;
}

export function rawEngagements(x: DialectPost): number {
  return (x.likes ?? 0) + (x.comments ?? 0) + (x.shares ?? 0) + (x.saves ?? 0);
}

/** Whether a post's numbers count: a possible ad waits for a decision; "left out" never counts. */
export function counts(x: DialectPost): boolean {
  if (x.possibleAd && !x.decision) return false;
  return x.decision !== "excluded";
}
/** Views that count towards targets. */
export function countedViews(x: DialectPost): number {
  if (!counts(x)) return 0;
  if (x.decision === "manual") return x.organic?.views ?? 0;
  return x.views ?? 0;
}
export function countedEngagements(x: DialectPost): number {
  if (!counts(x)) return 0;
  if (x.decision === "manual") return x.organic?.engagements ?? 0;
  return rawEngagements(x);
}
/** A carousel (or other post) whose views the app can't read and nobody has typed in. */
export function missingNumbers(x: DialectPost): boolean {
  return x.views === null && !x.manual && x.decision !== "excluded";
}

export interface MonthStats extends Totals {
  month: string;
  days: number;
  /** Day of the month it is (the whole month for a past month, 0 for a future one). */
  day: number;
  /** Cumulative counted views at the end of each day so far. */
  cumulative: { day: number; views: number }[];
  postsPerDay: number[];
  heldBack: DialectPost[];
}

export function monthStats(p: DialectProject, month: string, today: string): MonthStats {
  const days = daysIn(month);
  const day = month < monthOf(today) ? days : month > monthOf(today) ? 0 : Number(today.slice(8, 10));
  const posts = p.posts.filter((x) => monthOf(x.postedAt) === month);
  const perDay = Array(days).fill(0) as number[];
  const viewsPerDay = Array(days).fill(0) as number[];
  for (const x of posts) {
    const d = Number(x.postedAt.slice(8, 10)) - 1;
    perDay[d]++;
    viewsPerDay[d] += countedViews(x);
  }
  let run = 0;
  const cumulative = Array.from({ length: day }, (_, i) => ({ day: i + 1, views: (run += viewsPerDay[i]) }));
  return {
    month,
    days,
    day,
    views: run,
    engagements: posts.reduce((s, x) => s + countedEngagements(x), 0),
    posts: posts.filter((x) => x.decision !== "excluded").length,
    followers: followersFor(p, month),
    cumulative,
    postsPerDay: perDay,
    heldBack: posts.filter((x) => x.possibleAd && !x.decision),
  };
}

/**
 * New followers in a month, across the pages: typed in for the month, or the
 * last count read in the month minus the last count read before it (the first
 * count in the month when there is none before).
 */
export function followersFor(p: Pick<DialectProject, "followerReads" | "followersManual">, month: string): number {
  if (p.followersManual[month] !== undefined) return p.followersManual[month];
  let total = 0;
  const platforms = new Set(p.followerReads.map((r) => r.platform));
  for (const platform of platforms) {
    const reads = p.followerReads.filter((r) => r.platform === platform).sort((a, b) => a.at.localeCompare(b.at));
    const inMonth = reads.filter((r) => r.at.slice(0, 7) === month);
    if (!inMonth.length) continue;
    const before = reads.filter((r) => r.at.slice(0, 7) < month).at(-1) ?? inMonth[0];
    total += Math.max(0, inMonth.at(-1)!.followers - before.followers);
  }
  return total;
}

export type Verdict = { tone: "good" | "warn" | "bad"; text: string };

/** Where a metric stands against its target, for the share of the month gone. */
export function paceVerdict(done: number, target: number, day: number, days: number, unit = ""): Verdict {
  if (!target) return { tone: "good", text: "No target" };
  if (done >= target) return { tone: "good", text: `Target met (${Math.round((done / target) * 100)}%)` };
  if (day >= days) return { tone: "bad", text: `Missed: ${Math.round((done / target) * 100)}% of target` };
  const expected = (target * day) / days;
  const gap = expected - done;
  if (gap <= target * 0.03) return { tone: "good", text: done > expected * 1.08 ? "Ahead of pace" : "On pace" };
  const fmt = gap >= 1000 ? `${Math.round(gap / 100) / 10}K` : String(Math.round(gap));
  return { tone: gap > target * 0.12 ? "bad" : "warn", text: `Behind pace by ${fmt}${unit}` };
}

/** Average views per post on a platform over earlier months, for spotting possible ads. */
export function usualViews(p: DialectProject, platform: DialectPlatform, before: string): number | null {
  const v = p.posts.filter((x) => x.platform === platform && x.postedAt < before && x.views !== null && counts(x) && !x.possibleAd).map((x) => x.views!);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function isPossibleAd(p: DialectProject, x: DialectPost): boolean {
  if (x.views === null) return false;
  const usual = usualViews(p, x.platform, x.postedAt);
  return x.views >= p.adRule.views || (usual !== null && x.views >= usual * p.adRule.timesUsual);
}

export type AttentionItem =
  | { kind: "ad"; post: DialectPost; usual: number | null }
  | { kind: "numbers"; post: DialectPost }
  | { kind: "label"; post: DialectPost };

/** What a manager should clear before the month's report. */
export function attention(p: DialectProject, month: string): AttentionItem[] {
  const posts = p.posts.filter((x) => monthOf(x.postedAt) === month);
  return [
    ...posts.filter((x) => x.possibleAd && !x.decision).map((post) => ({ kind: "ad" as const, post, usual: usualViews(p, post.platform, post.postedAt) })),
    ...posts.filter(missingNumbers).map((post) => ({ kind: "numbers" as const, post })),
    ...posts.filter((x) => needsLabel(p, x)).map((post) => ({ kind: "label" as const, post })),
  ];
}

/** A month's report can only be made from the 1st of the next month, after the final numbers update. */
export function reportReadyOn(month: string): string {
  return `${addMonths(month, 1)}-01`;
}
export function canMakeReport(month: string, today: string): boolean {
  return today >= reportReadyOn(month);
}

/** Every link in pasted text: one per line, or a column copied from a sheet. */
export function linksIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s,;"'<>]+/gi)].map((m) => m[0]);
}

/**
 * When a post went up, from the number in its link (Lagos time, e.g. "2026-11-14T18:05:00+01:00"):
 * X status numbers, TikTok video numbers and Instagram post codes all carry their creation time.
 * Null for links without one (short TikTok links, YouTube); the first numbers read fills those in.
 */
export function postedFromLink(url: string): string | null {
  const u = url.trim();
  let ms: number | null = null;
  try {
    const x = u.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d{15,20})/i);
    const tt = u.match(/tiktok\.com\/.*\/(?:video|photo)\/(\d{15,20})/i);
    const ig = u.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{10,})/i);
    if (x)
      ms = Number(BigInt(x[1]) >> 22n) + 1_288_834_974_657; // X's epoch, Nov 2010
    else if (tt)
      ms = Number(BigInt(tt[1]) >> 32n) * 1000; // seconds since 1970
    else if (ig) {
      const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let id = 0n;
      for (const ch of ig[1].slice(0, 11)) id = id * 64n + BigInt(ABC.indexOf(ch));
      ms = Number(id >> 23n) + 1_314_220_021_721; // Instagram's epoch, Aug 2011
    }
  } catch {
    return null;
  }
  // Anything before 2010 or in the future means the link wasn't what it looked like.
  if (ms === null || ms < Date.UTC(2010, 0, 1) || ms > Date.now() + 86_400_000) return null;
  return `${new Date(ms + 3_600_000).toISOString().slice(0, 19)}+01:00`;
}

/** Platform and format from a pasted link. */
export function readLink(url: string): { platform: DialectPlatform; format: PostFormat } | null {
  const u = url.trim().toLowerCase();
  if (/instagram\.com\/(reel|reels)\//.test(u)) return { platform: "instagram", format: "reel" };
  if (/instagram\.com\/p\//.test(u)) return { platform: "instagram", format: "carousel" };
  if (/tiktok\.com\/.*\/photo\//.test(u)) return { platform: "tiktok", format: "carousel" };
  if (/tiktok\.com\//.test(u)) return { platform: "tiktok", format: "video" };
  if (/(x|twitter)\.com\/[^/]+\/status\//.test(u)) return { platform: "x", format: "tweet" };
  if (/youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch/.test(u)) return { platform: "youtube", format: "video" };
  return null;
}

/** Time of day a post went up, for the "when to post" chart. */
export function slotOf(iso: string): "Morning" | "Midday" | "Evening" | "Night" {
  const h = Number(iso.slice(11, 13));
  return h < 12 ? "Morning" : h < 16 ? "Midday" : h < 21 ? "Evening" : "Night";
}
