/**
 * Instagram Graph API: Business Discovery.
 * Looks up another business or creator account by its exact username, using
 * Vernacular's own Instagram professional account and access token.
 * Official docs: developers.facebook.com/docs/instagram-platform (Business Discovery).
 */
import type { PostType } from "../types";
import { LookupError } from "./errors";
import type { FetchedCreator, Fetcher } from "./fetched";

/** How many recent posts to fetch: the latest 30 used for the numbers, plus spares to replace set-aside posts. */
export const IG_MEDIA_LIMIT = 45;

const MEDIA_FIELDS = "id,caption,like_count,comments_count,view_count,media_type,media_product_type,timestamp,permalink";
const USER_FIELDS = `id,username,name,biography,profile_picture_url,followers_count,media_count,media.limit(${IG_MEDIA_LIMIT}){${MEDIA_FIELDS}}`;

interface IgMedia {
  id: string;
  caption?: string;
  like_count?: number; // missing when the creator hides likes
  comments_count?: number;
  view_count?: number; // Reels only
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY" | "AD";
  timestamp: string;
  permalink?: string;
}

interface IgUser {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  media?: { data: IgMedia[] };
}

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string };
}

export interface InstagramConfig {
  accessToken: string;
  igUserId: string;
  apiVersion: string;
}

export function instagramConfigFromEnv(): InstagramConfig {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igUserId) {
    throw new LookupError("config", "Instagram isn't connected yet. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID (see docs/SETUP.md).");
  }
  return { accessToken, igUserId, apiVersion: process.env.META_GRAPH_API_VERSION || "v25.0" };
}

/** Instagram usernames: letters, numbers, dots and underscores, up to 30 characters. */
export function isValidInstagramUsername(u: string): boolean {
  return /^[a-z0-9._]{1,30}$/i.test(u);
}

export async function fetchInstagramCreator(username: string, config: InstagramConfig, fetcher: Fetcher = fetch): Promise<FetchedCreator> {
  if (!isValidInstagramUsername(username)) {
    throw new LookupError("not_found", "That isn't a valid Instagram username. Use letters, numbers, dots and underscores only.");
  }
  const url = new URL(`https://graph.facebook.com/${config.apiVersion}/${config.igUserId}`);
  url.searchParams.set("fields", `business_discovery.username(${username}){${USER_FIELDS}}`);
  url.searchParams.set("access_token", config.accessToken);

  let res: Response;
  try {
    res = await fetcher(url, { cache: "no-store" });
  } catch {
    throw new LookupError("upstream", "Couldn't reach Instagram. Please try again in a moment.");
  }
  const body = (await res.json().catch(() => ({}))) as { business_discovery?: IgUser } & GraphError;

  if (!res.ok || body.error) {
    // Logged for Vercel's runtime logs; contains no token.
    console.warn("Instagram Graph error", res.status, body.error?.code, body.error?.error_subcode, body.error?.message);
    throw mapGraphError(body.error, res.status, username);
  }
  const user = body.business_discovery;
  if (!user) throw notProfessional(username);

  return {
    platform: "instagram",
    platformId: user.id,
    handle: user.username,
    name: user.name || user.username,
    photoUrl: user.profile_picture_url ?? null,
    bio: user.biography ?? "",
    followers: user.followers_count ?? 0,
    mediaCount: user.media_count ?? 0,
    accountType: "professional",
    country: null,
    posts: (user.media?.data ?? [])
      .filter((m) => m.media_product_type !== "STORY")
      .map((m) => ({
        platformPostId: m.id,
        type: igPostType(m),
        postedAt: new Date(m.timestamp).toISOString(),
        likes: typeof m.like_count === "number" ? m.like_count : null,
        comments: m.comments_count ?? 0,
        views: typeof m.view_count === "number" ? m.view_count : null,
        url: m.permalink ?? "",
        caption: (m.caption ?? "").slice(0, 300),
      })),
  };
}

function igPostType(m: IgMedia): PostType {
  if (m.media_product_type === "REELS") return "reel";
  if (m.media_type === "CAROUSEL_ALBUM") return "carousel";
  if (m.media_type === "VIDEO") return "video";
  return "image";
}

function notProfessional(username: string): LookupError {
  return new LookupError(
    "not_professional",
    `We couldn't get @${username} from Instagram. Either it's a personal account (Instagram only shares data for business or creator accounts), or the username is misspelled.`,
  );
}

/** Graph API error codes: https://developers.facebook.com/docs/graph-api/guides/error-handling */
export function mapGraphError(err: GraphError["error"], status: number, username: string): LookupError {
  const code = err?.code;
  const sub = err?.error_subcode;
  // 4, 17, 32, 613: app/user/page rate limits; 80002: Instagram business-use-case limit.
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 80002 || status === 429) {
    return new LookupError("rate_limited", "Instagram asked us to slow down. Waiting a little before trying again.", 60);
  }
  // Meta's own wording says which token or permission is the problem, so it's shown too.
  const metaSays = err?.message ? ` Meta says: "${err.message}"` : "";
  if (code === 190 || code === 102) {
    return new LookupError("auth", `Our Instagram access token has expired or is wrong. It needs renewing (see docs/SETUP.md).${metaSays}`);
  }
  if (code === 10 || code === 200) {
    return new LookupError("auth", `Our Instagram app is missing a permission. Check the permissions step in docs/SETUP.md.${metaSays}`);
  }
  // Subcode 2207013 / code 110: "user not found" (personal, private or misspelled account).
  // Code 100 is a general "invalid parameter" error, so only count it when it's about the user.
  if (sub === 2207013 || code === 110 || (code === 100 && /user|username|cannot be found|not found/i.test(err?.message ?? ""))) {
    return notProfessional(username);
  }
  if (status >= 500 || code === 1 || code === 2) {
    return new LookupError("upstream", "Instagram had a temporary problem. Please try again shortly.");
  }
  return new LookupError("upstream", `Instagram returned an error: ${err?.message ?? `HTTP ${status}`}`);
}
