import type { Platform } from "./types";

/** Every platform, in the order the app shows them. */
export const PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok"];

export function platformName(p: Platform): string {
  return { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[p];
}
