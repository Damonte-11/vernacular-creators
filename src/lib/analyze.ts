import type { CampaignResult, Creator, CreatorAnalysis, Settings } from "./types";
import { computeMetrics } from "./metrics";
import { estimateReach } from "./reach";
import { computeFlags } from "./flags";
import { computeScore } from "./score";

/** Runs every calculation for one creator. */
export function analyzeCreator(
  creator: Creator,
  settings: Settings,
  now: number,
  campaignResults: CampaignResult[] = [],
  allCreators: Creator[] = [],
): CreatorAnalysis {
  const metrics = computeMetrics(creator, settings, now);
  const flags = computeFlags(creator, metrics, now);
  return {
    creator,
    metrics,
    reach: estimateReach(creator, metrics, campaignResults, allCreators),
    flags,
    score: computeScore(creator, metrics, flags, settings, now),
  };
}
