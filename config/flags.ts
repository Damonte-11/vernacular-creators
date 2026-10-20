/**
 * Warning-flag thresholds. Every flag uses only public numbers.
 * Rates are fractions: 0.03 = 3%.
 */
export const FLAG_THRESHOLDS = {
  /** Low engagement: engagement rate below the band's "poor" line × this. */
  lowEngagementFactor: 1,
  /** …and "high" severity when below the "poor" line × this. */
  veryLowEngagementFactor: 0.5,

  /** Unusually high engagement: above the band's "good" line × this. */
  highEngagementFactor: 2,

  /** Engagement swings: spread between posts (coefficient of variation) above this. */
  maxEngagementVariation: 0.9,
  /** Need at least this many posts to judge swings. */
  minPostsForVariation: 6,

  /** Follower jump: growth between two snapshots above this share… */
  followerJumpPct: 0.15,
  /** …within this many days. */
  followerJumpWindowDays: 7,

  /** Likes per comment outside this range is unusual. */
  likesPerComment: {
    instagram: { min: 8, max: 250 },
    youtube: { min: 5, max: 200 },
  },

  /** Posting gap: a gap between posts (or since the last post) longer than this. */
  maxPostingGapDays: 30,

  /**
   * Unusually high posts: a post with more than this many times the creator's
   * typical (median) engagement or views is set aside as possibly boosted
   * (paid ads) or a one-off viral hit, and left out of averages and scores.
   */
  outlierFactor: 3,
  /** Need at least this many posts before setting any aside. */
  minPostsForOutliers: 5,
  /** Raise the "possibly boosted posts" flag when at least this many are set aside. */
  minOutliersForFlag: 2,
} as const;

/** How many authenticity points (out of 100) each flag severity costs. */
export const FLAG_PENALTIES = { low: 10, medium: 20, high: 35 } as const;
