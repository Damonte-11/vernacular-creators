/** Converts between database rows (snake_case) and the app's types. */
import { APP_DEFAULTS } from "@config/app";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import type { CampaignResult, Creator, Post, Settings, Shortlist, Snapshot } from "../types";

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
  refresh_interval_hours: number;
}

export function settingsFromRow(r: SettingsRow | null): Settings {
  if (!r) return { weights: { ...DEFAULT_SCORE_WEIGHTS }, ...APP_DEFAULTS };
  return {
    weights: { ...DEFAULT_SCORE_WEIGHTS, ...r.weights },
    recentPostCount: r.recent_post_count,
    minPostAgeHours: r.min_post_age_hours,
    minPostAgeHoursYoutube: r.min_post_age_hours_youtube ?? APP_DEFAULTS.minPostAgeHoursYoutube,
    instagramViewsShare: r.instagram_views_share ?? APP_DEFAULTS.instagramViewsShare,
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
    refresh_interval_hours: s.refreshIntervalHours,
  };
}

export interface ShortlistRow {
  id: string;
  name: string;
  client: string;
  share_token: string;
  created_at: string;
  shortlist_items?: { creator_id: string; added_at: string }[];
}

export const SHORTLIST_SELECT = "id, name, client, share_token, created_at, shortlist_items(creator_id, added_at)";

export function shortlistFromRow(r: ShortlistRow): Shortlist {
  return {
    id: r.id,
    name: r.name,
    client: r.client,
    createdAt: r.created_at,
    shareToken: r.share_token,
    items: (r.shortlist_items ?? [])
      .map((i) => ({ creatorId: i.creator_id, addedAt: i.added_at }))
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
