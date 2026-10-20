import { ENGAGEMENT_BENCHMARKS, POSTING_FREQUENCY_TARGET, VIEWS_RATIO_TARGETS } from "@config/benchmarks";
import { FLAG_PENALTIES, FLAG_THRESHOLDS } from "@config/flags";
import { MIN_GROWTH_HISTORY_DAYS, type ScoreFactor } from "@config/scoring";
import type { Creator, Flag, Metrics, ScoreResult, Settings } from "./types";
import { coefficientOfVariation, DAY_MS, piecewise } from "./stats";
import { MIN_VIEW_POSTS } from "./reach";

/** Minimum posts needed to judge authenticity and consistency. */
export const MIN_POSTS_FOR_SCORE = 4;

type FactorResult = { score: number } | { missing: string };

/**
 * Creator Score out of 100: a weighted mix of factors, each scored 0–100
 * against the creator's own size band. Factors without data are left out
 * and the remaining weights are re-balanced.
 */
export function computeScore(
  creator: Creator,
  metrics: Metrics,
  flags: Flag[],
  settings: Settings,
  now: number,
): ScoreResult {
  const factors: Record<ScoreFactor, FactorResult> = {
    engagement: engagementFactor(creator, metrics),
    authenticity: authenticityFactor(metrics, flags),
    views: viewsFactor(creator, metrics),
    consistency: consistencyFactor(creator, metrics, now),
    growth: growthFactor(creator, flags),
  };

  const breakdown: ScoreResult["breakdown"] = {};
  const missing: ScoreResult["missing"] = [];
  let weightSum = 0;
  for (const [factor, result] of Object.entries(factors) as [ScoreFactor, FactorResult][]) {
    if ("missing" in result) {
      missing.push({ factor, reason: result.missing });
    } else if (settings.weights[factor] > 0) {
      breakdown[factor] = Math.round(result.score);
      weightSum += settings.weights[factor];
    } else {
      missing.push({ factor, reason: "Weight is set to 0 in Settings." });
    }
  }

  if (weightSum === 0) return { total: null, breakdown, weightsUsed: {}, missing };

  const weightsUsed: ScoreResult["weightsUsed"] = {};
  let total = 0;
  for (const factor of Object.keys(breakdown) as ScoreFactor[]) {
    const w = settings.weights[factor] / weightSum;
    weightsUsed[factor] = w;
    total += w * (factors[factor] as { score: number }).score;
  }
  return { total: Math.round(total), breakdown, weightsUsed, missing };
}

export function engagementFactor(creator: Creator, metrics: Metrics): FactorResult {
  if (metrics.engagementRate === null) {
    return { missing: metrics.likesHidden ? "Likes are hidden on this account." : "Not enough recent posts." };
  }
  const b = ENGAGEMENT_BENCHMARKS[creator.platform][metrics.band];
  // Above the "suspiciously high" line, higher no longer means better.
  const suspicious = b.good * FLAG_THRESHOLDS.highEngagementFactor;
  return {
    score: piecewise(metrics.engagementRate, [
      [0, 0],
      [b.poor, 25],
      [b.average, 50],
      [b.good, 75],
      [b.good * 1.5, 100],
      [suspicious, 100],
      [suspicious * 1.5, 40],
    ]),
  };
}

export function authenticityFactor(metrics: Metrics, flags: Flag[]): FactorResult {
  if (metrics.postsUsed.length < MIN_POSTS_FOR_SCORE) return { missing: "Not enough recent posts." };
  const penalty = flags.reduce((sum, f) => sum + FLAG_PENALTIES[f.severity], 0);
  return { score: Math.max(0, 100 - penalty) };
}

export function viewsFactor(creator: Creator, metrics: Metrics): FactorResult {
  if (metrics.viewPostCount < MIN_VIEW_POSTS || metrics.avgViews === null || creator.followers <= 0) {
    return { missing: "No public view counts on recent posts." };
  }
  const target = VIEWS_RATIO_TARGETS[creator.platform][metrics.band];
  const ratio = metrics.avgViews / creator.followers;
  return {
    score: piecewise(ratio, [
      [0, 0],
      [target * 0.5, 40],
      [target, 75],
      [target * 2, 100],
    ]),
  };
}

export function consistencyFactor(creator: Creator, metrics: Metrics, now: number): FactorResult {
  const posts = metrics.postsUsed;
  if (posts.length < MIN_POSTS_FOR_SCORE) return { missing: "Not enough recent posts." };

  const oldest = Math.min(...posts.map((p) => new Date(p.postedAt).getTime()));
  const spanDays = Math.max(1, (now - oldest) / DAY_MS);
  const perMonth = (posts.length / spanDays) * 30;
  const frequency = Math.min(1, perMonth / POSTING_FREQUENCY_TARGET[creator.platform]) * 100;

  // Steadiness is judged on typical posts, so a boosted post isn't counted against them twice.
  const perPost = metrics.typicalPosts.map((p) => (p.likes ?? 0) + p.comments);
  const cv = coefficientOfVariation(perPost) ?? 0;
  const steadiness = piecewise(cv, [
    [0.2, 100],
    [1.0, 0],
  ]);

  return { score: (frequency + steadiness) / 2 };
}

/** Growth that came from a suspicious follower jump is capped at this score. */
const JUMP_GROWTH_CAP = 40;

export function growthFactor(creator: Creator, flags: Flag[] = []): FactorResult {
  const snaps = [...creator.snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  if (snaps.length < 2) return { missing: "Needs at least two saved follower counts." };
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const days = (new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime()) / DAY_MS;
  if (days < MIN_GROWTH_HISTORY_DAYS || first.followers <= 0) {
    return { missing: `Needs at least ${MIN_GROWTH_HISTORY_DAYS} days of follower history.` };
  }
  const monthly = Math.pow(last.followers / first.followers, 30 / days) - 1;
  const score = piecewise(monthly, [
    [-0.05, 0],
    [0, 50],
    [0.03, 80],
    [0.08, 100],
    [0.25, 100],
    [0.5, 60],
  ]);
  const jumped = flags.some((f) => f.type === "follower_jump");
  return { score: jumped ? Math.min(score, JUMP_GROWTH_CAP) : score };
}
