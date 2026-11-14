import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/repository", () => ({ loadSettings: async () => ({}) }));

const row = {
  id: "c1",
  platform: "youtube",
  platform_id: "UC1",
  handle: "tolu",
  name: "Tolu",
  photo_url: null,
  bio: "",
  niche: "Food",
  city: "Lagos",
  country: "Nigeria",
  followers: 10000,
  media_count: 10,
  account_type: "channel",
  verified: false,
  last_fetched_at: "2026-11-10T00:00:00Z",
  notes: "",
  tags: [],
  posts: [
    {
      platform_post_id: "v1",
      type: "video",
      posted_at: "2026-11-09T00:00:00Z",
      likes: 10,
      comments: 3,
      views: 100,
      url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
      caption: "",
    },
  ],
  creator_snapshots: [],
};

describe("audience signals", () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = "yt";
  });
  afterEach(() => {
    delete process.env.YOUTUBE_API_KEY;
  });

  it("reads comments, separates bots, and saves the result on the creator", async () => {
    const { readAudience } = await import("@/lib/server/audience");
    const updates: Record<string, unknown>[] = [];
    const db = {
      from: () => {
        let patch: Record<string, unknown> | null = null;
        const q = {
          select: () => q,
          eq: () => {
            if (patch) updates.push(patch);
            return q;
          },
          update: (p: Record<string, unknown>) => {
            patch = p;
            return q;
          },
          single: async () => ({ data: row, error: null }),
          then: (r: (x: { error: null }) => void) => r({ error: null }),
        };
        return q;
      },
    };
    const texts = [
      "I love this recipe, where can I buy the pepper?",
      "This one sweet die 😍",
      "follow me check my page http://x.co",
      "Great video!",
      "Na wa o",
    ];
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ items: texts.map((t) => ({ snippet: { totalReplyCount: 0, topLevelComment: { snippet: { textOriginal: t, likeCount: 1 } } } })) }),
        ),
    );
    const a = await readAudience(db as never, "c1", fetcher as never);
    expect(a.comments).toBe(5);
    expect(a.spamShare).toBe(20);
    expect(a.sentiment.positive).toBeGreaterThan(0);
    expect(a.languages.length).toBeGreaterThan(0);
    expect((updates[0].audience as { comments: number }).comments).toBe(5);
  });
});
