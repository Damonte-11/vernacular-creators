import { CAMPAIGN_BLEND, REACH_RATIOS, VIEWS_TO_REACH } from "@config/benchmarks";
import { smoothByFollowers } from "./benchmarks";
import type { CampaignResult, Creator, Metrics, ReachEstimate } from "./types";
import { median, percentile } from "./stats";
import { sizeBandFor } from "./size-bands";

/** Views need at least this many posts with public views to be trusted. */
export const MIN_VIEW_POSTS = 3;

/**
 * Estimated reach per post.
 * 1. If enough recent posts have public views → middle 50% of those views,
 *    × the views-to-reach factor (views include repeat plays).
 * 2. Otherwise → followers × benchmark reach ratio for the size band,
 *    blended with logged campaign results where we have them.
 */
export function estimateReach(
  creator: Creator,
  metrics: Metrics,
  campaignResults: CampaignResult[] = [],
  allCreators: Creator[] = [],
): ReachEstimate {
  const views = metrics.viewPosts.map((p) => p.views as number);
  if (views.length >= MIN_VIEW_POSTS) {
    const f = viewsToReach(campaignResults);
    const kind = creator.platform === "instagram" ? "Reels" : "videos";
    return {
      low: Math.round(percentile(views, 0.25)! * f.factor),
      high: Math.round(percentile(views, 0.75)! * f.factor),
      method: "views",
      note: `Based on public view counts of ${views.length} recent ${kind} (middle 50%), leaving out any unusually high, possibly boosted ones. Views include repeat plays, so reach is taken as ${pct(f.factor)} of views${f.fromCampaigns ? `, learned from ${f.fromCampaigns} logged campaign results` : ""}.`,
    };
  }

  const ratios = smoothByFollowers(REACH_RATIOS[creator.platform], creator.followers);
  const blend = campaignRatio(creator, campaignResults, allCreators);

  if (!blend) {
    return {
      low: Math.round(creator.followers * ratios.low),
      high: Math.round(creator.followers * ratios.high),
      method: "benchmark",
      note: `No public view counts, so this uses a typical reach of ${pct(ratios.low)}–${pct(ratios.high)} of followers for ${platformName(creator.platform)} creators of this size. Treat it as a rough guide.`,
    };
  }

  // Shift the centre towards what campaigns actually achieved, and narrow the range a little.
  const w = Math.min(blend.count / (blend.count + CAMPAIGN_BLEND.smoothing), CAMPAIGN_BLEND.maxWeight);
  const centre = (1 - w) * ratios.mid + w * blend.ratio;
  const shrink = 1 - w * 0.5;
  const low = Math.max(0, centre - (ratios.mid - ratios.low) * shrink);
  const high = centre + (ratios.high - ratios.mid) * shrink;
  return {
    low: Math.round(creator.followers * low),
    high: Math.round(creator.followers * high),
    method: "benchmark+campaigns",
    note: `No public view counts. Mixes the typical reach for this size (${pct(ratios.low)}–${pct(ratios.high)} of followers) with ${blend.count} logged campaign results ${blend.scope} (median ${pct(blend.ratio)} of followers).`,
  };
}

function campaignRatio(
  creator: Creator,
  results: CampaignResult[],
  allCreators: Creator[],
): { ratio: number; count: number; scope: string } | null {
  const byId = new Map(allCreators.map((c) => [c.id, c]));
  const band = sizeBandFor(creator.followers);
  const rows = results
    .filter((r) => r.reach !== null)
    .map((r) => ({ r, c: byId.get(r.creatorId) }))
    .filter(
      (x): x is { r: CampaignResult; c: Creator } =>
        !!x.c && x.c.platform === creator.platform && x.c.followers > 0 && sizeBandFor(x.c.followers) === band,
    );

  const sameNiche = creator.niche ? rows.filter((x) => x.c.niche === creator.niche) : [];
  const chosen = sameNiche.length >= CAMPAIGN_BLEND.minNicheResults ? sameNiche : rows;
  if (chosen.length < CAMPAIGN_BLEND.minResults) return null;

  const scope = chosen === sameNiche ? `from ${creator.niche} creators of this size` : "from creators of this size";
  return { ratio: median(chosen.map((x) => (x.r.reach as number) / x.c.followers))!, count: chosen.length, scope };
}

/**
 * Share of views that are unique people reached. Starts at VIEWS_TO_REACH and
 * moves towards what logged campaign results (with both reach and views) show.
 */
export function viewsToReach(results: CampaignResult[]): { factor: number; fromCampaigns: number } {
  const ratios = results
    .filter((r) => r.reach !== null && r.views !== null && r.views > 0)
    .map((r) => Math.min(1, (r.reach as number) / (r.views as number)));
  if (ratios.length < CAMPAIGN_BLEND.minResults) return { factor: VIEWS_TO_REACH, fromCampaigns: 0 };
  const w = Math.min(ratios.length / (ratios.length + CAMPAIGN_BLEND.smoothing), CAMPAIGN_BLEND.maxWeight);
  return { factor: (1 - w) * VIEWS_TO_REACH + w * median(ratios)!, fromCampaigns: ratios.length };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function platformName(p: Creator["platform"]): string {
  return p === "instagram" ? "Instagram" : "YouTube";
}
