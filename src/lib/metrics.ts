import { LOOKBACK_DAYS } from "@config/app";
import { ENGAGEMENT_BENCHMARKS } from "@config/benchmarks";
import { FLAG_THRESHOLDS } from "@config/flags";
import type { Creator, EngagementLabel, Metrics, Post, SetAsideReason, Settings } from "./types";
import { DAY_MS, median, percentile } from "./stats";
import { sizeBandFor } from "./size-bands";

/** The most recent posts that are old enough to count, newest first. */
export function eligiblePosts(posts: Post[], settings: Pick<Settings, "recentPostCount" | "minPostAgeHours">, now: number): Post[] {
  const cutoff = now - settings.minPostAgeHours * 60 * 60 * 1000;
  return posts
    .filter((p) => new Date(p.postedAt).getTime() <= cutoff)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, settings.recentPostCount);
}

export function engagementLabel(
  rate: number,
  platform: Creator["platform"],
  band: Metrics["band"],
): EngagementLabel {
  const b = ENGAGEMENT_BENCHMARKS[platform][band];
  if (rate < b.poor) return "poor";
  if (rate < b.average) return "average";
  if (rate < b.good) return "good";
  return "great";
}

/** Likes + comments for a post (just comments when likes are hidden). */
export function postEngagement(p: Post): number {
  return (p.likes ?? 0) + p.comments;
}

/**
 * Posts far above the creator's typical post (more than `outlierFactor` × the
 * median): likely boosted with paid ads, or a one-off viral hit.
 */
export function findOutliers(posts: Post[], value: (p: Post) => number): Set<string> {
  if (posts.length < FLAG_THRESHOLDS.minPostsForOutliers) return new Set();
  const typical = median(posts.map(value));
  if (!typical || typical <= 0) return new Set();
  return new Set(posts.filter((p) => value(p) > typical * FLAG_THRESHOLDS.outlierFactor).map((p) => p.id));
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
 * replaced by the next older post. Replacements must be newer than `cutoff`.
 */
export function selectPosts(
  sorted: Post[],
  count: number,
  value: (p: Post) => number,
  reason: SetAsideReason,
  cutoff: number,
): Selection {
  const inRange = (p: Post, i: number) => i < count || new Date(p.postedAt).getTime() >= cutoff;
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
  const all = eligiblePosts(creator.posts, { ...settings, recentPostCount: Infinity }, now);

  // Engagement: the latest normal posts, replacing any set aside with older ones.
  const engagement = selectPosts(all, settings.recentPostCount, postEngagement, "high_engagement", cutoff);
  const postsUsed = engagement.considered;
  const typicalPosts = engagement.chosen;
  const setAside = [...engagement.setAside];

  const withLikes = typicalPosts.filter((p) => p.likes !== null);
  const likesHidden = postsUsed.length > 0 && postsUsed.every((p) => p.likes === null);
  const avgLikes = median(withLikes.map((p) => p.likes as number));
  const avgComments = median(typicalPosts.map((p) => p.comments));

  // Views: the latest posts that have views (Instagram only has them on Reels),
  // all within the look-back period.
  const withViews = all.filter((p) => p.views !== null && new Date(p.postedAt).getTime() >= cutoff);
  const views = selectPosts(withViews, settings.recentPostCount, (p) => p.views as number, "high_views", cutoff);
  for (const x of views.setAside) if (!setAside.some((y) => y.post.id === x.post.id)) setAside.push(x);
  const viewPosts = views.chosen;
  const avgViews = median(viewPosts.map((p) => p.views as number));

  let engagementRate: number | null = null;
  let label: EngagementLabel | null = null;
  let expectedEngagements: Metrics["expectedEngagements"] = null;

  if (withLikes.length > 0 && creator.followers > 0) {
    const perPost = withLikes.map(postEngagement);
    engagementRate = median(perPost)! / creator.followers;
    label = engagementLabel(engagementRate, creator.platform, band);
    expectedEngagements = { low: percentile(perPost, 0.25)!, high: percentile(perPost, 0.75)! };
  }

  return {
    band,
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
    expectedEngagements,
  };
}

export function daysBetween(a: string | number, b: string | number): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;
}
