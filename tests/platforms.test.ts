/**
 * The Instagram, YouTube and TikTok (Apify) connections, tested with responses shaped like the
 * official API documentation (no real network calls).
 * TikTok responses follow the Apify actor's documented output.
 */
import { describe, expect, it } from "vitest";
import { LookupError, withRetry } from "@/lib/server/errors";
import { fetchInstagramCreator, mapGraphError } from "@/lib/server/instagram";
import { fetchTikTokCreator, mapApifyError, TIKTOK_MAX_CHARGE_USD, TIKTOK_VIDEO_LIMIT } from "@/lib/server/tiktok";
import { durationSeconds, fetchYouTubeCreator, isChannelId } from "@/lib/server/youtube";

function jsonFetch(routes: (url: URL) => { status?: number; body: unknown }) {
  const calls: URL[] = [];
  const fetcher = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url);
    const { status = 200, body } = routes(url);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { fetcher, calls };
}

const IG = { accessToken: "token", igUserId: "17841400000000000", apiVersion: "v25.0" };

describe("Instagram Business Discovery", () => {
  it("maps a profile and its posts", async () => {
    const { fetcher, calls } = jsonFetch(() => ({
      body: {
        business_discovery: {
          id: "17841401111111111",
          username: "some.creator",
          name: "Some Creator",
          biography: "Food and recipes",
          profile_picture_url: "https://cdn.example/pic.jpg",
          followers_count: 25000,
          media_count: 310,
          media: {
            data: [
              { id: "1", like_count: 900, comments_count: 30, view_count: 15000, media_type: "VIDEO", media_product_type: "REELS", timestamp: "2026-10-10T10:00:00+0000", permalink: "https://instagram.com/reel/1" },
              { id: "2", comments_count: 12, media_type: "IMAGE", media_product_type: "FEED", timestamp: "2026-10-08T10:00:00+0000" },
              { id: "3", like_count: 400, comments_count: 8, media_type: "CAROUSEL_ALBUM", media_product_type: "FEED", timestamp: "2026-10-05T10:00:00+0000" },
            ],
          },
        },
        id: IG.igUserId,
      },
    }));
    const c = await fetchInstagramCreator("some.creator", IG, fetcher);

    expect(calls[0].pathname).toBe(`/v25.0/${IG.igUserId}`);
    expect(calls[0].searchParams.get("fields")).toMatch(/^business_discovery\.username\(some\.creator\)\{.*view_count/);
    expect(c).toMatchObject({ platform: "instagram", platformId: "17841401111111111", handle: "some.creator", followers: 25000, mediaCount: 310 });
    expect(c.posts.map((p) => p.type)).toEqual(["reel", "image", "carousel"]);
    expect(c.posts[0]).toMatchObject({ likes: 900, comments: 30, views: 15000, url: "https://instagram.com/reel/1" });
    expect(c.posts[1].likes).toBeNull(); // hidden likes stay "unknown", not 0
    expect(c.posts[1].views).toBeNull();
  });

  it("explains personal or missing accounts", async () => {
    const { fetcher } = jsonFetch(() => ({
      status: 400,
      body: { error: { message: "Invalid user id", type: "OAuthException", code: 110, error_subcode: 2207013 } },
    }));
    await expect(fetchInstagramCreator("someone_personal", IG, fetcher)).rejects.toMatchObject({ code: "not_professional", message: expect.stringMatching(/personal account/) });
  });

  it("rejects invalid usernames without calling the API", async () => {
    const { fetcher, calls } = jsonFetch(() => ({ body: {} }));
    await expect(fetchInstagramCreator("not a handle!", IG, fetcher)).rejects.toMatchObject({ code: "not_found" });
    expect(calls).toHaveLength(0);
  });

  it("recognises rate limits and expired tokens", () => {
    expect(mapGraphError({ code: 4 }, 400, "x").code).toBe("rate_limited");
    expect(mapGraphError({ code: 80002 }, 400, "x").code).toBe("rate_limited");
    expect(mapGraphError({ code: 190 }, 400, "x").code).toBe("auth");
    expect(mapGraphError({ code: 1 }, 500, "x").code).toBe("upstream");
    // A general "invalid parameter" error must not be blamed on the creator's account type.
    expect(mapGraphError({ code: 100, message: "(#100) Tried accessing nonexisting field (view_count)" }, 400, "x").code).toBe("upstream");
  });
});

describe("YouTube Data API", () => {
  const channel = {
    id: "UCabcdefghijklmnopqrstuv",
    snippet: { title: "Lagos Kitchen", description: "Recipes", customUrl: "@lagoskitchen", country: "NG", thumbnails: { medium: { url: "https://yt.example/m.jpg" } } },
    statistics: { subscriberCount: "120000", hiddenSubscriberCount: false, videoCount: "250" },
    contentDetails: { relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" } },
  };

  it("looks up by handle with 3 cheap calls and maps videos", async () => {
    const { fetcher, calls } = jsonFetch((url) => {
      if (url.pathname.endsWith("/channels")) return { body: { items: [channel] } };
      if (url.pathname.endsWith("/playlistItems")) return { body: { items: [{ contentDetails: { videoId: "v1" } }, { contentDetails: { videoId: "v2" } }] } };
      return {
        body: {
          items: [
            { id: "v1", snippet: { title: "Jollof", publishedAt: "2026-10-01T09:00:00Z" }, statistics: { viewCount: "20000", likeCount: "900", commentCount: "40" }, contentDetails: { duration: "PT12M3S" } },
            { id: "v2", snippet: { title: "Quick tip", publishedAt: "2026-10-03T09:00:00Z" }, statistics: { viewCount: "50000", commentCount: "10" }, contentDetails: { duration: "PT45S" } },
          ],
        },
      };
    });
    const c = await fetchYouTubeCreator("@LagosKitchen", "key", fetcher);

    expect(calls.map((u) => u.pathname.split("/").pop())).toEqual(["channels", "playlistItems", "videos"]);
    expect(calls[0].searchParams.get("forHandle")).toBe("@LagosKitchen");
    expect(calls.some((u) => u.pathname.endsWith("/search"))).toBe(false); // never the 100-unit search
    expect(c).toMatchObject({ platform: "youtube", platformId: channel.id, handle: "lagoskitchen", followers: 120000, country: "NG" });
    expect(c.posts[0]).toMatchObject({ type: "video", views: 20000, likes: 900, comments: 40, url: "https://www.youtube.com/watch?v=v1" });
    expect(c.posts[1]).toMatchObject({ type: "short", likes: null });
  });

  it("looks up by channel ID", async () => {
    const { fetcher, calls } = jsonFetch((url) => (url.pathname.endsWith("/channels") ? { body: { items: [{ ...channel, contentDetails: {} }] } } : { body: {} }));
    await fetchYouTubeCreator(channel.id, "key", fetcher);
    expect(calls[0].searchParams.get("id")).toBe(channel.id);
  });

  it("explains missing channels, hidden subscribers and quota", async () => {
    await expect(fetchYouTubeCreator("nobody", "key", jsonFetch(() => ({ body: { items: [] } })).fetcher)).rejects.toMatchObject({ code: "not_found" });
    const hidden = { ...channel, statistics: { hiddenSubscriberCount: true } };
    await expect(fetchYouTubeCreator("x", "key", jsonFetch(() => ({ body: { items: [hidden] } })).fetcher)).rejects.toMatchObject({ code: "hidden_subscribers" });
    const quota = jsonFetch(() => ({ status: 403, body: { error: { code: 403, message: "quota", errors: [{ reason: "quotaExceeded" }] } } }));
    await expect(fetchYouTubeCreator("x", "key", quota.fetcher)).rejects.toMatchObject({ code: "quota" });
  });

  it("reads durations and channel IDs", () => {
    expect(durationSeconds("PT1M5S")).toBe(65);
    expect(durationSeconds("PT2H")).toBe(7200);
    expect(durationSeconds("P1DT1S")).toBe(86401);
    expect(isChannelId("UCabcdefghijklmnopqrstuv")).toBe(true);
    expect(isChannelId("lagoskitchen")).toBe(false);
  });
});

describe("TikTok via Apify", () => {
  const author = { id: "6900", name: "naija.creator", nickName: "Naija Creator", avatar: "https://cdn.example/a.jpg", signature: "Comedy skits", region: "NG", fans: 52_000, video: 240, privateAccount: false };

  it("maps a profile and its videos, leaving out ads", async () => {
    const { fetcher, calls } = jsonFetch(() => ({
      status: 201,
      body: [
        { id: "1", text: "Skit 1", createTimeISO: "2026-10-10T10:00:00.000Z", webVideoUrl: "https://www.tiktok.com/@naija.creator/video/1", authorMeta: author, diggCount: 4_000, commentCount: 80, playCount: 60_000 },
        { id: "2", text: "Photos", createTime: 1_759_000_000, isSlideshow: true, authorMeta: author, diggCount: 900, commentCount: 10, playCount: 15_000 },
        { id: "3", text: "Ad", isAd: true, createTimeISO: "2026-10-09T10:00:00.000Z", authorMeta: author, diggCount: 1, commentCount: 0, playCount: 5 },
      ],
    }));
    const c = await fetchTikTokCreator("@Naija.Creator", "apify-token", fetcher);
    expect(c).toMatchObject({ platform: "tiktok", platformId: "6900", handle: "naija.creator", name: "Naija Creator", followers: 52_000, mediaCount: 240, country: "NG", accountType: "creator" });
    expect(c.posts).toHaveLength(2);
    expect(c.posts[0]).toMatchObject({ platformPostId: "1", type: "video", likes: 4_000, comments: 80, views: 60_000 });
    expect(c.posts[1]).toMatchObject({ type: "slideshow", postedAt: new Date(1_759_000_000_000).toISOString() });

    const url = calls[0];
    expect(url.pathname).toBe("/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items");
    expect(url.searchParams.get("maxTotalChargeUsd")).toBe(String(TIKTOK_MAX_CHARGE_USD));
    expect(url.searchParams.has("token")).toBe(false); // the token goes in a header, never the URL
    expect(TIKTOK_VIDEO_LIMIT).toBeGreaterThanOrEqual(30);
  });

  it("explains private, missing and empty accounts", async () => {
    const run = (errorCode: string) =>
      fetchTikTokCreator("someone", "t", jsonFetch(() => ({ status: 201, body: [{ input: "someone", error: "x", errorCode }] })).fetcher);
    await expect(run("PROFILE_PRIVATE")).rejects.toMatchObject({ code: "not_found", message: expect.stringContaining("private") });
    await expect(run("NOT_FOUND")).rejects.toMatchObject({ code: "not_found", message: expect.stringContaining("couldn't find") });
    await expect(run("PROFILE_EMPTY")).rejects.toMatchObject({ code: "not_found", message: expect.stringContaining("no public") });
  });

  it("rejects invalid usernames without calling Apify", async () => {
    const { fetcher, calls } = jsonFetch(() => ({ body: [] }));
    await expect(fetchTikTokCreator("not a handle!", "t", fetcher)).rejects.toMatchObject({ code: "not_found" });
    expect(calls).toHaveLength(0);
  });

  it("maps Apify errors", () => {
    expect(mapApifyError(401, { type: "user-or-token-not-found" }).code).toBe("auth");
    expect(mapApifyError(402, { type: "not-enough-usage-to-run-paid-actor" }).code).toBe("quota");
    expect(mapApifyError(429, undefined).code).toBe("rate_limited");
    expect(mapApifyError(408, undefined).code).toBe("upstream");
    expect(mapApifyError(503, undefined).code).toBe("upstream");
  });
});

describe("retrying", () => {
  it("retries rate limits, then gives up", async () => {
    let n = 0;
    const result = await withRetry(async () => {
      if (++n < 2) throw new LookupError("rate_limited", "slow down");
      return "ok";
    }, 3, 1);
    expect(result).toBe("ok");

    let m = 0;
    await expect(
      withRetry(async () => {
        m++;
        throw new LookupError("not_found", "nope");
      }, 3, 1),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(m).toBe(1); // "not found" is never retried
  });
});
