/**
 * Made-up sample data for the Dialect design preview: a fictional brand
 * ("Glide Rides"), three months of posts, targets and listening results.
 * Nothing here is a real client or a real result.
 */
import { DEFAULT_CONTENT_TYPES, splitTargets, type DialectPlatform, type DialectPost, type DialectProject, type PostFormat, type Purpose } from "./dialect";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TITLES: Record<string, string[]> = {
  Skit: [
    "When the driver says AC is extra",
    "Passenger vs driver: who picks the price",
    "Me explaining my fare to my mum",
    "The driver who knows every shortcut",
    "Rider who won't share their location",
  ],
  Trend: ["Lagos traffic POV", "Rainy day in Lekki", "Things only Lagos riders know", "Glide in 2045", "Tell me you're from Lagos without telling me"],
  Educational: [
    "Myths vs facts",
    "How to set your own fare",
    "3 ways to ride cheaper this month",
    "What happens when you report a trip",
    "Your trip, explained",
  ],
  "Behind the scenes": [
    "Driver of the week: Tunde",
    "A day at the driver hub",
    "Meet the support team",
    "How we check every driver",
    "Morning briefing with drivers",
  ],
  UGC: ["Meet Sade", "My first ride with Glide", "Rider review: Ikeja to VI", "Why I switched", "Late-night ride home"],
  "Short-form video": ["SPEED", "Fair price, every ride", "Ride now, pay fair", "Lagos moves with us", "Set your price"],
  "Trending sound": [
    "I'm not broke",
    "Name another app that lets you do this",
    "The fare said what?",
    "Every Lagos rider on Friday",
    "Sound on: Lagos edition",
  ],
};
const X_TITLES = [
  "Name another app that lets you set the price",
  "Thread: 5 things we fixed this month",
  "Rainy day in Lekki",
  "Who are we picking up first?",
  "Your fare, your call",
];

const PLATFORM_MEAN: Record<DialectPlatform, number> = { instagram: 6800, tiktok: 6000, x: 520, youtube: 1500 };
const TYPE_LIFT: Record<string, number> = {
  Skit: 1.3,
  Trend: 1.0,
  Educational: 0.8,
  "Behind the scenes": 0.7,
  UGC: 1.1,
  "Short-form video": 0.9,
  "Trending sound": 1.4,
};
const PURPOSE_LIFT: Record<Purpose, number> = { differentiation: 1.25, safety: 0.78, trend: 1.0 };
const HOUR_LIFT = (h: number) => (h < 12 ? 0.72 : h < 16 ? 1.18 : h < 21 ? 1.05 : 0.85);

function monthPosts(month: string, count: number, lastDay: number, seed: number, carouselsFilled: boolean): DialectPost[] {
  const r = rng(seed);
  const out: DialectPost[] = [];
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  for (let i = 0; i < count; i++) {
    const roll = r();
    const platform: DialectPlatform = roll < 0.46 ? "instagram" : roll < 0.86 ? "tiktok" : "x";
    const type = platform === "x" ? pick(["Trend", "Educational", "Trending sound", "Skit"]) : pick(DEFAULT_CONTENT_TYPES);
    const purpose: Purpose = r() < 0.42 ? "differentiation" : r() < 0.55 ? "safety" : "trend";
    const format: PostFormat =
      platform === "x" ? (r() < 0.25 ? "thread" : "tweet") : platform === "instagram" ? (r() < 0.38 ? "carousel" : "reel") : r() < 0.3 ? "carousel" : "video";
    const day = 1 + Math.floor((i / count) * lastDay);
    const hour = pick([8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21]);
    const lift = TYPE_LIFT[type] * PURPOSE_LIFT[purpose] * HOUR_LIFT(hour) * (format === "carousel" ? 1.18 : format === "thread" ? 1.6 : 1);
    const views = Math.round(PLATFORM_MEAN[platform] * lift * (0.55 + r() * 0.9));
    const hidden = platform === "instagram" && format === "carousel";
    const likes = Math.round(views * (0.018 + r() * 0.02));
    const title = platform === "x" ? pick(X_TITLES) : pick(TITLES[type]);
    out.push({
      id: `${month}-${i}`,
      platform,
      url:
        platform === "instagram"
          ? `https://www.instagram.com/${format === "reel" ? "reel" : "p"}/S${seed}${i}/`
          : platform === "tiktok"
            ? `https://www.tiktok.com/@gliderides/${format === "carousel" ? "photo" : "video"}/73${seed}${i}`
            : `https://x.com/gliderides/status/18${seed}${i}`,
      title,
      postedAt: `${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${pick(["05", "20", "35", "50"])}:00+01:00`,
      format,
      contentType: type,
      purpose,
      views: hidden && !carouselsFilled ? null : views,
      likes,
      comments: Math.round(likes * (0.6 + r() * 1.6)),
      shares: platform === "x" ? Math.round(likes * 0.3) : Math.round(views * 0.004 * r()),
      saves: hidden && !carouselsFilled ? null : Math.round(views * 0.006 * r()),
      manual: hidden && carouselsFilled,
    });
  }
  return out;
}

