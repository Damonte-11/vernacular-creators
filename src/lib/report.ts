import type { CreatorAnalysis, Range } from "./types";

export interface ShortlistTotals {
  creators: number;
  followers: number;
  /** Sum of each creator's expected engagements per post (one post each). */
  engagements: Range;
  /** Sum of each creator's estimated reach per post (one post each). Not unique people. */
  reach: Range;
  averageScore: number | null;
  /** Creators with no engagement range (e.g. hidden likes). */
  missingEngagements: number;
}

export function shortlistTotals(rows: CreatorAnalysis[]): ShortlistTotals {
  const scored = rows.filter((r) => r.score.total !== null);
  return {
    creators: rows.length,
    followers: rows.reduce((s, r) => s + r.creator.followers, 0),
    engagements: {
      low: rows.reduce((s, r) => s + (r.metrics.expectedEngagements?.low ?? 0), 0),
      high: rows.reduce((s, r) => s + (r.metrics.expectedEngagements?.high ?? 0), 0),
    },
    reach: {
      low: rows.reduce((s, r) => s + r.reach.low, 0),
      high: rows.reduce((s, r) => s + r.reach.high, 0),
    },
    averageScore: scored.length ? Math.round(scored.reduce((s, r) => s + (r.score.total as number), 0) / scored.length) : null,
    missingEngagements: rows.filter((r) => r.metrics.expectedEngagements === null).length,
  };
}
