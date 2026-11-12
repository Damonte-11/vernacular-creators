/**
 * Reading post links, and deciding which campaign posts are due a numbers
 * check. No network calls here, so it's easy to test.
 */
import { addDays, daysBetween, nextCheckDay } from "./projects";
import type { ProjectPost } from "./types";

/** The code in an Instagram post link: instagram.com/p/CODE, /reel/CODE, /tv/CODE (with or without the username first). */
export function instagramShortcode(url: string): string | null {
  return url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i)?.[1] ?? null;
}

/** The video ID in a YouTube link: watch?v=ID, youtu.be/ID, /shorts/ID, /live/ID or /embed/ID. */
export function youtubeVideoId(url: string): string | null {
  return (
    url.match(/[?&]v=([\w-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([\w-]{11})/i)?.[1] ??
    url.match(/youtube\.com\/(?:shorts|live|embed)\/([\w-]{11})/i)?.[1] ??
    null
  );
}

/** The video ID in a full TikTok link (tiktok.com/@user/video/ID or /photo/ID). Short vm.tiktok.com links have none until opened. */
export function tiktokVideoId(url: string): string | null {
  // Short links sometimes open as tiktok.com/@/video/ID, with no username: the ID is still good.
  return url.match(/tiktok\.com\/@[\w.]*\/(?:video|photo)\/(\d+)/i)?.[1] ?? null;
}

export function isShortTikTokLink(url: string): boolean {
  return /\/\/(vm|vt)\.tiktok\.com\//i.test(url) || /tiktok\.com\/t\//i.test(url);
}

/** A post isn't tried again within this many hours after a failed or successful attempt. */
export const RETRY_AFTER_HOURS = 20;

/**
 * The reading a post is due for today, or null. Posts without a creator or a
 * posting date wait; a post tried in the last RETRY_AFTER_HOURS waits too, so
 * an hourly job still reads each post at most once a day.
 */
export function dueCheckDay(
  post: Pick<ProjectPost, "creatorId" | "postedDate" | "checks">,
  today: string,
  lastTriedAt: string | null,
  now: number,
): number | null {
  if (!post.creatorId || !post.postedDate) return null;
  if (lastTriedAt && now - Date.parse(lastTriedAt) < RETRY_AFTER_HOURS * 3_600_000) return null;
  return nextCheckDay(post as ProjectPost, today);
}

/** Lagos date (YYYY-MM-DD) of a moment, for a post's posting date. */
export function lagosDate(iso: string): string {
  return new Date(Date.parse(iso) + 3_600_000).toISOString().slice(0, 10);
}

/** How old a post is today, in days (never negative). */
export function postAge(postedDate: string, today: string): number {
  return Math.max(0, daysBetween(postedDate, today));
}

export { addDays };
