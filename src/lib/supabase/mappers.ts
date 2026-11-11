/** Converts between database rows (snake_case) and the app's types. */
import { APP_DEFAULTS } from "@config/app";
import { DISCOVERY_DEFAULTS, type DiscoverySettings } from "@config/discovery";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { emptyBrief } from "../projects";
import type {
  CampaignObjective,
  CampaignResult,
  ChorusType,
  Creator,
  DocumentKind,
  ListStatus,
  Platform,
  Post,
  PostCheck,
  Project,
  ProjectBrief,
  ProjectFields,
  Settings,
  Shortlist,
  Snapshot,
} from "../types";

export interface PostRow {
  platform_post_id: string;
  type: Post["type"];
  posted_at: string;
  likes: number | null;
  comments: number;
  views: number | null;
  url: string;
  caption: string;
  excluded?: boolean;
}

export interface SnapshotRow {
  followers: number;
  captured_at: string;
}

export interface CreatorRow {
  id: string;
  platform: Creator["platform"];
  platform_id: string;
  handle: string;
  name: string;
  photo_url: string | null;
  bio: string;
  niche: string | null;
  city: string | null;
  country: string;
  followers: number;
  media_count: number;
  account_type: Creator["accountType"];
  verified: boolean;
  last_fetched_at: string;
  notes: string;
  tags: string[];
  /** Added in migration 0007; missing until it's run. */
  person_id?: string | null;
  /** Added in migration 0009. */
  email?: string | null;
  /** Added in migration 0010. */
  discovered_via?: string | null;
  discovered_at?: string | null;
  posts?: PostRow[];
  creator_snapshots?: SnapshotRow[];
}

/** The select string that loads a creator with posts and follower history. */
export const CREATOR_SELECT = "*, posts(*), creator_snapshots(followers, captured_at)";

export function creatorFromRow(r: CreatorRow): Creator {
  return {
    id: r.id,
    platform: r.platform,
    platformId: r.platform_id,
    handle: r.handle,
    name: r.name || r.handle,
    photoUrl: r.photo_url,
    bio: r.bio,
    niche: r.niche,
    city: r.city,
    country: r.country,
    followers: r.followers,
    mediaCount: r.media_count,
    accountType: r.account_type,
    verified: r.verified,
    lastFetchedAt: r.last_fetched_at,
    notes: r.notes,
    tags: r.tags ?? [],
    personId: r.person_id ?? null,
    email: r.email ?? null,
    discoveredVia: r.discovered_via ?? null,
    discoveredAt: r.discovered_at ?? null,
    posts: (r.posts ?? []).map((p) => ({
      id: `${r.id}-${p.platform_post_id}`,
      platformPostId: p.platform_post_id,
      type: p.type,
      postedAt: p.posted_at,
      likes: p.likes,
      comments: p.comments,
      views: p.views,
      url: p.url,
      caption: p.caption,
      excluded: p.excluded === true,
    })),
    snapshots: (r.creator_snapshots ?? []).map((s): Snapshot => ({ followers: s.followers, capturedAt: s.captured_at })),
    isSample: false,
  };
}

export interface SettingsRow {
  weights: Partial<Settings["weights"]>;
  recent_post_count: number;
  min_post_age_hours: number;
  /** Added in migration 0003; missing until it's run. */
  min_post_age_hours_youtube?: number;
  /** Added in migration 0005; missing until it's run. */
  instagram_views_share?: number;
  /** Added in migration 0008; missing until it's run. */
  auto_link_from_bio?: boolean;
  /** Added in migration 0010; missing until it's run. */
  discovery?: Partial<DiscoverySettings>;
  refresh_interval_hours: number;
}

export function settingsFromRow(r: SettingsRow | null): Settings {
  if (!r) return { weights: { ...DEFAULT_SCORE_WEIGHTS }, ...APP_DEFAULTS, discovery: { ...DISCOVERY_DEFAULTS } };
  return {
    weights: { ...DEFAULT_SCORE_WEIGHTS, ...r.weights },
    recentPostCount: r.recent_post_count,
    minPostAgeHours: r.min_post_age_hours,
    minPostAgeHoursYoutube: r.min_post_age_hours_youtube ?? APP_DEFAULTS.minPostAgeHoursYoutube,
    instagramViewsShare: r.instagram_views_share ?? APP_DEFAULTS.instagramViewsShare,
    autoLinkFromBio: r.auto_link_from_bio ?? APP_DEFAULTS.autoLinkFromBio,
    discovery: { ...DISCOVERY_DEFAULTS, ...r.discovery },
    refreshIntervalHours: r.refresh_interval_hours,
  };
}

export function settingsToRow(s: Settings): SettingsRow {
  return {
    weights: s.weights,
    recent_post_count: s.recentPostCount,
    min_post_age_hours: s.minPostAgeHours,
    min_post_age_hours_youtube: s.minPostAgeHoursYoutube,
    instagram_views_share: s.instagramViewsShare,
    auto_link_from_bio: s.autoLinkFromBio,
    discovery: s.discovery,
    refresh_interval_hours: s.refreshIntervalHours,
  };
}

