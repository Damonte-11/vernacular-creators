import type { SizeBandId } from "@config/size-bands";
import type { ScoreFactor } from "@config/scoring";

export type Platform = "instagram" | "youtube" | "tiktok";
export type PostType = "image" | "carousel" | "reel" | "video" | "short" | "slideshow";

export interface Post {
  id: string;
  platformPostId: string;
  type: PostType;
  postedAt: string; // ISO date
  /** null = the creator hides like counts. */
  likes: number | null;
  comments: number;
  /** null = no public view count for this post (e.g. Instagram photos). */
  views: number | null;
  url: string;
  caption: string;
  /** Set aside by the team (e.g. a known paid ad): left out of all averages. */
  excluded?: boolean;
}

export interface Snapshot {
  followers: number;
  capturedAt: string; // ISO date
}

export interface Creator {
  id: string;
  platform: Platform;
  platformId: string;
  handle: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  niche: string | null;
  city: string | null;
  country: string;
  followers: number;
  mediaCount: number;
  /** "professional" = an Instagram business or creator account (the API doesn't say which). */
  accountType: "business" | "creator" | "professional" | "channel";
  /** Stage 3: the creator connected their own account. */
  verified: boolean;
  /**
   * Accounts with the same personId belong to the same person (e.g. their
   * Instagram, TikTok and YouTube). Numbers always stay separate per account.
   */
  personId?: string | null;
  lastFetchedAt: string;
  notes: string;
  tags: string[];
  posts: Post[];
  snapshots: Snapshot[];
  isSample: boolean;
}

export interface Settings {
  weights: Record<ScoreFactor, number>;
  recentPostCount: number;
  /** Instagram and TikTok: posts newer than this are left out (numbers still growing). */
  minPostAgeHours: number;
  /** YouTube: videos newer than this are left out. */
  minPostAgeHoursYoutube: number;
  /** Instagram: % of the API view count that's counted (see config/app.ts). */
  instagramViewsShare: number;
  refreshIntervalHours: number;
}

export type EngagementLabel = "poor" | "average" | "good" | "great";

export interface Range {
  low: number;
  high: number;
}

export type SetAsideReason = "team" | "high_engagement" | "high_views";

export interface Metrics {
  band: SizeBandId;
  /** Latest posts vs the full set (e.g. +0.35 = 35% above usual). Null when there aren't enough posts. */
  trend: { recentPosts: number; change: number } | null;
  /** Every recent post looked at (newest first), including any set aside. */
  postsUsed: Post[];
  /** The posts likes, comments and engagement are based on: the latest normal posts, with set-aside ones replaced by older posts. */
  typicalPosts: Post[];
  /** Posts left out, and why (team exclusion, or unusually high: possibly boosted). */
  setAside: { post: Post; reason: SetAsideReason }[];
  /** Posts the views numbers are based on (may reach further back than postsUsed). */
  viewPosts: Post[];
  /** Average likes / comments per post (trimmed: the most extreme posts dropped), after setting posts aside. */
  avgLikes: number | null;
  avgComments: number | null;
  /** Views of the middle post (median), after setting posts aside. */
  /** Typical views, after the views adjustment. */
  avgViews: number | null;
  /** Share of each post's raw view count that is counted (1 = all of it). */
  viewsAdjustment: number;
  viewPostCount: number;
  likesHidden: boolean;
  /** (likes + comments) per post ÷ followers. */
  engagementRate: number | null;
  engagementLabel: EngagementLabel | null;
  /** (likes + comments) ÷ views, on posts with views: how much the people who watch react. */
  viewEngagementRate: number | null;
  viewEngagementLabel: EngagementLabel | null;
  /** Too few posts behind the numbers to be sure. */
  lowConfidence: boolean;
  expectedEngagements: Range | null;
}

export interface ReachEstimate {
  low: number;
  high: number;
  method: "views" | "benchmark" | "benchmark+campaigns";
  note: string;
}

export type FlagSeverity = "low" | "medium" | "high";

export interface Flag {
  type:
    | "low_engagement"
    | "high_engagement"
    | "engagement_swings"
    | "follower_jump"
    | "likes_comments_ratio"
    | "posting_gap"
    | "boosted_posts"
    | "inactive_followers";
  severity: FlagSeverity;
  message: string;
}

export interface ScoreResult {
  total: number | null;
  breakdown: Partial<Record<ScoreFactor, number>>;
  /** Weights actually applied, re-balanced to add up to 1. */
  weightsUsed: Partial<Record<ScoreFactor, number>>;
  missing: { factor: ScoreFactor; reason: string }[];
}

export interface CampaignResult {
  id: string;
  creatorId: string;
  postUrl: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  loggedBy: string;
  loggedAt: string;
}

export interface CreatorAnalysis {
  creator: Creator;
  metrics: Metrics;
  reach: ReachEstimate;
  flags: Flag[];
  score: ScoreResult;
}

export interface ShortlistItem {
  creatorId: string;
  addedAt: string;
}

export interface Shortlist {
  id: string;
  name: string;
  client: string;
  createdAt: string;
  items: ShortlistItem[];
  /** Secret part of the public view-only report link (live mode). */
  shareToken?: string;
}

/** Fields the team edits by hand. */
export interface CreatorEdits {
  niche?: string | null;
  city?: string | null;
  country?: string;
  /** Demo only: posts the team has set aside (live mode saves this on the post). */
  excludedPostIds?: string[];
  notes?: string;
  tags?: string[];
  personId?: string | null;
}
