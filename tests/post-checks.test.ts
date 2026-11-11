import { beforeEach, describe, expect, it, vi } from "vitest";
import { dueCheckDay, instagramShortcode, isShortTikTokLink, tiktokVideoId, youtubeVideoId } from "@/lib/post-links";
import type { PostCheck } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/repository", () => ({ loadSettings: async () => ({}), saveFetchedCreator: async () => ({}) }));

describe("reading post links", () => {
  it("finds Instagram codes with or without the username in the link", () => {
    expect(instagramShortcode("https://www.instagram.com/reel/C8xYz_1-a/?igsh=abc")).toBe("C8xYz_1-a");
    expect(instagramShortcode("https://instagram.com/tolukitchen/p/CABC123/")).toBe("CABC123");
    expect(instagramShortcode("https://instagram.com/tolukitchen/")).toBeNull();
  });
  it("finds YouTube video IDs in every link shape", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ?si=x"]) {
      expect(youtubeVideoId(u)).toBe("dQw4w9WgXcQ");
    }
    expect(youtubeVideoId("https://youtube.com/@channel")).toBeNull();
  });
  it("finds TikTok video IDs and spots short links that need opening first", () => {
    expect(tiktokVideoId("https://www.tiktok.com/@kemi.cooks/video/7301234567890?lang=en")).toBe("7301234567890");
    expect(tiktokVideoId("https://vm.tiktok.com/ZMabc/")).toBeNull();
    expect(isShortTikTokLink("https://vm.tiktok.com/ZMabc/")).toBe(true);
  });
});

describe("which posts are due a check", () => {
  const now = Date.UTC(2026, 10, 10, 12);
  const post = (postedDate: string, days: number[] = []) => ({ creatorId: "c", postedDate, checks: days.map((day) => ({ day }) as PostCheck) });
  it("reads day 1, 3 and 7 once each, and the latest one missed", () => {
    expect(dueCheckDay(post("2026-11-10"), "2026-11-10", null, now)).toBeNull(); // posted today
    expect(dueCheckDay(post("2026-11-09"), "2026-11-10", null, now)).toBe(1);
    expect(dueCheckDay(post("2026-11-07", [1]), "2026-11-10", null, now)).toBe(3);
    expect(dueCheckDay(post("2026-11-01", [1, 3]), "2026-11-10", null, now)).toBe(7);
    expect(dueCheckDay(post("2026-11-01", [1, 3, 7]), "2026-11-10", null, now)).toBeNull();
    expect(dueCheckDay(post("2026-10-20"), "2026-11-10", null, now)).toBe(7); // added late: one reading
  });
  it("waits a day after any attempt, and skips posts with no creator", () => {
    expect(dueCheckDay(post("2026-11-09"), "2026-11-10", new Date(now - 3_600_000).toISOString(), now)).toBeNull();
    expect(dueCheckDay({ ...post("2026-11-09"), creatorId: null }, "2026-11-10", null, now)).toBeNull();
  });
});

/** Just enough of the Supabase client for the job: reads return `rows`, updates are recorded. */
function fakeDb(rows: Record<string, unknown>[]) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const db = {
    from() {
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        not: () => q,
        gte: () => q,
        limit: () => q,
        in: () => q,
        eq: (_col: string, v: string) => {
          if (patch) updates.push({ id: v, patch });
          return q;
        },
        update: (p: Record<string, unknown>) => {
          patch = p;
          return q;
        },
        then: (resolve: (r: { data: unknown; error: null }) => void) => resolve({ data: patch ? null : rows, error: null }),
      };
      return q;
    },
  };
  return { db: db as never, updates };
}

