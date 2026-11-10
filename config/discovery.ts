/**
 * Automatic discovery: the app finds new Nigerian creators by itself each night.
 * Every value here can be changed on the Settings page; these are the defaults.
 */
export const DISCOVERY_DEFAULTS = {
  enabled: true,
  /** Most new creators added per day. */
  dailyLimit: 50,
  /** Smallest account worth adding. */
  minFollowers: 5_000,
  /** Must have posted within this many days. */
  activeDays: 60,
  /** Niches searched on YouTube, combined with the cities below. */
  keywords: ["comedy", "food", "fashion", "beauty", "tech", "music", "lifestyle", "fitness", "family"],
  cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Benin"],
  /** Show borderline accounts in "Worth a look" (otherwise they're skipped). */
  reviewQueue: true,
};

export type DiscoverySettings = typeof DISCOVERY_DEFAULTS;

/** "Worth a look" items nobody acted on are ignored after this many days. */
export const REVIEW_EXPIRY_DAYS = 14;
/** At most this many borderline accounts go to "Worth a look" per run. */
export const REVIEW_PER_RUN = 20;
/** YouTube searches per run (each uses 100 of the 10,000 free daily units). */
export const YOUTUBE_SEARCHES_PER_RUN = 5;

/** Words in a name or bio that point to Nigeria. */
export const NIGERIA_SIGNALS = [
  "nigeria", "nigerian", "naija", "9ja", "🇳🇬", "lagos", "lasgidi", "abuja", "fct", "port harcourt", "portharcourt", "ph city",
  "ibadan", "enugu", "benin city", "kano", "kaduna", "warri", "owerri", "calabar", "uyo", "jos", "abeokuta", "ilorin", "lekki",
  "ikeja", "yaba", "surulere", "ajah", "unilag", "unn", "oau", "yoruba", "igbo", "hausa", "pidgin",
];

/** Words that point to a business or shop rather than a creator. */
export const BUSINESS_SIGNALS = [
  "ltd", "limited", "plc", "enterprises", "ventures", "store", "stores", "shop", "boutique", "we deliver", "order now",
  "dm to order", "whatsapp to order", "nationwide delivery", "delivery nationwide", "wholesale", "retail", "restaurant",
  "official page of", "bank", "microfinance", "real estate", "properties", "pharmacy", "supermarket",
];
