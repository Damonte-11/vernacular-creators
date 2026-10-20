import { LOOKBACK_DAYS, MIN_POSTS_FOR_TREND, MIN_RECENT_POSTS, TREND_POSTS } from "@config/app";
import { ENGAGEMENT_BENCHMARKS, VIEW_ENGAGEMENT_BENCHMARKS } from "@config/benchmarks";
import { FLAG_THRESHOLDS } from "@config/flags";
import { smoothByFollowers } from "./benchmarks";
import type { Creator, EngagementLabel, Metrics, Post, SetAsideReason, Settings } from "./types";
import { DAY_MS, median, percentile, trimmedMean } from "./stats";
import { sizeBandFor } from "./size-bands";

/** How old a post must be before it counts, for this platform. */
export function minPostAgeHours(platform: Creator["platform"], settings: Pick<Settings, "minPostAgeHours" | "minPostAgeHoursYoutube">): number {
  return platform === "youtube" ? settings.minPostAgeHoursYoutube : settings.minPostAgeHours;
}

/** Posts old enough to count, newest first. */
export function eligiblePosts(posts: Post[], minAgeHours: number, now: number): Post[] {
  const cutoff = now - minAgeHours * 60 * 60 * 1000;
  return posts
    .filter((p) => new Date(p.postedAt).getTime() <= cutoff)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

/** Engagement thresholds for this exact follower count (blended between bands). */
export function engagementBenchmark(platform: Creator["platform"], followers: number) {
  return smoothByFollowers(ENGAGEMENT_BENCHMARKS[platform], followers);
}

function labelFor(rate: number, b: { poor: number; average: number; good: number }): EngagementLabel {
  if (rate < b.poor) return "poor";
  if (rate < b.average) return "average";
  if (rate < b.good) return "good";
  return "great";
}

export function engagementLabel(rate: number, platform: Creator["platform"], followers: number): EngagementLabel {
  return labelFor(rate, engagementBenchmark(platform, followers));
}

export function viewEngagementLabel(rate: number, platform: Creator["platform"]): EngagementLabel {
  return labelFor(rate, VIEW_ENGAGEMENT_BENCHMARKS[platform]);
}

/** Likes + comments for a post (just comments when likes are hidden). */
export function postEngagement(p: Post): number {
  return (p.likes ?? 0) + p.comments;
}

/**
 * Posts far above the creator's typical post (more than `outlierFactor` × the
 * median): likely boosted with paid ads, or a one-off viral hit. If too many
 * posts qualify, big posts are this creator's normal pattern, so none are.
 */
export function findOutliers(posts: Post[], value: (p: Post) => number): Set<string> {
  if (posts.length < FLAG_THRESHOLDS.minPostsForOutliers) return new Set();
  const typical = median(posts.map(value));
  if (!typical || typical <= 0) return new Set();
  const high = posts.filter((p) => value(p) > typical * FLAG_THRESHOLDS.outlierFactor);
  if (high.length > posts.length * FLAG_THRESHOLDS.maxOutlierShare) return new Set();
  return new Set(high.map((p) => p.id));
}

interface Selection {
  /** The posts the numbers are based on, newest first (up to `count`). */
  chosen: Post[];
  /** Posts passed over on the way, and why. */
  setAside: { post: Post; reason: SetAsideReason }[];
  /** Every post looked at, newest first. */
  considered: Post[];
}

/**
 * Pick the latest `count` normal posts. Posts the team excluded, and posts far
 * above the creator's typical level (possibly boosted), are set aside and
 * replaced by the next older post. The newest MIN_RECENT_POSTS always count;
 * beyond those, posts must be newer than `cutoff`.
 */
export function selectPosts(
  sorted: Post[],
  count: number,
  value: (p: Post) => number,
  reason: SetAsideReason,
  cutoff: number,
): Selection {
  const inRange = (p: Post, i: number) => i < Math.min(count, MIN_RECENT_POSTS) || new Date(p.postedAt).getTime() >= cutoff;
  const candidates = sorted.filter(inRange);
  // "Typical" is judged on a wider sample (up to twice the count) so it stays steady.
  const outliers = findOutliers(candidates.filter((p) => !p.excluded).slice(0, count * 2), value);

  const result: Selection = { chosen: [], setAside: [], considered: [] };
  for (const p of candidates) {
    if (result.chosen.length >= count) break;
    result.considered.push(p);
    if (p.excluded) result.setAside.push({ post: p, reason: "team" });
    else if (outliers.has(p.id)) result.setAside.push({ post: p, reason });
    else result.chosen.push(p);
  }
  return result;
}

export function computeMetrics(creator: Creator, settings: Settings, now: number): Metrics {
  const band = sizeBandFor(creator.followers);
  const cutoff = now - LOOKBACK_DAYS * DAY_MS;
  const all = eligiblePosts(creator.posts, minPostAgeHours(creator.platform, settings), now);

  // Engagement: the latest normal posts, replacing any set aside with older ones.
  const engagement = selectPosts(all, settings.recentPostCount, postEngagement, "high_engagement", cutoff);
  const postsUsed = engagement.considered;
  const typicalPosts = engagement.chosen;
  const setAside = [...engagement.setAside];

  const withLikes = typicalPosts.filter((p) => p.likes !== null);
  const likesHidden = postsUsed.length > 0 && postsUsed.every((p) => p.likes === null);
  const avgLikes = trimmedMean(withLikes.map((p) => p.likes as number));
  const avgComments = trimmedMean(typicalPosts.map((p) => p.comments));

  // Views: the latest posts that have views (Instagram only has them on Reels).
  const withViews = all.filter((p) => p.views !== null);
  const views = selectPosts(withViews, settings.recentPostCount, (p) => p.views as number, "high_views", cutoff);
  for (const x of views.setAside) if (!setAside.some((y) => y.post.id === x.post.id)) setAside.push(x);
  const viewPosts = views.chosen;
  // Views are more lopsided than likes (a few Reels take off), so use the middle
  // post: the safer figure to promise a client.
  const avgViews = median(viewPosts.map((p) => p.views as number));

  let engagementRate: number | null = null;
  let label: EngagementLabel | null = null;
  let expectedEngagements: Metrics["expectedEngagements"] = null;
  const lowConfidence = typicalPosts.length < FLAG_THRESHOLDS.minPostsForConfidence;

  if (withLikes.length > 0 && creator.followers > 0) {
    const perPost = withLikes.map(postEngagement);
    engagementRate = trimmedMean(perPost)! / creator.followers;
    label = engagementLabel(engagementRate, creator.platform, creator.followers);
    // With few posts, show a wider range (10th–90th percentile instead of the middle 50%).
    const [lo, hi] = lowConfidence ? [0.1, 0.9] : [0.25, 0.75];
    expectedEngagements = { low: percentile(perPost, lo)!, high: percentile(perPost, hi)! };
  }

  // Engagement per view: how much the people who actually watched reacted.
  const viewRatios = viewPosts.filter((p) => p.likes !== null && (p.views as number) > 0).map((p) => postEngagement(p) / (p.views as number));
  const viewEngagementRate = trimmedMean(viewRatios);

  return {
    band,
    trend: recentTrend(typicalPosts),
    postsUsed,
    typicalPosts,
    setAside,
    viewPosts,
    avgLikes,
    avgComments,
    avgViews,
    viewPostCount: viewPosts.length,
    likesHidden,
    engagementRate,
    engagementLabel: label,
    viewEngagementRate,
    viewEngagementLabel: viewEngagementRate === null ? null : viewEngagementLabel(viewEngagementRate, creator.platform),
    lowConfidence,
    expectedEngagements,
  };
}

/**
 * How the newest posts compare with the full set: e.g. +0.35 means the latest
 * 10 posts got 35% more engagement than this creator's usual level. Shown
 * separately so a hot streak (or a slump) is visible without changing the
 * headline numbers.
 */
export function recentTrend(typicalPosts: Post[]): Metrics["trend"] {
  if (typicalPosts.length < MIN_POSTS_FOR_TREND) return null;
  const all = trimmedMean(typicalPosts.map(postEngagement));
  const recent = trimmedMean(typicalPosts.slice(0, TREND_POSTS).map(postEngagement));
  if (!all || recent === null) return null;
  return { recentPosts: TREND_POSTS, change: recent / all - 1 };
}

export function daysBetween(a: string | number, b: string | number): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;
}