describe("the post-checks job", () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = "yt-key";
    process.env.APIFY_TOKEN = "apify";
  });

  it("reads YouTube and TikTok posts, saves numbers, and notes what it couldn't read", async () => {
    const { runPostChecks } = await import("@/lib/server/post-checks");
    const now = Date.UTC(2026, 10, 10, 12);
    const rows = [
      {
        id: "y1",
        project_id: "p",
        url: "https://youtu.be/AAAAAAAAAAA",
        platform: "youtube",
        posted_date: "2026-11-09",
        checks: [],
        last_tried_at: null,
        creator_id: "c1",
        creators: { handle: "a", platform: "youtube" },
      },
      {
        id: "y2",
        project_id: "p",
        url: "https://youtu.be/BBBBBBBBBBB",
        platform: "youtube",
        posted_date: "2026-11-07",
        checks: [],
        last_tried_at: null,
        creator_id: "c1",
        creators: { handle: "a", platform: "youtube" },
      },
      {
        id: "t1",
        project_id: "p",
        url: "https://www.tiktok.com/@kemi/video/111",
        platform: "tiktok",
        posted_date: "2026-11-07",
        checks: [],
        last_tried_at: null,
        creator_id: "c2",
        creators: { handle: "kemi", platform: "tiktok" },
      },
    ];
    const { db, updates } = fakeDb(rows);
    const fetcher = vi.fn(async (url: URL | string) => {
      const u = String(url);
      if (u.includes("googleapis")) {
        return new Response(
          JSON.stringify({
            items: [
              { id: "AAAAAAAAAAA", snippet: { publishedAt: "2026-11-09T10:00:00Z" }, statistics: { viewCount: "5000", likeCount: "300", commentCount: "20" } },
            ],
          }),
        );
      }
      return new Response(
        JSON.stringify([{ id: "111", playCount: 9000, diggCount: 700, commentCount: 40, shareCount: 12, createTimeISO: "2026-11-07T09:00:00Z" }]),
      );
    });
    const summary = await runPostChecks(db, { deadline: Date.now() + 60_000, now, fetcher: fetcher as never });

    expect(summary.checked).toBe(2);
    expect(summary.problems).toBe(1);
    const y1 = updates.find((u) => u.id === "y1")!.patch;
    expect((y1.checks as PostCheck[])[0]).toMatchObject({ day: 1, views: 5000, likes: 300, comments: 20, source: "auto" });
    expect(updates.find((u) => u.id === "y2")!.patch.problem).toMatch(/deleted or private/);
    const t1 = updates.find((u) => u.id === "t1")!.patch;
    expect((t1.checks as PostCheck[])[0]).toMatchObject({ day: 3, views: 9000, likes: 700, comments: 40, shares: 12 });
    // One YouTube call for both videos, one Apify run for TikTok.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("Check numbers now", () => {
  it("reads every post on demand, even ones already read, filed under the post's real age", async () => {
    process.env.YOUTUBE_API_KEY = "yt-key";
    const { runPostChecks } = await import("@/lib/server/post-checks");
    const now = Date.UTC(2026, 10, 20, 12);
    const rows = [
      // Day-7 reading already in and tried an hour ago: the scheduled run would skip it.
      { id: "y1", project_id: "p", url: "https://youtu.be/AAAAAAAAAAA", platform: "youtube", posted_date: "2026-11-10", checks: [{ day: 7, views: 1 }], last_tried_at: new Date(now - 3_600_000).toISOString(), creator_id: "c1", creators: { handle: "a", platform: "youtube" } },
    ];
    const { db, updates } = fakeDb(rows);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [{ id: "AAAAAAAAAAA", snippet: { publishedAt: "2026-11-10T10:00:00Z" }, statistics: { viewCount: "9000", likeCount: "500", commentCount: "40" } }] })));
    expect((await runPostChecks(db, { deadline: Date.now() + 60_000, now, fetcher: fetcher as never })).checked).toBe(0);
    const summary = await runPostChecks(db, { deadline: Date.now() + 60_000, now, fetcher: fetcher as never, force: true });
    expect(summary.checked).toBe(1);
    const checks = updates.find((u) => u.id === "y1")!.patch.checks as PostCheck[];
    expect(checks.map((c) => c.day)).toEqual([7, 10]); // the day-7 reading stays, today's is added
    expect(checks[1].views).toBe(9000);
  });
});