export const SAMPLE_TODAY = "2026-11-12";

export function sampleDialectProject(): DialectProject {
  const totals = { views: 2_400_000, followers: 18_000, posts: 360, engagements: 72_000 };
  const sep = monthPosts("2026-09", 58, 30, 9, true);
  const oct = monthPosts("2026-10", 63, 31, 10, true);
  const nov = monthPosts("2026-11", 21, 11, 11, false);
  // October: a boosted post the team already handled (organic numbers entered).
  oct[40] = {
    ...oct[40],
    platform: "instagram",
    format: "reel",
    title: "Who are we picking up first? (partner reel)",
    views: 512_000,
    possibleAd: true,
    decision: "manual",
    organic: { views: 9_120, engagements: 410 },
  };
  // November: a TikTok far above the usual, waiting for a decision, and a post with no content type yet.
  nov.push({
    id: "2026-11-ad",
    platform: "tiktok",
    url: "https://www.tiktok.com/@gliderides/video/7311111111111",
    title: "Lagos traffic POV",
    postedAt: "2026-11-11T13:20:00+01:00",
    format: "video",
    contentType: "Trend",
    purpose: "trend",
    views: 482_300,
    likes: 21_400,
    comments: 1_930,
    shares: 3_100,
    saves: 2_200,
    possibleAd: true,
    decision: null,
  });
  nov[19] = { ...nov[19], contentType: null };
  return {
    id: "sample-glide",
    brand: "Glide Rides",
    client: "Glide Rides Nigeria",
    platforms: [
      { platform: "instagram", handle: "gliderides.ng" },
      { platform: "tiktok", handle: "gliderides" },
      { platform: "x", handle: "GlideRidesNG" },
    ],
    startMonth: "2026-09",
    months: 6,
    totals,
    monthTargets: splitTargets(totals, "2026-09", 6),
    adRule: { views: 400_000, timesUsual: 5 },
    competitors: ["RideCo", "Mova"],
    contentTypes: [...DEFAULT_CONTENT_TYPES],
    followersGained: { "2026-09": 3_920, "2026-10": 2_940, "2026-11": 1_420 },
    commitments: {
      "2026-10": [
        { text: "More story carousels, in different formats", result: "17 carousels (target was 14), our best format on both platforms", status: "done" },
        { text: "Dialogue-led skits tested against sound-led videos", result: "Ran both all month; skits averaged 1.3× the usual views", status: "done" },
        { text: "One or two posts a day", result: "Posted on 27 of 31 days, about 2 a day", status: "done" },
        { text: "X: five buzz comments a day", result: "On hold while X posting was paused", status: "paused" },
        { text: "X: get the page verified", result: "Verified, with a new bio and pinned support post", status: "done" },
      ],
      "2026-11": [
        { text: "Driver and passenger moments set to trending sounds", result: "", status: null },
        { text: "Keep story carousels; only a few gamified ones", result: "", status: null },
        { text: "More midday and evening posts, fewer mornings", result: "", status: null },
      ],
    },
    listeningCapUsd: 3,
    posts: [...sep, ...oct, ...nov],
  };
}

/** What the October listening run found (made up), for the report's "What happened this month" slide. */
export const SAMPLE_LISTENING = {
  month: "2026-10",
  mentions: 412,
  mentionsBefore: 318,
  sentiment: { positive: 22, neutral: 41, negative: 37 },
  themes: [
    { label: "Drivers asking for extra for AC or waiting", count: 96 },
    { label: "Fares compared with other apps", count: 71 },
    { label: "Safety on late-night trips", count: 48 },
    { label: "Payment failing in the app", count: 33 },
  ],
  spike: { day: 15, label: "15 Oct: a rider's thread about a late-night trip (2.1K reposts) drove a day of safety questions." },
  competitors: [
    { name: "RideCo", note: "Ran a half-price week (14–20 Oct); price comparisons with us doubled that week." },
    { name: "Mova", note: "Launched motorbike rides in Ikeja; little conversation so far." },
  ],
  news: [{ source: "Sample news", title: "Lagos State proposes a levy on ride-hailing trips (sample headline)" }],
};
