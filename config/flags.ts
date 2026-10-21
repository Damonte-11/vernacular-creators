/**
 * Warning-flag thresholds. Every flag uses only public numbers.
 * Rates are fractions: 0.03 = 3%.
 */
export const FLAG_THRESHOLDS = {
  /** Low engagement: engagement rate below the band's "poor" line × this. */
  lowEngagementFactor: 1,
  /** …and "high" severity when below the "poor" line × this. */
  veryLowEngagementFactor: 0.5,

  /**
   * Unusually high engagement: above the "good" line × this, AND backed by
   * another sign (odd likes-to-comments ratio, a follower jump, or more
   * engagement per view than is realistic). High engagement alone is good.
   */
  highEngagementFactor: 2,
  /** More likes + comments per view than this is unrealistic (likely bought likes). */
  maxViewEngagement: 0.3,

  /**
   * Inactive followers: views per post below this share of the healthy
   * views-to-followers level, while people who do watch engage normally.
   * Means most followers never see the posts (often bought or old followers).
   */
  inactiveFollowersViewShare: 0.25,

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
    tiktok: { min: 10, max: 400 },
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
  /**
   * If more than this share of posts would be set aside, big posts are simply
   * this creator's normal pattern (e.g. regularly viral), so nothing is set aside.
   */
  maxOutlierShare: 0.25,

  /** Fewer posts than this behind the numbers → marked "Low confidence". */
  minPostsForConfidence: 8,
} as const;

/** How many authenticity points (out of 100) each flag severity costs. */
export const FLAG_PENALTIES = { low: 10, medium: 20, high: 35 } as const;

/**
 * Only these flags lower the Authenticity score: signs of fake or bought
 * activity. Others (low engagement, posting gaps, boosted posts) are shown as
 * warnings but are already reflected in the other score factors, so they
 * aren't counted twice.
 */
export const AUTHENTICITY_FLAGS = [
  "high_engagement",
  "follower_jump",
  "likes_comments_ratio",
  "engagement_swings",
  "inactive_followers",
] as const;
