/** General defaults. Most can be changed on the Settings page. */
export const APP_DEFAULTS = {
  /**
   * How many recent posts the numbers are based on. 30 (like HypeAuditor) means
   * a short hot streak or a boost doesn't inflate them; the "Recent trend"
   * line shows the latest posts separately.
   */
  recentPostCount: 30,
  /**
   * Posts younger than this are left out because their numbers are still
   * growing. Instagram posts get most of their likes in the first ~3 days;
   * YouTube videos keep growing for about a week.
   */
  minPostAgeHours: 72,
  minPostAgeHoursYoutube: 168,
  /**
   * Instagram views counted, in %. Since April 2026 Instagram's official view
   * count adds the Facebook views of Reels the creator cross-posts there, and
   * paid (ad) views. Neither is shown separately, so views are scaled down to
   * roughly what the Instagram app shows. 70 brings @asherkine in line with
   * HypeAuditor. 100 turns the adjustment off. YouTube views aren't adjusted.
   */
  instagramViewsShare: 70,
  /** Refresh a creator from the API when their data is older than this (Stage 2). */
  refreshIntervalHours: 24,
};

/**
 * How far back the app looks for posts, in days. The numbers use up to
 * `recentPostCount` posts from this period (beyond the newest MIN_RECENT_POSTS,
 * which always count). Set-aside posts are replaced by older ones within it too.
 */
export const LOOKBACK_DAYS = 180;

/**
 * The newest posts that always count, however old they are, so creators who
 * rarely post still get a fair sample. Beyond these, posts must be within
 * LOOKBACK_DAYS.
 */
export const MIN_RECENT_POSTS = 12;

/** "Recent trend" compares this many newest posts with the full set. */
export const TREND_POSTS = 10;
/** Only show a trend when the full set has at least this many posts. */
export const MIN_POSTS_FOR_TREND = 20;

/** Fixed lists the team picks from. Add new ones here. */
export const NICHES = [
  "Comedy",
  "Lifestyle",
  "Fashion",
  "Food",
  "Tech",
  "Music",
  "Beauty",
  "Fitness",
  "Finance",
  "Travel",
] as const;

export const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Kano", "Benin City"] as const;

/** Words in a bio that suggest a niche (used for suggestions only). */
export const NICHE_KEYWORDS: Record<string, string[]> = {
  Comedy: ["comedy", "comedian", "skits", "skit", "funny", "laugh", "jokes"],
  Lifestyle: ["lifestyle", "vlog", "vlogger", "daily life", "family", "mum", "dad"],
  Fashion: ["fashion", "style", "stylist", "outfit", "ootd", "designer", "ankara"],
  Food: ["food", "chef", "recipe", "recipes", "kitchen", "cook", "cooking", "jollof", "eats"],
  Tech: ["tech", "gadget", "gadgets", "phone", "review", "reviews", "developer", "coding", "ai"],
  Music: ["music", "singer", "artist", "producer", "afrobeats", "dj", "songwriter"],
  Beauty: ["beauty", "makeup", "mua", "skincare", "hair", "nails"],
  Fitness: ["fitness", "gym", "workout", "trainer", "health"],
  Finance: ["finance", "money", "invest", "investing", "savings", "crypto"],
  Travel: ["travel", "explore", "tourism", "trips"],
};

/**
 * TikTok goes through Apify, which is paid per video (about $0.13 a lookup).
 * Apify's free plan gives $5 of credit a month, so lookups are capped.
 */
export const TIKTOK_LIMITS = {
  /** Most TikTok lookups and refreshes per calendar month. Override with TIKTOK_MONTHLY_LOOKUPS in Vercel. */
  monthlyLookups: 30,
  /** Saved TikTok creators are reused for this long (the daily refresh skips TikTok). */
  refreshDays: 30,
};
