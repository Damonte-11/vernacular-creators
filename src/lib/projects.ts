/**
 * Projects (Chorus campaigns): the maths and rules, with no screens or saving.
 * Dates are whole days (YYYY-MM-DD) in Lagos time.
 */
import type { CampaignObjective, ChorusType, Creator, Platform, PostCheck, Project, ProjectBrief, ProjectCreator, ProjectPost } from "./types";

export const CHORUS_TYPES: { id: ChorusType; label: string; hint: string }[] = [
  { id: "seedlings", label: "Seedlings", hint: "Many nano and micro creators posting in bulk" },
  { id: "headliners", label: "Headliners", hint: "Mid-tier to mega creators for big numbers" },
  { id: "salad", label: "Salad", hint: "A mix of both" },
];

export const OBJECTIVES: { id: CampaignObjective; label: string; hint: string }[] = [
  { id: "awareness", label: "Awareness", hint: "Get the brand or launch known" },
  { id: "consideration", label: "Consideration", hint: "Get people comparing and asking" },
  { id: "conversion", label: "Conversion", hint: "Get people to buy or sign up" },
];

/** Days a post's numbers are read on, counted from the day it went up. */
export const CHECK_DAYS = [1, 3, 7] as const;
/** Comments read per post unless a project sets its own cap. */
export const DEFAULT_COMMENT_CAP = 3000;

export function chorusLabel(t: ChorusType): string {
  return CHORUS_TYPES.find((c) => c.id === t)?.label ?? t;
}

export function emptyBrief(): ProjectBrief {
  return { brand: "", product: "", keyMessage: "", mustSay: [], hashtags: [], dos: [], donts: [], competitors: [], notes: "" };
}

/* ── Dates ───────────────────────────────────────────────────── */

const DAY_MS = 86_400_000;

