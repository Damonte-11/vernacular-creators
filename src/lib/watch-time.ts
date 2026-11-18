/**
 * Expected watch time per view: an estimate, not platform data (platforms only show watch time to the creator).
 *
 * watch per view = somewhere between a TYPICAL and a STRONG curve for the video length,
 * placed by the creator's Creator Score (which already weighs engagement, views and authenticity
 * against creators of the same size).
 *
 * - TYPICAL is fitted to Buffer's 1.1M-video TikTok study: about 3.1s watched on 5–10s videos and
 *   11.3s on videos over a minute, averaged over everyone the video reached (quick scrolls included):
 *   1.07 × length^0.52 seconds. Reels watch a little longer (Metricool: about 8.5s on average), so ×1.2.
 * - STRONG is what good content gets, set by the team's own experience: about 52s watched on a 2–3 minute
 *   video, and about two-thirds of a 15s one: 1.6 × length^0.695 seconds.
 * - Long YouTube videos (over 3 minutes) are chosen, not scrolled into, so they use the share of the video
 *   watched instead: typical 45% at 5 minutes falling to 30% past 15; strong 60% falling to 45%.
 */
import type { Creator, Platform, Post } from "./types";

export interface WatchEstimate {
  /** Typical video length used, in seconds. */
  length: number;
  /** "posts": from this creator's own videos; "assumed": a usual length for the platform (Instagram's API doesn't give it). */
  lengthFrom: "posts" | "assumed";
  longForm: boolean;
  /** Seconds watched per view for average content of this length, and for strong content. */
  typical: number;
  strong: number;
  /** This creator's estimate, in seconds per view. */
  perView: number;
  /** Where the creator sits between typical (0) and strong (1). */
  quality: number;
  /** Expected views × watch per view, in hours; null without expected views. */
  hoursPerPost: number | null;
}

const VIDEO_TYPES = new Set<Post["type"]>(["reel", "video", "short"]);
/** Usual lengths when a platform doesn't say: Reels and TikToks run about half a minute. */
const ASSUMED_LENGTH: Record<Platform, number> = { instagram: 30, tiktok: 35, youtube: 40 };
const LONG_FORM = 180;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Share watched for long videos, sliding on a log scale between 5 and 15 minutes. */
function longShare(length: number, at5: number, at15: number): number {
  const k = clamp(Math.log(length / 300) / Math.log(3), 0, 1);
  return at5 + (at15 - at5) * k;
}

/** Seconds watched per view for average and for strong content of this length. */
export function watchCurves(length: number, platform: Platform): { typical: number; strong: number; longForm: boolean } {
  const longForm = platform === "youtube" && length > LONG_FORM;
  if (longForm) return { typical: length * longShare(length, 0.45, 0.3), strong: length * longShare(length, 0.6, 0.45), longForm };
  const cap = length * 0.95;
  const typical = Math.min(cap, 1.07 * Math.pow(length, 0.52) * (platform === "instagram" ? 1.2 : 1));
  const strong = Math.max(typical, Math.min(cap, 1.6 * Math.pow(length, 0.695)));
  return { typical, strong, longForm };
}

/** Score 35 or below sits at typical, 85 or above at strong; no score yet sits a little above typical. */
export function qualityFromScore(score: number | null): number {
  return score === null ? 0.3 : clamp((score - 35) / 50, 0, 1);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** The estimate for a creator, or null when they don't post videos. */
export function expectedWatch(c: Pick<Creator, "platform" | "posts">, score: number | null, expectedViews: number | null): WatchEstimate | null {
  const videos = c.posts.filter((p) => VIDEO_TYPES.has(p.type) && !p.excluded);
  if (!videos.length) return null;
  // The latest dozen videos with a known length say what this creator usually makes.
  const known = videos
    .filter((p) => (p.durationSeconds ?? 0) > 0)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, 12)
    .map((p) => p.durationSeconds!);
  const length = known.length ? median(known) : ASSUMED_LENGTH[c.platform];
  const { typical, strong, longForm } = watchCurves(length, c.platform);
  const quality = qualityFromScore(score);
  const perView = typical + quality * (strong - typical);
  return {
    length,
    lengthFrom: known.length ? "posts" : "assumed",
    longForm,
    typical,
    strong,
    perView,
    quality,
    hoursPerPost: expectedViews === null ? null : (expectedViews * perView) / 3600,
  };
}

/** "9s", "1m 05s", "12m". */
export function formatWatch(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m >= 10 ? `${m}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
