/**
 * Dialect insights: how a month compares with the one before, the best day to post, posting consistency,
 * top posts, and what's working or not. Plain maths over the posts already logged; the AI only rewords
 * the findings (see /api/dialect/insights), it never adds numbers.
 */
import {
  addMonths,
  countedEngagements,
  countedViews,
  counts,
  daysIn,
  FORMAT_LABEL,
  followersFor,
  monthOf,
  purposeLabel,
  slotOf,
  type DialectPlatform,
  type DialectPost,
  type DialectProject,
} from "./dialect";

const DAY_MS = 86_400_000;
const dateOf = (iso: string) => iso.slice(0, 10);
const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));
/** Posts whose views count and are known: the ones a views average can use. */
const withViews = (x: DialectPost) => counts(x) && !x.possibleAd && countedViews(x) > 0;

/* ── 1. Change against last month ─────────────────────────────── */

export interface Change {
  now: number;
  before: number;
}
export interface MonthChange {
  /** The month compared with. */
  prev: string;
  /** True when this month isn't over: both months are cut at the same day, so the comparison is fair. */
  sameDays: number | null;
  views: Change;
  posts: Change;
  engagements: Change;
  /** Only once the month is over (follower counts aren't read daily). */
  followers: Change | null;
  /** Engagement rate by views, as a fraction; null without views. */
  er: { now: number | null; before: number | null };
}

/** This month against last month, cut at the same day of the month while this one is still running. */
export function monthChange(p: DialectProject, month: string, today: string): MonthChange | null {
  const prev = addMonths(month, -1);
  const running = month === monthOf(today);
  const cut = running ? dayOfMonth(today) : 31;
  const pick = (m: string) => p.posts.filter((x) => monthOf(x.postedAt) === m && dayOfMonth(x.postedAt) <= cut && x.decision !== "excluded");
  const before = pick(prev);
  if (!before.length) return null;
  const now = pick(month);
  const sum = (xs: DialectPost[], f: (x: DialectPost) => number) => xs.reduce((a, x) => a + f(x), 0);
  const v = { now: sum(now, countedViews), before: sum(before, countedViews) };
  const e = { now: sum(now, countedEngagements), before: sum(before, countedEngagements) };
  const er = (xs: DialectPost[]) => {
    const seen = xs.filter((x) => countedViews(x) > 0);
    const views = sum(seen, countedViews);
    return views ? sum(seen, countedEngagements) / views : null;
  };
  return {
    prev,
    sameDays: running ? cut : null,
    views: v,
    posts: { now: now.length, before: before.length },
    engagements: e,
    followers: running ? null : { now: followersFor(p, month), before: followersFor(p, prev) },
    er: { now: er(now), before: er(before) },
  };
}

/** "+18%", "−40%", or null when there's nothing to compare against. */
export function changeShare(c: Change): number | null {
  if (!c.before) return null;
  return (c.now - c.before) / c.before;
}