/** Today's date in Lagos (UTC+1, no daylight saving). */
export function todayLagos(now: number = Date.now()): string {
  return new Date(now + 3_600_000).toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/** Whole days from a to b (b later = positive). */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(date: string, n: number): string {
  return new Date((dayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10);
}

/** "4 Nov" */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Length of the campaign window in days, and which day of it today is (0 = not started; past the end = length). */
export function projectWindow(p: Pick<Project, "startDate" | "endDate">, today: string): { days: number; today: number } {
  const days = Math.max(1, daysBetween(p.startDate, p.endDate) + 1);
  const into = daysBetween(p.startDate, today) + 1;
  return { days, today: Math.max(0, Math.min(days, into)) };
}

export function projectPhase(p: Pick<Project, "startDate" | "endDate">, today: string): "upcoming" | "running" | "finished" {
  if (today < p.startDate) return "upcoming";
  if (today > p.endDate) return "finished";
  return "running";
}

/* ── Posts ───────────────────────────────────────────────────── */

export function latestCheck(post: ProjectPost): PostCheck | null {
  if (post.checks.length === 0) return null;
  return post.checks.reduce((a, b) => (b.day > a.day || (b.day === a.day && b.checkedAt > a.checkedAt) ? b : a));
}

/** Likes + comments + shares, from whichever were readable. */
export function engagementsOf(c: PostCheck | null): number | null {
  if (!c) return null;
  const parts = [c.likes, c.comments, c.shares].filter((v): v is number => v !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

export function postNumbers(post: ProjectPost): { views: number | null; engagements: number | null; er: number | null; check: PostCheck | null } {
  const check = latestCheck(post);
  const views = check?.views ?? null;
  const engagements = engagementsOf(check);
  return { views, engagements, er: views && engagements !== null ? engagements / views : null, check };
}

/** Which reading the latest numbers are from, in words. */
export function checkLabel(post: ProjectPost, today: string): string {
  const check = latestCheck(post);
  if (post.problem) return "Couldn't read";
  if (!check) return post.postedDate && daysBetween(post.postedDate, today) < 1 ? "Numbers tomorrow" : "No numbers yet";
  if (check.day === 0) return "Today";
  return `Day ${check.day}`;
}

/** The next check day a post is due for, or null once day 7 is in. */
export function nextCheckDay(post: ProjectPost, today: string): number | null {
  if (!post.postedDate) return null;
  const age = daysBetween(post.postedDate, today);
  const done = new Set(post.checks.map((c) => c.day));
  const due = CHECK_DAYS.filter((d) => d <= age && !done.has(d));
  return due.length ? due[due.length - 1] : null;
}

/* ── Creators on a project ───────────────────────────────────── */

export type CreatorState = "waiting" | "late" | "posted" | "final";

export const CREATOR_STATES: { id: CreatorState; label: string }[] = [
  { id: "late", label: "Late" },
  { id: "waiting", label: "Waiting to post" },
  { id: "posted", label: "Posted" },
  { id: "final", label: "Day-7 numbers in" },
];

export function postsBy(p: Project, creatorId: string): ProjectPost[] {
  return p.posts.filter((x) => x.creatorId === creatorId);
}

export function creatorState(p: Project, pc: ProjectCreator, today: string): CreatorState {
  const posts = postsBy(p, pc.creatorId);
  if (posts.length === 0) return pc.dueDate && pc.dueDate < today ? "late" : "waiting";
  const allIn = posts.length >= pc.postsAgreed && posts.every((x) => x.checks.some((c) => c.day >= 7));
  return allIn ? "final" : "posted";
}

/* ── Totals and the views guarantee ──────────────────────────── */

export type Verdict = "met" | "ahead" | "on-track" | "behind" | "not-started" | "no-guarantee";

export interface ProjectTotals {
  views: number;
  engagements: number;
  erByViews: number | null;
  posts: number;
  postsAgreed: number;
  creators: number;
  /** Views the campaign should have by today on a straight line to the guarantee. */
  pace: number;
  gap: number;
  verdict: Verdict;
  window: { days: number; today: number };
  /** Posts that went up on each day of the window (index 0 = day 1). */
  postsByDay: number[];
  /** Posts still expected on each day (from today on). */
  dueByDay: number[];
}

export function projectTotals(p: Project, today: string): ProjectTotals {
  const window = projectWindow(p, today);
  let views = 0;
  let engagements = 0;
  let viewsWithEng = 0;
  for (const post of p.posts) {
    const n = postNumbers(post);
    if (n.views !== null) views += n.views;
    if (n.engagements !== null) engagements += n.engagements;
    if (n.views !== null && n.engagements !== null) viewsWithEng += n.views;
  }
  const g = p.guarantee ?? 0;
  // Views can't come in before the first post is due, so the straight line to
  // the guarantee starts on the earliest due date (or day 1 when none is set).
  const dues = p.creators.map((c) => c.dueDate).filter((d): d is string => !!d && d >= p.startDate && d <= p.endDate);
  const first = dues.length ? Math.max(0, daysBetween(p.startDate, dues.sort()[0])) : 0;
  const span = Math.max(1, window.days - first);
  const pace = g ? Math.round((g * Math.max(0, Math.min(span, window.today - first))) / span) : 0;
  const gap = views - pace;
  const verdict: Verdict = !g
    ? "no-guarantee"
    : views >= g
      ? "met"
      : window.today === 0 || (pace === 0 && views === 0)
        ? "not-started"
        : gap >= g * 0.05
          ? "ahead"
          : gap >= -g * 0.02
            ? "on-track"
            : "behind";

  const postsByDay = Array.from({ length: window.days }, () => 0);
  for (const post of p.posts) {
    if (!post.postedDate) continue;
    const i = daysBetween(p.startDate, post.postedDate);
    if (i >= 0 && i < window.days) postsByDay[i] += 1;
  }
  const dueByDay = Array.from({ length: window.days }, () => 0);
  for (const pc of p.creators) {
    const missing = pc.postsAgreed - postsBy(p, pc.creatorId).length;
    if (missing <= 0 || !pc.dueDate) continue;
    const i = Math.max(daysBetween(p.startDate, pc.dueDate), window.today); // overdue ones count from today
    if (i >= 0 && i < window.days) dueByDay[i] += missing;
  }

  return {
    views,
    engagements,
    erByViews: viewsWithEng > 0 ? engagements / viewsWithEng : null,
    posts: p.posts.filter((x) => x.creatorId).length,
    postsAgreed: p.creators.reduce((s, c) => s + c.postsAgreed, 0),
    creators: p.creators.length,
    pace,
    gap,
    verdict,
    window,
    postsByDay,
    dueByDay,
  };
}

/* ── What needs chasing ──────────────────────────────────────── */

export interface AttentionItem {
  id: string;
  tone: "bad" | "warn";
  title: string;
  detail: string;
  /** What fixes it: a creator to chase, or a post to sort out. */
  creatorId?: string;
  postId?: string;
}

/** Engagement by views under this is called out (it's "poor" on Instagram). */
export const LOW_ER = 0.03;

export function attentionItems(p: Project, today: string, nameOf: (creatorId: string) => string): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const pc of p.creators) {
    if (creatorState(p, pc, today) !== "late" || !pc.dueDate) continue;
    const days = daysBetween(pc.dueDate, today);
    items.push({
      id: `late-${pc.creatorId}`,
      tone: "bad",
      title: `${nameOf(pc.creatorId)} hasn't posted`,
      detail: `Due ${days === 1 ? "yesterday" : `${days} days ago`} · no link yet`,
      creatorId: pc.creatorId,
    });
  }
  for (const post of p.posts) {
    if (!post.creatorId) {
      const guess = post.suggestedCreatorId ? nameOf(post.suggestedCreatorId) : null;
      items.push({
        id: `who-${post.id}`,
        tone: "warn",
        title: guess ? `Is this ${guess}'s post?` : "A link isn't matched to a creator",
        detail: post.sheetLabel ? `Sheet says "${post.sheetLabel}"` : shortUrl(post.url),
        postId: post.id,
      });
      continue;
    }
    const name = nameOf(post.creatorId);
    if (post.problem) {
      items.push({ id: `prob-${post.id}`, tone: "bad", title: `${name}: couldn't read the post`, detail: post.problem, postId: post.id });
      continue;
    }
    const n = postNumbers(post);
    const age = post.postedDate ? daysBetween(post.postedDate, today) : 0;
    if (!n.check && age >= 2) {
      items.push({
        id: `nonum-${post.id}`,
        tone: "warn",
        title: `${name}: no numbers yet`,
        detail: `Posted ${post.postedDate ? shortDate(post.postedDate) : ""} · not checked`,
        postId: post.id,
      });
    } else if (n.er !== null && n.er < LOW_ER && age >= 3) {
      items.push({
        id: `er-${post.id}`,
        tone: "warn",
        title: `${name}: low engagement`,
        detail: `${(n.er * 100).toFixed(1)}% by views, under ${LOW_ER * 100}%`,
        postId: post.id,
      });
    }
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60);
}

/* ── Pasted links ────────────────────────────────────────────── */

export function platformOfUrl(url: string): Platform | null {
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  return null;
}

/** Lowercase letters and digits only, so "Kemi.Cooks" and "kemi_cooks" compare equal. */
function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Handle written into the link itself, e.g. tiktok.com/@handle/video/… or instagram.com/handle/reel/…. */
export function handleInUrl(url: string): string | null {
  const tt = url.match(/tiktok\.com\/@([\w.]+)/i);
  if (tt) return tt[1];
  const yt = url.match(/youtube\.com\/@([\w.-]+)/i);
  if (yt) return yt[1];
  const ig = url.match(/instagram\.com\/([\w.]+)\/(?:p|reel|reels|tv)\//i);
  if (ig) return ig[1];
  return null;
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export interface PastedLink {
  url: string;
  platform: Platform | null;
  /** Matched creator, when sure. */
  creatorId: string | null;
  /** A close guess the team should confirm. */
  suggestion: string | null;
  /** How the match was made, in words. */
  how: string | null;
  /** Already on the project. */
  duplicate: boolean;
}

/**
 * Reads links pasted from WhatsApp, email or a sheet. A link is matched to a
 * creator on the project by the handle in the link, or by a handle or name
 * written on the same line ("Kemi - https://…"). Near misses become suggestions.
 */
export function readPastedLinks(text: string, project: Project, creators: Creator[]): PastedLink[] {
  const onProject = creators.filter((c) => project.creators.some((pc) => pc.creatorId === c.id));
  const known = new Set(project.posts.map((x) => normaliseUrl(x.url)));
  const seen = new Set<string>();
  const out: PastedLink[] = [];
  for (const line of text.split(/\r?\n/)) {
    const urls = line.match(/https?:\/\/[^\s,;)"'<>]+/g) ?? [];
    const words = line.replace(/https?:\/\/\S+/g, " ");
    for (const raw of urls) {
      const url = raw.replace(/[.,]+$/, "");
      const key = normaliseUrl(url);
      if (seen.has(key)) continue;
      seen.add(key);
      const platform = platformOfUrl(url);
      const pool = platform ? onProject.filter((c) => c.platform === platform) : onProject;
      let creatorId: string | null = null;
      let suggestion: string | null = null;
      let how: string | null = null;

      const inUrl = handleInUrl(url);
      if (inUrl) {
        const hit = pool.find((c) => squash(c.handle) === squash(inUrl));
        if (hit) [creatorId, how] = [hit.id, "handle in the link"];
        else suggestion = closest(inUrl, pool)?.id ?? null;
      }
      if (!creatorId) {
        // Handle or name on the same line.
        const tokens = words.split(/[\s\-–:|]+/).filter((t) => t.replace(/[^a-z0-9]/gi, "").length >= 3);
        const lineKey = squash(words);
        const byHandle = pool.find((c) => tokens.some((t) => squash(t) === squash(c.handle)));
        const byName = pool.find((c) => squash(c.name).length >= 4 && lineKey.includes(squash(c.name)));
        const hit = byHandle ?? byName;
        if (hit) [creatorId, how] = [hit.id, byHandle ? "handle written next to it" : "name written next to it"];
        else if (!suggestion) {
          // A first name on its own ("Tolu - https://…") is a guess, and only when one creator has it.
          const firsts = pool.filter((c) => tokens.some((t) => squash(t).length >= 3 && squash(c.name.split(/\s+/)[0] ?? "") === squash(t)));
          if (firsts.length === 1) suggestion = firsts[0].id;
        }
        if (!creatorId && !suggestion) {
          for (const t of tokens) {
            const near = closest(t, pool);
            if (near) {
              suggestion = near.id;
              break;
            }
          }
        }
      }
      out.push({ url, platform, creatorId, suggestion: creatorId ? null : suggestion, how, duplicate: known.has(key) });
    }
  }
  return out;
}

/** The creator whose handle is within two letters of `text`, if exactly one is. */
function closest(text: string, pool: Creator[]): Creator | null {
  const t = squash(text.replace(/^@/, ""));
  if (t.length < 4) return null;
  const near = pool.filter((c) => editDistance(t, squash(c.handle)) <= 2);
  return near.length === 1 ? near[0] : null;
}

/** Same post, written differently: no tracking bits, no trailing slash, any case. */
export function normaliseUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\/(www\.|m\.)?/i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/* ── Forms ───────────────────────────────────────────────────── */

/** Split "a, b\nc" into ["a", "b", "c"]. */
export function splitList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Read "1.5m", "750k", "750,000" as a number of views. */
export function parseViews(s: string): number | null {
  const m = s
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1));
}
