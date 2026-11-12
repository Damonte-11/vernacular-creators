import { describe, expect, it, vi } from "vitest";
import { followersFor, canMakeReport } from "@/lib/dialect";
import { sampleDialectProject } from "@/lib/dialect-sample";

vi.mock("server-only", () => ({}));

const at = (iso: string) => Date.parse(iso);

describe("Dialect reads", () => {
  it("reads new posts at once, this month's every 7 days, and last month's once more on the 1st", async () => {
    const { duePosts } = await import("@/lib/server/dialect-reads");
    const base = sampleDialectProject();
    const post = (id: string, postedAt: string, lastReadAt: string | null) => ({ ...base.posts[0], id, postedAt, lastReadAt });
    const p = {
      ...base,
      posts: [
        post("new", "2026-11-10T12:00:00+01:00", null),
        post("fresh", "2026-11-03T12:00:00+01:00", "2026-11-09T12:00:00Z"),
        post("stale", "2026-11-02T12:00:00+01:00", "2026-11-04T12:00:00Z"),
        post("october", "2026-10-20T12:00:00+01:00", "2026-10-28T12:00:00Z"),
      ],
    };
    expect(duePosts(p, at("2026-11-12T10:00:00Z")).map((x) => x.id)).toEqual(["new", "stale"]);
    // On 1 December: November's posts get their final read; October's are left alone.
    const dec = { ...p, posts: p.posts.map((x) => ({ ...x, lastReadAt: "2026-11-29T12:00:00Z" })) };
    expect(duePosts(dec, at("2026-12-01T06:00:00Z")).map((x) => x.id)).toEqual(["new", "fresh", "stale"]);
    expect(duePosts(dec, at("2026-12-05T06:00:00Z"))).toEqual([]);
  });

  it("reads X numbers whichever spelling the scraper uses", async () => {
    const { readXItem, tweetId } = await import("@/lib/server/x-posts");
    expect(tweetId("https://x.com/brand/status/1850000000000000000?s=20")).toBe("1850000000000000000");
    expect(
      readXItem({ id: "1", viewCount: 900, likeCount: 12, replyCount: 3, retweetCount: 2, quoteCount: 1, bookmarkCount: 4, author: { followers: 5000 } }),
    ).toMatchObject({
      views: 900,
      likes: 12,
      replies: 3,
      reposts: 2,
      quotes: 1,
      bookmarks: 4,
      authorFollowers: 5000,
    });
    expect(readXItem({ id_str: "2", favorite_count: 7, user: { followers_count: 10 } })).toMatchObject({ likes: 7, authorFollowers: 10 });
    expect(readXItem({ id: "not a tweet" })).toBeNull();
  });

  it("works out new followers from the counts read, unless typed in", () => {
    const p = {
      followersManual: {},
      followerReads: [
        { at: "2026-10-30T10:00:00Z", platform: "instagram" as const, followers: 1000 },
        { at: "2026-11-08T10:00:00Z", platform: "instagram" as const, followers: 1150 },
        { at: "2026-11-02T10:00:00Z", platform: "tiktok" as const, followers: 400 },
        { at: "2026-11-09T10:00:00Z", platform: "tiktok" as const, followers: 460 },
      ],
    };
    expect(followersFor(p, "2026-11")).toBe(150 + 60);
    expect(followersFor({ ...p, followersManual: { "2026-11": 99 } }, "2026-11")).toBe(99);
  });

  it("only makes a month's report from the 1st of the next month", () => {
    expect(canMakeReport("2026-11", "2026-11-30")).toBe(false);
    expect(canMakeReport("2026-11", "2026-12-01")).toBe(true);
    expect(canMakeReport("2026-12", "2027-01-01")).toBe(true);
  });
});
