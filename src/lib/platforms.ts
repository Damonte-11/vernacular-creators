import type { Platform } from "./types";

/** Every platform, in the order the app shows them. */
export const PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok"];

export function platformName(p: Platform): string {
  return { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[p];
}

/** The creator's own page on the platform, to check who they are. */
export function profileLink(platform: Platform, handle: string, platformId?: string): string {
  if (platform === "instagram") return `https://www.instagram.com/${handle}/`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return platformId && /^UC[A-Za-z0-9_-]{22}$/.test(platformId) ? `https://www.youtube.com/channel/${platformId}` : `https://www.youtube.com/@${handle}`;
}
