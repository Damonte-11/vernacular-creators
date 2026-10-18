import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { APP_DEFAULTS } from "@config/app";
import type { Creator, Post, Settings } from "@/lib/types";

export const NOW = Date.UTC(2026, 9, 18, 12);
export const DAY = 86_400_000;

export const SETTINGS: Settings = { weights: { ...DEFAULT_SCORE_WEIGHTS }, ...APP_DEFAULTS };

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
    followers: 20_000,
    mediaCount: 100,
    accountType: "creator",
    verified: false,
    lastFetchedAt: new Date(NOW).toISOString(),
    notes: "",
    tags: [],
    posts: [],
    snapshots: [{ followers: overrides.followers ?? 20_000, capturedAt: new Date(NOW).toISOString() }],
    isSample: false,
    ...overrides,
  };
}