/* ── 2. Best day to post ───────────────────────────────────────── */

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The 90 days that end with this month (or today, while it's running). */
function window90(month: string, today: string): { from: string; to: string } {
  const to = month === monthOf(today) ? today : `${month}-${String(daysIn(month)).padStart(2, "0")}`;
  const from = new Date(Date.parse(`${to}T12:00:00Z`) - 89 * DAY_MS).toISOString().slice(0, 10);
  return { from, to };
}
function inWindow(p: DialectProject, month: string, today: string): DialectPost[] {
  const w = window90(month, today);
  return p.posts.filter((x) => dateOf(x.postedAt) >= w.from && dateOf(x.postedAt) <= w.to);
}

export interface DayBar {
  day: string;
  /** Average counted views per post that day of the week; null with no posts. */
  avg: number | null;
  posts: number;
}

/** Average views per post by the day of the week it went up, over the last 90 days. */
export function bestDay(p: DialectProject, month: string, today: string): { bars: DayBar[]; best: number | null; posts: number } {
  const posts = inWindow(p, month, today).filter(withViews);
  const bars = WEEKDAYS.map((day) => ({ day, total: 0, posts: 0 }));
  for (const x of posts) {
    const i = (new Date(`${dateOf(x.postedAt)}T12:00:00Z`).getUTCDay() + 6) % 7;
    bars[i].total += countedViews(x);
    bars[i].posts++;
  }
  const out = bars.map((b) => ({ day: b.day, posts: b.posts, avg: b.posts ? b.total / b.posts : null }));
  // A single lucky post shouldn't crown a day: prefer days with at least two posts.
  const ranked = out.map((b, i) => ({ b, i })).filter(({ b }) => b.avg !== null && b.posts >= (posts.length >= 10 ? 2 : 1));
  const best = ranked.length ? ranked.reduce((a, c) => (c.b.avg! > a.b.avg! ? c : a)).i : null;
  return { bars: out, best, posts: posts.length };
}

/* ── 3. Posting consistency ────────────────────────────────────── */

export function consistency(p: DialectProject, month: string, today: string): { done: number; target: number; expected: number } {
  const done = p.posts.filter((x) => monthOf(x.postedAt) === month && x.decision !== "excluded").length;
  const target = p.monthTargets[month]?.posts ?? 0;
  const days = daysIn(month);
  const day = month < monthOf(today) ? days : month > monthOf(today) ? 0 : dayOfMonth(today);
  return { done, target, expected: Math.round((target * day) / days) };
}

/* ── 4. Top posts ──────────────────────────────────────────────── */

export function topPosts(p: DialectProject, month: string, platform: DialectPlatform, n = 5): DialectPost[] {
  return p.posts
    .filter((x) => x.platform === platform && monthOf(x.postedAt) === month && x.decision !== "excluded")
    .sort((a, b) => countedViews(b) - countedViews(a) || b.postedAt.localeCompare(a.postedAt))
    .slice(0, n);
}

/* ── 5. What's working, what's not ─────────────────────────────── */

export interface Finding {
  kind: "working" | "not";
  /** What the posts have in common, e.g. "Skit posts". */
  title: string;
  /** The numbers, in a sentence a client could read. */
  detail: string;
  /** Average views against each platform's usual, e.g. 2.3 = 2.3× usual. */
  ratio: number;
  posts: number;
}

/**
 * Groups the last 90 days of posts by content type, purpose, format and time of day, and compares each group's
 * views with each platform's usual (so a strong TikTok month doesn't make Instagram look weak).
 */
export function whatWorks(p: DialectProject, month: string, today: string): Finding[] {
  const posts = inWindow(p, month, today).filter(withViews);
  if (posts.length < 4) return [];
  const usual = new Map<DialectPlatform, number>();
  for (const pl of new Set(posts.map((x) => x.platform))) {
    const xs = posts.filter((x) => x.platform === pl);
    usual.set(pl, xs.reduce((a, x) => a + countedViews(x), 0) / xs.length);
  }
  const er = (xs: DialectPost[]) => {
    const v = xs.reduce((a, x) => a + countedViews(x), 0);
    return v ? xs.reduce((a, x) => a + countedEngagements(x), 0) / v : 0;
  };
  const baseEr = er(posts);
  const groups = new Map<string, { title: string; xs: DialectPost[] }>();
  const add = (key: string, title: string, x: DialectPost) => {
    const g = groups.get(key) ?? { title, xs: [] };
    g.xs.push(x);
    groups.set(key, g);
  };
  for (const x of posts) {
    if (x.contentType) add(`type:${x.contentType}`, `${x.contentType} posts`, x);
    if (x.purpose) add(`purpose:${x.purpose}`, `${purposeLabel(x.purpose)} posts`, x);
    add(`format:${x.format}`, `${FORMAT_LABEL[x.format]}s`, x);
    add(`slot:${slotOf(x.postedAt)}`, `${slotOf(x.postedAt)} posts`, x);
  }
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const out: Finding[] = [];
  for (const { title, xs } of groups.values()) {
    // Too few to judge, or every post (nothing to compare with).
    if (xs.length < 2 || xs.length === posts.length) continue;
    const ratio = xs.reduce((a, x) => a + countedViews(x) / usual.get(x.platform)!, 0) / xs.length;
    const platforms = [...new Set(xs.map((x) => x.platform))];
    const where = platforms.length === 1 ? ` on ${platforms[0] === "x" ? "X" : platforms[0][0].toUpperCase() + platforms[0].slice(1)}` : "";
    const erLine = `engagement ${pct(er(xs))} against ${pct(baseEr)} overall`;
    if (ratio >= 1.2)
      out.push({
        kind: "working",
        title,
        ratio,
        posts: xs.length,
        detail: `${xs.length} posts${where} in the last 90 days averaged ${ratio.toFixed(1)}× the page's usual views; ${erLine}.`,
      });
    else if (ratio <= 0.8)
      out.push({
        kind: "not",
        title,
        ratio,
        posts: xs.length,
        detail: `${xs.length} posts${where} in the last 90 days averaged ${Math.round((1 - ratio) * 100)}% below the page's usual views; ${erLine}.`,
      });
  }
  const working = out.filter((f) => f.kind === "working").sort((a, b) => b.ratio - a.ratio);
  const not = out.filter((f) => f.kind === "not").sort((a, b) => a.ratio - b.ratio);
  return [...working.slice(0, 3), ...not.slice(0, 3)];
}
