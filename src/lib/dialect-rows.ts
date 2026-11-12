/** Dialect database rows ↔ the app's types. Used by the browser store and the server jobs. */
import {
  DEFAULT_CONTENT_TYPES,
  type AdDecision,
  type DialectPlatform,
  type DialectPost,
  type DialectProject,
  type PostFormat,
  type Purpose,
  type Totals,
} from "./dialect";

export interface DialectProjectRow {
  id: string;
  brand: string;
  client: string;
  platforms: { platform: DialectPlatform; handle: string }[];
  start_month: string;
  months: number;
  totals: Totals;
  month_targets: Record<string, Totals>;
  ad_rule: { views: number; timesUsual: number };
  competitors: string[];
  content_types: string[];
  follower_reads: DialectProject["followerReads"];
  followers_manual: Record<string, number>;
  commitments: DialectProject["commitments"];
  listening_cap_usd: number | string;
  reports: Record<string, unknown>;
  created_at: string;
  dialect_posts?: DialectPostRow[];
}

export interface DialectPostRow {
  id: string;
  project_id: string;
  platform: DialectPlatform;
  url: string;
  title: string;
  posted_at: string;
  format: PostFormat;
  content_type: string | null;
  purpose: Purpose | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  manual: boolean;
  possible_ad: boolean;
  decision: AdDecision | null;
  organic: { views: number; engagements: number } | null;
  caption?: string | null;
  last_read_at: string | null;
  read_problem: string | null;
}

const EMPTY_TOTALS: Totals = { views: 0, followers: 0, posts: 0, engagements: 0 };
const DEFAULT_AD_RULE: DialectProject["adRule"] = { views: 400_000, timesUsual: 5 };

export const DIALECT_SELECT = "*, dialect_posts(*)";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function dialectPostFromRow(r: DialectPostRow): DialectPost {
  return {
    id: r.id,
    platform: r.platform,
    url: r.url,
    title: r.title,
    postedAt: r.posted_at,
    format: r.format,
    contentType: r.content_type,
    purpose: r.purpose,
    views: num(r.views),
    likes: num(r.likes),
    comments: num(r.comments),
    shares: num(r.shares),
    saves: num(r.saves),
    manual: r.manual,
    possibleAd: r.possible_ad,
    decision: r.decision,
    organic: r.organic,
    lastReadAt: r.last_read_at,
    readProblem: r.read_problem,
  };
}

export function dialectProjectFromRow(r: DialectProjectRow): DialectProject {
  return {
    id: r.id,
    brand: r.brand,
    client: r.client,
    platforms: r.platforms ?? [],
    startMonth: r.start_month,
    months: r.months,
    totals: { ...EMPTY_TOTALS, ...((r.totals ?? {}) as Partial<Totals>) },
    monthTargets: r.month_targets ?? {},
    adRule: { ...DEFAULT_AD_RULE, ...((r.ad_rule ?? {}) as Partial<DialectProject["adRule"]>) },
    competitors: r.competitors ?? [],
    contentTypes: r.content_types?.length ? r.content_types : [...DEFAULT_CONTENT_TYPES],
    followerReads: r.follower_reads ?? [],
    followersManual: r.followers_manual ?? {},
    commitments: r.commitments ?? {},
    listeningCapUsd: Number(r.listening_cap_usd ?? 3),
    reports: r.reports ?? {},
    posts: (r.dialect_posts ?? []).map(dialectPostFromRow).sort((a, b) => a.postedAt.localeCompare(b.postedAt)),
  };
}

/** The project fields a manager can change, as database columns. */
export function dialectProjectToRow(p: Partial<DialectProject>): Partial<DialectProjectRow> {
  const r: Partial<DialectProjectRow> = {};
  if (p.brand !== undefined) r.brand = p.brand;
  if (p.client !== undefined) r.client = p.client;
  if (p.platforms !== undefined) r.platforms = p.platforms;
  if (p.startMonth !== undefined) r.start_month = p.startMonth;
  if (p.months !== undefined) r.months = p.months;
  if (p.totals !== undefined) r.totals = p.totals;
  if (p.monthTargets !== undefined) r.month_targets = p.monthTargets;
  if (p.adRule !== undefined) r.ad_rule = p.adRule;
  if (p.competitors !== undefined) r.competitors = p.competitors.filter(Boolean);
  if (p.contentTypes !== undefined) r.content_types = p.contentTypes.filter(Boolean);
  if (p.followersManual !== undefined) r.followers_manual = p.followersManual;
  if (p.commitments !== undefined) r.commitments = p.commitments;
  if (p.listeningCapUsd !== undefined) r.listening_cap_usd = p.listeningCapUsd;
  return r;
}

/** The post fields a manager can change, as database columns. */
export function dialectPostToRow(x: Partial<DialectPost>): Partial<DialectPostRow> {
  const r: Partial<DialectPostRow> = {};
  if (x.platform !== undefined) r.platform = x.platform;
  if (x.url !== undefined) r.url = x.url;
  if (x.title !== undefined) r.title = x.title;
  if (x.postedAt !== undefined) r.posted_at = x.postedAt;
  if (x.format !== undefined) r.format = x.format;
  if (x.contentType !== undefined) r.content_type = x.contentType;
  if (x.purpose !== undefined) r.purpose = x.purpose;
  if (x.views !== undefined) r.views = x.views;
  if (x.likes !== undefined) r.likes = x.likes;
  if (x.comments !== undefined) r.comments = x.comments;
  if (x.shares !== undefined) r.shares = x.shares;
  if (x.saves !== undefined) r.saves = x.saves;
  if (x.manual !== undefined) r.manual = x.manual;
  if (x.possibleAd !== undefined) r.possible_ad = x.possibleAd;
  if (x.decision !== undefined) r.decision = x.decision;
  if (x.organic !== undefined) r.organic = x.organic;
  return r;
}
