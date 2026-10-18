import { ENGAGEMENT_BENCHMARKS } from "@config/benchmarks";
import type { Creator, EngagementLabel, Metrics, Post, Settings } from "./types";
import { DAY_MS, mean, percentile } from "./stats";
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

export function computeMetrics(creator: Creator, settings: Settings, now: number): Metrics {
  const band = sizeBandFor(creator.followers);
  const postsUsed = eligiblePosts(creator.posts, settings, now);

  const likeValues = postsUsed.filter((p) => p.likes !== null).map((p) => p.likes as number);
  const likesHidden = postsUsed.length > 0 && likeValues.length === 0;
  const avgLikes = mean(likeValues);
  const avgComments = mean(postsUsed.map((p) => p.comments));
  const viewValues = postsUsed.filter((p) => p.views !== null).map((p) => p.views as number);
  const avgViews = mean(viewValues);

  let engagementRate: number | null = null;
  let label: EngagementLabel | null = null;
  let expectedEngagements: Metrics["expectedEngagements"] = null;

  if (avgLikes !== null && avgComments !== null && creator.followers > 0) {
    engagementRate = (avgLikes + avgComments) / creator.followers;
    label = engagementLabel(engagementRate, creator.platform, band);
    const perPost = postsUsed.filter((p) => p.likes !== null).map((p) => (p.likes as number) + p.comments);
    expectedEngagements = { low: percentile(perPost, 0.25)!, high: percentile(perPost, 0.75)! };
  }

  return {
    band,
    postsUsed,
    avgLikes,
    avgComments,
    avgViews,
    viewPostCount: viewValues.length,
    likesHidden,
    engagementRate,
    engagementLabel: label,
    expectedEngagements,
  };
}

export function daysBetween(a: string | number, b: string | number): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;
}
