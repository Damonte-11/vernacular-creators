import { ENGAGEMENT_BENCHMARKS } from "@config/benchmarks";
import { FLAG_THRESHOLDS as T } from "@config/flags";
import type { Creator, Flag, Metrics } from "./types";
import { coefficientOfVariation, DAY_MS } from "./stats";
import { sizeBandLabel } from "./size-bands";
import { formatNumber, formatPercent } from "./format";

/** Warning signs based only on public numbers. Each explains itself in one sentence. */
export function computeFlags(creator: Creator, metrics: Metrics, now: number): Flag[] {
  const flags: Flag[] = [];
  const bench = ENGAGEMENT_BENCHMARKS[creator.platform][metrics.band];
  const bandName = sizeBandLabel(metrics.band).toLowerCase();
  const er = metrics.engagementRate;

  if (er !== null) {
    const normal = `${formatPercent(bench.poor)}–${formatPercent(bench.good)}`;
    if (er < bench.poor * T.lowEngagementFactor) {
      flags.push({
        type: "low_engagement",
        severity: er < bench.poor * T.veryLowEngagementFactor ? "high" : "medium",
        message: `Engagement rate of ${formatPercent(er)} is well below normal for a ${bandName} creator (usually ${normal}), which can mean many inactive or fake followers.`,
      });
    } else if (er > bench.good * T.highEngagementFactor) {
      flags.push({
        type: "high_engagement",
        severity: "medium",
        message: `Engagement rate of ${formatPercent(er)} is unusually high for a ${bandName} creator (usually ${normal}); check that likes or comments aren't bought.`,
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

  const jump = biggestFollowerJump(creator);
  if (jump) {
    flags.push({
      type: "follower_jump",
      severity: jump.growth > T.followerJumpPct * 2 ? "high" : "medium",
      message: `Followers jumped by ${formatPercent(jump.growth, 0)} (+${formatNumber(jump.gained)}) in ${Math.max(1, Math.round(jump.days))} days, which is faster than normal growth and can mean bought followers.`,
    });
  }

  if (metrics.avgLikes !== null && metrics.avgComments !== null && metrics.avgComments > 0) {
    const ratio = metrics.avgLikes / metrics.avgComments;
    const range = T.likesPerComment[creator.platform];
    if (ratio < range.min) {
      flags.push({
        type: "likes_comments_ratio",
        severity: "low",
        message: `Only ${ratio.toFixed(1)} likes per comment (normal is ${range.min}–${range.max}); this many comments can come from comment groups or bought comments.`,
      });
    } else if (ratio > range.max) {
      flags.push({
        type: "likes_comments_ratio",
        severity: "low",
        message: `${formatNumber(Math.round(ratio))} likes per comment (normal is ${range.min}–${range.max}); very few comments for the likes can mean bought likes.`,
      });
    }
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
