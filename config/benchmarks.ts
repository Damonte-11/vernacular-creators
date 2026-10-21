import type { SizeBandId } from "./size-bands";

type Platform = "instagram" | "youtube" | "tiktok";

/**
 * "Normal" numbers per platform and size band. Starting points based on
 * public industry averages; adjust as Vernacular learns its own market.
 * All rates are fractions: 0.03 = 3%.
 *
 * Each band's numbers apply exactly at that band's "anchor" follower count
 * (BAND_ANCHORS below). Between anchors the app blends smoothly, so there's no
 * sudden jump when a creator crosses from one band into the next.
 */

/** Follower count where each band's numbers apply exactly. */
export const BAND_ANCHORS: Record<SizeBandId, number> = {
  nano: 5_000,
  micro: 25_000,
  mid: 100_000,
  macro: 500_000,
  mega: 2_000_000,
};

/**
 * Engagement rate by followers = typical (likes + comments) per post / followers.
 * Below `poor` is labelled "poor", below `average` "average",
 * below `good` "good", and anything above that "great".
 */
export const ENGAGEMENT_BENCHMARKS: Record<
  Platform,
  Record<SizeBandId, { poor: number; average: number; good: number }>
> = {
  instagram: {
    nano: { poor: 0.02, average: 0.04, good: 0.07 },
    micro: { poor: 0.015, average: 0.03, good: 0.05 },
    mid: { poor: 0.01, average: 0.02, good: 0.035 },
    macro: { poor: 0.008, average: 0.015, good: 0.025 },
    mega: { poor: 0.005, average: 0.012, good: 0.02 },
  },
  // YouTube engagement per subscriber is naturally lower: most viewers
  // aren't subscribers and few viewers like or comment.
  youtube: {
    nano: { poor: 0.008, average: 0.016, good: 0.035 },
    micro: { poor: 0.005, average: 0.011, good: 0.024 },
    mid: { poor: 0.003, average: 0.007, good: 0.015 },
    macro: { poor: 0.002, average: 0.005, good: 0.01 },
    mega: { poor: 0.001, average: 0.003, good: 0.006 },
  },
  // TikTok shows videos to non-followers too, so likes per follower run higher.
  tiktok: {
    nano: { poor: 0.04, average: 0.08, good: 0.15 },
    micro: { poor: 0.03, average: 0.06, good: 0.11 },
    mid: { poor: 0.02, average: 0.045, good: 0.08 },
    macro: { poor: 0.015, average: 0.03, good: 0.06 },
    mega: { poor: 0.01, average: 0.02, good: 0.04 },
  },
};

/**
 * Reach per post as a share of followers, used ONLY when a creator has no
 * public view counts. `low`–`high` is the range shown; `mid` is the centre.
 */
export const REACH_RATIOS: Record<
  Platform,
  Record<SizeBandId, { low: number; mid: number; high: number }>
> = {
  instagram: {
    nano: { low: 0.25, mid: 0.35, high: 0.45 },
    micro: { low: 0.18, mid: 0.26, high: 0.35 },
    mid: { low: 0.12, mid: 0.19, high: 0.28 },
    macro: { low: 0.08, mid: 0.13, high: 0.2 },
    mega: { low: 0.05, mid: 0.09, high: 0.15 },
  },
  youtube: {
    nano: { low: 0.1, mid: 0.2, high: 0.35 },
    micro: { low: 0.08, mid: 0.15, high: 0.25 },
    mid: { low: 0.05, mid: 0.1, high: 0.18 },
    macro: { low: 0.03, mid: 0.07, high: 0.12 },
    mega: { low: 0.02, mid: 0.05, high: 0.09 },
  },
  tiktok: {
    nano: { low: 0.3, mid: 0.5, high: 0.8 },
    micro: { low: 0.2, mid: 0.35, high: 0.6 },
    mid: { low: 0.12, mid: 0.22, high: 0.4 },
    macro: { low: 0.08, mid: 0.15, high: 0.28 },
    mega: { low: 0.05, mid: 0.1, high: 0.18 },
  },
};

/**
 * A "healthy" average views-to-followers ratio per band. Used by the
 * views factor of the Creator Score: hitting this ratio scores 75/100,
 * double it scores 100.
 */
export const VIEWS_RATIO_TARGETS: Record<Platform, Record<SizeBandId, number>> = {
  instagram: { nano: 0.5, micro: 0.35, mid: 0.25, macro: 0.18, mega: 0.12 },
  youtube: { nano: 0.3, micro: 0.2, mid: 0.12, macro: 0.08, mega: 0.05 },
  tiktok: { nano: 0.8, micro: 0.5, mid: 0.3, macro: 0.2, mega: 0.12 },
};

/** Posts per 30 days that count as "posting regularly" (full marks). */
export const POSTING_FREQUENCY_TARGET: Record<Platform, number> = {
  instagram: 8,
  youtube: 4,
  tiktok: 12,
};

/** How logged campaign results are blended into benchmark reach estimates. */
export const CAMPAIGN_BLEND = {
  /** Minimum logged results (in the same band) before they are used at all. */
  minResults: 2,
  /** Prefer results from the same niche + band once there are this many. */
  minNicheResults: 3,
  /** Higher = logged data needs more results before it outweighs benchmarks. */
  smoothing: 5,
  /** Logged data never gets more than this share of the weight. */
  maxWeight: 0.7,
};

/**
 * Engagement rate by views = (likes + comments) / views, on posts that have
 * views (Instagram Reels, YouTube and TikTok videos). Barely depends on account size.
 */
export const VIEW_ENGAGEMENT_BENCHMARKS: Record<Platform, { poor: number; average: number; good: number }> = {
  instagram: { poor: 0.03, average: 0.06, good: 0.1 },
  youtube: { poor: 0.015, average: 0.03, good: 0.05 },
  tiktok: { poor: 0.03, average: 0.05, good: 0.09 },
};

/**
 * Views count repeat plays, so fewer people are reached than there are views.
 * Estimated reach = views × this. Logged campaign results that include both
 * reach and views adjust it over time.
 */
export const VIEWS_TO_REACH = 0.6;

/** Engagement score: share given to engagement by views (when available) vs by followers. */
export const VIEW_ENGAGEMENT_SCORE_SHARE = 0.5;
