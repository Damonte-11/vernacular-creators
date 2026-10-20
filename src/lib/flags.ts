import { VIEWS_RATIO_TARGETS } from "@config/benchmarks";
import { FLAG_THRESHOLDS as T } from "@config/flags";
import type { Creator, Flag, Metrics } from "./types";
import { smoothNumber } from "./benchmarks";
import { engagementBenchmark } from "./metrics";
import { MIN_VIEW_POSTS } from "./reach";
import { coefficientOfVariation, DAY_MS } from "./stats";
import { formatNumber, formatPercent } from "./format";

/** Warning signs based only on public numbers. Each explains itself in one sentence. */
export function computeFlags(creator: Creator, metrics: Metrics, now: number): Flag[] {
  const flags: Flag[] = [];
  const bench = engagementBenchmark(creator.platform, creator.followers);
  const er = metrics.engagementRate;
  const normal = `${formatPercent(bench.poor)}–${formatPercent(bench.good)}`;

  const jump = biggestFollowerJump(creator);
  if (jump) {
    flags.push({
      type: "follower_jump",
      severity: jump.growth > T.followerJumpPct * 2 ? "high" : "medium",
      message: `Followers jumped by ${formatPercent(jump.growth, 0)} (+${formatNumber(jump.gained)}) in ${Math.max(1, Math.round(jump.days))} days, which is faster than normal growth and can mean bought followers.`,
    });
  }

  let oddRatio = false;
  if (metrics.avgLikes !== null && metrics.avgComments !== null && metrics.avgComments > 0) {
    const ratio = metrics.avgLikes / metrics.avgComments;
    const range = T.likesPerComment[creator.platform];
    if (ratio < range.min) {
      oddRatio = true;
      flags.push({
        type: "likes_comments_ratio",
        severity: "low",
        message: `Only ${ratio.toFixed(1)} likes per comment (normal is ${range.min}–${range.max}); this many comments can come from comment groups, giveaways or bought comments.`,
      });
    } else if (ratio > range.max) {
      oddRatio = true;
      flags.push({
        type: "likes_comments_ratio",
        severity: "low",
        message: `${formatNumber(Math.round(ratio))} likes per comment (normal is ${range.min}–${range.max}); very few comments for the likes can mean bought likes.`,
      });
    }
  }

  const ver = metrics.viewEngagementRate;
  if (er !== null) {
    if (er < bench.poor * T.lowEngagementFactor) {
      flags.push({
        type: "low_engagement",
        severity: er < bench.poor * T.veryLowEngagementFactor ? "high" : "medium",
        message: `Engagement rate of ${formatPercent(er)} is well below normal for creators of this size (usually ${normal}), so relatively few followers react to posts.`,
      });
    } else if (er > bench.good * T.highEngagementFactor) {
      // Very high engagement is only suspicious when something else backs it up.
      const evidence = [
        oddRatio && "an unusual likes-to-comments ratio",
        jump && "a sudden follower jump",
        ver !== null && ver > T.maxViewEngagement && `more likes and comments per view than is realistic (${formatPercent(ver)})`,
      ].filter(Boolean);
      if (evidence.length > 0) {
        flags.push({
          type: "high_engagement",
          severity: "medium",
          message: `Engagement rate of ${formatPercent(er)} is unusually high for creators of this size (usually ${normal}), together with ${evidence.join(" and ")}; check that likes or comments aren't bought.`,
        });
      }
    }
  }

  // Followers who never watch: low views for the follower count, while the
  // people who do watch engage normally.
  if (metrics.avgViews !== null && metrics.viewPostCount >= MIN_VIEW_POSTS && creator.followers > 0 && ver !== null) {
    const target = smoothNumber(VIEWS_RATIO_TARGETS[creator.platform], creator.followers);
    const viewShare = metrics.avgViews / creator.followers;
    if (viewShare < target * T.inactiveFollowersViewShare && metrics.viewEngagementLabel !== "poor") {
      flags.push({
        type: "inactive_followers",
        severity: "medium",
        message: `Posts typically reach views of only ${formatPercent(viewShare)} of followers (healthy is around ${formatPercent(target, 0)}), while people who do watch engage normally, so many followers may be inactive or bought.`,
      });
    }
  }

  const perPost = metrics.postsUsed.map((p) => (metrics.likesHidden ? 0 : (p.likes ?? 0)) + p.comments);
  if (perPost.length >= T.minPostsForVariation) {
    const cv = coefficientOfVariation(perPost);
    if (cv !== null && cv > T.maxEngagementVariation) {
      flags.push({
        type: "engagement_swings",
        severity: cv > T.maxEngagementVariation * 1.5 ? "medium" : "low",
        message: `Engagement swings a lot from post to post (from ${formatNumber(Math.min(...perPost))} to ${formatNumber(Math.max(...perPost))}), which can point to boosted or bought engagement on some posts.`,
      });
    }
  }

  const boosted = metrics.setAside.filter((x) => x.reason !== "team");
  if (boosted.length >= T.minOutliersForFlag) {
    flags.push({
      type: "boosted_posts",
      severity: "low",
      message: `${boosted.length} recent posts did far better than this creator's usual level (over ${T.outlierFactor}× a typical post), so they may have been boosted with ads or gone viral; the numbers here are based on typical posts instead.`,
    });
  }

  const gap = longestPostingGap(creator, metrics, now);
  if (gap && gap.days > T.maxPostingGapDays) {
    flags.push({
      type: "posting_gap",
      severity: gap.sinceLast ? "medium" : "low",
      message: gap.sinceLast
        ? `No new posts in the last ${Math.round(gap.days)} days, so the account may be inactive.`
        : `There was a ${Math.round(gap.days)}-day gap between recent posts, so posting is irregular.`,
    });
  }

  return flags;
}

function biggestFollowerJump(creator: Creator): { growth: number; gained: number; days: number } | null {
  const snaps = [...creator.snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  let best: { growth: number; gained: number; days: number } | null = null;
  for (let i = 0; i < snaps.length; i++) {
    for (let j = i + 1; j < snaps.length; j++) {
      const days = (new Date(snaps[j].capturedAt).getTime() - new Date(snaps[i].capturedAt).getTime()) / DAY_MS;
      if (days > T.followerJumpWindowDays) break;
      if (snaps[i].followers <= 0) continue;
      const growth = (snaps[j].followers - snaps[i].followers) / snaps[i].followers;
      if (growth > T.followerJumpPct && (!best || growth > best.growth)) {
        best = { growth, gained: snaps[j].followers - snaps[i].followers, days };
      }
    }
  }
  return best;
}

function longestPostingGap(
  creator: Creator,
  metrics: Metrics,
  now: number,
): { days: number; sinceLast: boolean } | null {
  if (creator.posts.length === 0) return null;
  const latest = Math.max(...creator.posts.map((p) => new Date(p.postedAt).getTime()));
  const sinceLast = (now - latest) / DAY_MS;

  const times = metrics.postsUsed.map((p) => new Date(p.postedAt).getTime()).sort((a, b) => a - b);
  let between = 0;
  for (let i = 1; i < times.length; i++) between = Math.max(between, (times[i] - times[i - 1]) / DAY_MS);

  return sinceLast >= between ? { days: sinceLast, sinceLast: true } : { days: between, sinceLast: false };
}
