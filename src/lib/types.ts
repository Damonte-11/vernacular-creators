import type { SizeBandId } from "@config/size-bands";
import type { ScoreFactor } from "@config/scoring";
import type { DiscoverySettings } from "@config/discovery";

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
  /** Contact email, entered by the team or imported (falls back to one found in the bio). */
  email?: string | null;
  /** Found by automatic discovery: where from, e.g. "Tagged by @kiekie". */
  discoveredVia?: string | null;
  discoveredAt?: string | null;
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
  /** Add and link accounts named in a creator's bio without asking. */
  autoLinkFromBio: boolean;
  refreshIntervalHours: number;
  /** Automatic discovery of new creators (see config/discovery.ts). */
  discovery: DiscoverySettings;
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

/** Where a creator is with a campaign, per list. */
export type ListStatus = "shortlisted" | "contacted" | "negotiating" | "active" | "ended" | "declined";

export interface ShortlistItem {
  creatorId: string;
  addedAt: string;
  /** The fields below are per list: the same creator can be Active on one campaign and Contacted on another. */
  status: ListStatus;
  /** Agreed or quoted fee for this campaign, in Naira. */
  rate: number | null;
  labels: string[];
  notes: string;
}

/** The fields the team edits on a list row. */
export type ListItemFields = Partial<Pick<ShortlistItem, "status" | "rate" | "labels" | "notes">>;

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
  email?: string | null;
}

/* ── Projects (Chorus campaigns) ─────────────────────────────── */

/** How a Chorus campaign is run: many small creators, a few big ones, or both. */
export type ChorusType = "seedlings" | "headliners" | "salad";

/** What the campaign is for. Decides which comment signals lead the report. */
export type CampaignObjective = "awareness" | "consideration" | "conversion";

/** The brief, in fields the app can check posts and comments against. */
export interface ProjectBrief {
  brand: string;
  product: string;
  keyMessage: string;
  mustSay: string[];
  hashtags: string[];
  dos: string[];
  donts: string[];
  competitors: string[];
  notes: string;
}

/** A creator booked on a project. */
export interface ProjectCreator {
  creatorId: string;
  /** Date (YYYY-MM-DD) their first post is due. */
  dueDate: string | null;
  postsAgreed: number;
}

/** One reading of a post's public numbers. `day` is days since it went up (1, 3, 7…). */
export interface PostCheck {
  day: number;
  checkedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** "manual" when someone typed the numbers in. */
  source: "auto" | "manual";
}

/** A campaign post: a link, who posted it, and its numbers over time. */
export interface ProjectPost {
  id: string;
  /** Null until it's matched to a creator on the project. */
  creatorId: string | null;
  url: string;
  platform: Platform | null;
  /** Date (YYYY-MM-DD) it went up. */
  postedDate: string | null;
  addedAt: string;
  /** Where the link came from. */
  source: "app" | "sheet";
  checks: PostCheck[];
  /** Why numbers couldn't be read, e.g. the post was deleted. */
  problem: string | null;
}

export type DocumentKind = "brief" | "contract" | "guidelines" | "deck" | "other";

/** A file or link kept with the project. Team-only. */
export interface ProjectDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  /** A Google Slides, Docs or Drive link, or any web link. Empty for an uploaded file. */
  url: string;
  /** Path of an uploaded file in storage (live only). */
  filePath: string | null;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  chorusType: ChorusType;
  vertical: string;
  /** First and last day of the campaign window (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  /** Views promised in writing. */
  guarantee: number | null;
  objective: CampaignObjective;
  brief: ProjectBrief;
  /** Google Sheet the team logs links in, for the sheet agent. */
  sheetUrl: string | null;
  /** Most comments read per post for the analysis. */
  commentCap: number;
  createdAt: string;
  creators: ProjectCreator[];
  posts: ProjectPost[];
  documents: ProjectDocument[];
}

/** The project fields edited on the project form. */
export type ProjectFields = Partial<Pick<Project, "name" | "client" | "chorusType" | "vertical" | "startDate" | "endDate" | "guarantee" | "objective" | "brief" | "sheetUrl" | "commentCap">>;