export interface ShortlistRow {
  id: string;
  name: string;
  client: string;
  share_token: string;
  created_at: string;
  shortlist_items?: ShortlistItemRow[];
}

/** Columns from migration 0009 are optional so lists still load before it's run. */
export interface ShortlistItemRow {
  creator_id: string;
  added_at: string;
  status?: ListStatus;
  rate?: number | string | null;
  labels?: string[];
  notes?: string;
}

// "*" for the items so the newer columns are picked up once they exist.
export const SHORTLIST_SELECT = "id, name, client, share_token, created_at, shortlist_items(*)";

export function shortlistFromRow(r: ShortlistRow): Shortlist {
  return {
    id: r.id,
    name: r.name,
    client: r.client,
    createdAt: r.created_at,
    shareToken: r.share_token,
    items: (r.shortlist_items ?? [])
      .map((i) => ({
        creatorId: i.creator_id,
        addedAt: i.added_at,
        status: i.status ?? "shortlisted",
        rate: i.rate === null || i.rate === undefined ? null : Number(i.rate),
        labels: i.labels ?? [],
        notes: i.notes ?? "",
      }))
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
  };
}

export interface CampaignResultRow {
  id: string;
  creator_id: string;
  post_url: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  logged_by: string;
  logged_at: string;
}

export function campaignResultFromRow(r: CampaignResultRow): CampaignResult {
  return {
    id: r.id,
    creatorId: r.creator_id,
    postUrl: r.post_url,
    reach: r.reach,
    impressions: r.impressions,
    views: r.views,
    loggedBy: r.logged_by,
    loggedAt: r.logged_at,
  };
}

/* ── Projects ────────────────────────────────────────────────── */

export const PROJECT_SELECT = "*, project_creators(*), project_posts(*), project_documents(*)";

export interface ProjectRow {
  id: string;
  name: string;
  client: string;
  chorus_type: ChorusType;
  vertical: string;
  start_date: string;
  end_date: string;
  guarantee: number | string | null;
  objective: CampaignObjective;
  brief: Partial<ProjectBrief> | null;
  sheet_url: string | null;
  comment_cap: number;
  created_at: string;
  project_creators?: { creator_id: string; due_date: string | null; posts_agreed: number }[];
  project_posts?: {
    id: string;
    creator_id: string | null;
    url: string;
    platform: Platform | null;
    posted_date: string | null;
    added_at: string;
    source: "app" | "sheet";
    checks: PostCheck[] | null;
    problem: string | null;
  }[];
  project_documents?: { id: string; kind: DocumentKind; title: string; url: string; file_path: string | null; added_at: string }[];
}

export function projectFromRow(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    client: r.client,
    chorusType: r.chorus_type,
    vertical: r.vertical,
    startDate: r.start_date,
    endDate: r.end_date,
    guarantee: r.guarantee === null ? null : Number(r.guarantee),
    objective: r.objective,
    brief: { ...emptyBrief(), ...(r.brief ?? {}) },
    sheetUrl: r.sheet_url,
    commentCap: r.comment_cap,
    createdAt: r.created_at,
    creators: (r.project_creators ?? []).map((c) => ({ creatorId: c.creator_id, dueDate: c.due_date, postsAgreed: c.posts_agreed })),
    posts: (r.project_posts ?? [])
      .map((x) => ({
        id: x.id,
        creatorId: x.creator_id,
        url: x.url,
        platform: x.platform,
        postedDate: x.posted_date,
        addedAt: x.added_at,
        source: x.source,
        checks: x.checks ?? [],
        problem: x.problem,
      }))
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
    documents: (r.project_documents ?? [])
      .map((d) => ({ id: d.id, kind: d.kind, title: d.title, url: d.url, filePath: d.file_path, addedAt: d.added_at }))
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
  };
}

/** Only the project fields that were given, as database columns. */
export function projectFieldsToRow(f: ProjectFields): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.name !== undefined) row.name = f.name;
  if (f.client !== undefined) row.client = f.client;
  if (f.chorusType !== undefined) row.chorus_type = f.chorusType;
  if (f.vertical !== undefined) row.vertical = f.vertical;
  if (f.startDate !== undefined) row.start_date = f.startDate;
  if (f.endDate !== undefined) row.end_date = f.endDate;
  if (f.guarantee !== undefined) row.guarantee = f.guarantee;
  if (f.objective !== undefined) row.objective = f.objective;
  if (f.brief !== undefined) row.brief = f.brief;
  if (f.sheetUrl !== undefined) row.sheet_url = f.sheetUrl;
  if (f.commentCap !== undefined) row.comment_cap = f.commentCap;
  return row;
}
