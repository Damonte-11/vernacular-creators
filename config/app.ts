/** General defaults. Most can be changed on the Settings page. */
export const APP_DEFAULTS = {
  /** How many recent posts the averages are based on. */
  recentPostCount: 12,
  /** Posts younger than this are left out (their numbers are still growing). */
  minPostAgeHours: 24,
  /** Refresh a creator from the API when their data is older than this (Stage 2). */
  refreshIntervalHours: 24,
};

/**
 * How far back the app may look for replacement posts, in days. When posts are
 * set aside (possibly boosted, or excluded by the team), older posts take their
 * place so the numbers still use `recentPostCount` posts, but never older than
 * this. Views use the same limit when looking back for posts that have views
 * (Instagram only shows views on Reels).
 */
export const LOOKBACK_DAYS = 180;

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
