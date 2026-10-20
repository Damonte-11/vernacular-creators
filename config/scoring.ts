/**
 * Default Creator Score weights. The team can change these on the
 * Settings page; these are the starting values. They don't need to add up
 * to 100 — they are re-balanced automatically.
 */
export const DEFAULT_SCORE_WEIGHTS = {
  engagement: 30,
  authenticity: 25,
  views: 20,
  consistency: 15,
  growth: 10,
};

export type ScoreFactor = keyof typeof DEFAULT_SCORE_WEIGHTS;

export const SCORE_FACTOR_LABELS: Record<ScoreFactor, { label: string; help: string }> = {
  engagement: {
    label: "Engagement",
    help: "Engagement rate by followers (compared with creators of the same size) and, where posts have views, by views.",
  },
  authenticity: {
    label: "Authenticity",
    help: "Starts at 100 and drops for each sign of fake or bought activity.",
  },
  views: {
    label: "Views",
    help: "Typical views per post compared with follower count. Only where views are public.",
  },
  consistency: {
    label: "Consistency",
    help: "How regularly they post and how steady their engagement is.",
  },
  growth: {
    label: "Growth",
    help: "Healthy follower growth over time. Needs at least two weeks of saved history.",
  },
};

/** Growth needs snapshots spanning at least this many days. */
export const MIN_GROWTH_HISTORY_DAYS = 14;
