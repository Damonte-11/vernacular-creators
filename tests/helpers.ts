import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { APP_DEFAULTS } from "@config/app";
import type { Creator, Post, Settings } from "@/lib/types";

export const NOW = Date.UTC(2026, 9, 18, 12);
export const DAY = 86_400_000;

/**
 * The app defaults, except posts count once they're 24 hours old and 12 posts
 * are used, so the hand-worked examples stay small (the 3-day / 7-day and
 * 30-post defaults have their own tests).
 */
export const SETTINGS: Settings = {
  weights: { ...DEFAULT_SCORE_WEIGHTS },
  ...APP_DEFAULTS,
  minPostAgeHours: 24,
  minPostAgeHoursYoutube: 24,
  recentPostCount: 12,
};

/** 25,000 followers: exactly at the "micro" anchor, so the micro benchmarks apply as written. */
export const FOLLOWERS = 25_000;

export function post(daysAgo: number, likes: number | null, comments: number, views: number | null = null): Post {
  return {
    id: `p${daysAgo}`,
    platformPostId: `p${daysAgo}`,
    type: views === null ? "image" : "reel",
    postedAt: new Date(NOW - daysAgo * DAY).toISOString(),
    likes,
    comments,
    views,
    url: "",
    caption: "",
  };
}

export function creator(overrides: Partial<Creator> = {}): Creator {
  return {
    id: "c1",
    platform: "instagram",
    platformId: "1",
    handle: "test",
    name: "Test Creator",
    photoUrl: null,
    bio: "",
    niche: null,
    city: null,
    country: "Nigeria",
    followers: FOLLOWERS,
    mediaCount: 100,
    accountType: "creator",
    verified: false,
    lastFetchedAt: new Date(NOW).toISOString(),
    notes: "",
    tags: [],
    posts: [],
    snapshots: [{ followers: overrides.followers ?? FOLLOWERS, capturedAt: new Date(NOW).toISOString() }],
    isSample: false,
    ...overrides,
  };
}
