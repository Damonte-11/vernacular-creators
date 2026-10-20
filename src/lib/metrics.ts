import { VIEWS_MAX_AGE_DAYS } from "@config/app";
import { ENGAGEMENT_BENCHMARKS } from "@config/benchmarks";
import { FLAG_THRESHOLDS } from "@config/flags";
import type { Creator, EngagementLabel, Metrics, Post, Settings } from "./types";
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

export function computeMetrics(creator: Creator, settings: Settings, now: number): Metrics {
  const band = sizeBandFor(creator.followers);
  const postsUsed = eligiblePosts(creator.posts, settings, now);

  // Set aside: posts the team excluded, then unusually high ones (possibly boosted).
  const setAside: Metrics["setAside"] = postsUsed.filter((p) => p.excluded).map((post) => ({ post, reason: "team" }));
  const kept = postsUsed.filter((p) => !p.excluded);
  const highEngagement = findOutliers(kept, postEngagement);
  kept.filter((p) => highEngagement.has(p.id)).forEach((post) => setAside.push({ post, reason: "high_engagement" }));
  const typicalPosts = kept.filter((p) => !highEngagement.has(p.id));

  const withLikes = typicalPosts.filter((p) => p.likes !== null);
  const likesHidden = postsUsed.length > 0 && postsUsed.every((p) => p.likes === null);
  const avgLikes = median(withLikes.map((p) => p.likes as number));
  const avgComments = median(typicalPosts.map((p) => p.comments));

  // Views: the latest posts that have views (Instagram only has them on Reels),
  // looking further back than the engagement window if needed.
  const viewCutoff = now - VIEWS_MAX_AGE_DAYS * DAY_MS;
  const viewCandidates = eligiblePosts(
    creator.posts.filter((p) => p.views !== null && !p.excluded && new Date(p.postedAt).getTime() >= viewCutoff),
    settings,
    now,
  );
  const highViews = findOutliers(viewCandidates, (p) => p.views as number);
  viewCandidates
    .filter((p) => highViews.has(p.id) && !setAside.some((x) => x.post.id === p.id))
    .forEach((post) => setAside.push({ post, reason: "high_views" }));
  const viewPosts = viewCandidates.filter((p) => !highViews.has(p.id));
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
