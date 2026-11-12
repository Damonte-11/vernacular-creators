import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const brief = {
  brand: "Zest",
  product: "Zest Juice",
  keyMessage: "No added sugar",
  mustSay: ["no added sugar", "#ZestUp"],
  donts: ["swearing"],
  hashtags: [],
  dos: [],
  competitors: [],
  notes: "",
};

/** Just enough of Supabase: the project, its posts, and recorded updates. */
function fakeDb(posts: Record<string, unknown>[]) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const db = {
    from(table: string) {
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        not: () => q,
        eq: (_c: string, v: string) => {
          if (patch) updates.push({ id: v, patch });
          return q;
        },
        update: (p: Record<string, unknown>) => {
          patch = p;
          return q;
        },
        single: async () => ({ data: { brief, client: "Zest Ltd" }, error: null }),
        then: (resolve: (r: { data: unknown; error: null }) => void) => resolve({ data: patch ? null : table === "project_posts" ? posts : null, error: null }),
      };
      return q;
    },
  };
  return { db: db as never, updates };
}

const answer = {
  productShown: true,
  productFirstSecond: 3,
  keyMessage: "said",
  mustSays: [
    { item: "No added sugar", found: true },
    { item: "#ZestUp", found: false },
    { item: "made up item", found: true },
  ],
  dontsBroken: ["swearing", "something not in the brief"],
  hook: "Opens on a juice pour",
  callToAction: true,
  format: "review",
  note: "Clear and on brief.",
};

function gemini(url: string) {
  if (url.endsWith(":generateContent")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }));
  return null;
}

describe("video review", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "g-key";
    process.env.APIFY_TOKEN = "apify-token";
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.APIFY_TOKEN;
  });

  it("needs a Gemini key", async () => {
    delete process.env.GEMINI_API_KEY;
    const { reviewVideos } = await import("@/lib/server/video-review");
    const { db } = fakeDb([]);
    expect((await reviewVideos(db, "p1")).message).toMatch(/Gemini key/);
  });

  it("has Gemini watch YouTube by link and TikTok by uploaded file, keeping only the brief's own items", async () => {
    const { reviewVideos } = await import("@/lib/server/video-review");
    const posts = [
      { id: "a", url: "https://youtu.be/abcdefghijk", platform: "youtube", creator_id: "c1", content_review: null, creators: { handle: "yt" } },
      {
        id: "b",
        url: "https://www.tiktok.com/@tk/video/7300000000000000001",
        platform: "tiktok",
        creator_id: "c2",
        content_review: null,
        creators: { handle: "tk" },
      },
      {
        id: "c",
        url: "https://www.tiktok.com/@tk/video/7300000000000000002",
        platform: "tiktok",
        creator_id: "c2",
        content_review: { watchedAt: "x", productShown: true },
        creators: { handle: "tk" },
      },
    ];
    const { db, updates } = fakeDb(posts);
    const bodies: Record<string, unknown>[] = [];
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("apify.com/v2/acts")) {
        bodies.push(JSON.parse(init!.body as string));
        return new Response(JSON.stringify([{ id: "7300000000000000001", mediaUrls: ["https://api.apify.com/v2/key-value-stores/s/records/v1"] }]));
      }
      if (url.startsWith("https://api.apify.com/v2/key-value-stores")) {
        expect(url).toContain("token=apify-token");
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "video/mp4" } });
      }
      if (url.includes("/upload/v1beta/files")) return new Response("{}", { headers: { "x-goog-upload-url": "https://upload.example/u1" } });
      if (url === "https://upload.example/u1") return new Response(JSON.stringify({ file: { name: "files/1", uri: "https://g/files/1", state: "ACTIVE" } }));
      const g = gemini(url);
      if (g) {
        bodies.push(JSON.parse(init!.body as string));
        return g;
      }
      throw new Error(`unexpected ${url}`);
    });
    const result = await reviewVideos(db, "p1", { fetcher: fetcher as never });
    expect(result).toMatchObject({ watched: 2, failed: 0, left: 0 });
    // Already-watched post "c" is left alone; TikTok asks Apify for the video file.
    expect(bodies[0]).toMatchObject({ postURLs: ["https://www.tiktok.com/@tk/video/7300000000000000001"], shouldDownloadVideos: true });
    const parts = bodies.slice(1).map((b) => (b as { contents: { parts: { fileData?: { fileUri: string } }[] }[] }).contents[0].parts[0].fileData?.fileUri);
    expect(parts).toEqual(["https://www.youtube.com/watch?v=abcdefghijk", "https://g/files/1"]);
    const saved = updates.find((u) => u.id === "a")!.patch.content_review as Record<string, unknown>;
    expect(saved.mustSays).toEqual([
      { item: "no added sugar", found: true },
      { item: "#ZestUp", found: false },
    ]);
    expect(saved.dontsBroken).toEqual(["swearing"]);
    expect(saved.problem).toBeNull();
  });

  it("saves why a video couldn't be watched, so it's tried again next time", async () => {
    const { reviewVideos } = await import("@/lib/server/video-review");
    const posts = [
      { id: "i", url: "https://www.instagram.com/p/ABC123/", platform: "instagram", creator_id: "c3", content_review: null, creators: { handle: "ig" } },
    ];
    process.env.INSTAGRAM_ACCESS_TOKEN = "t";
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "1";
    const { db, updates } = fakeDb(posts);
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            business_discovery: {
              media: { data: [{ permalink: "https://www.instagram.com/p/ABC123/", media_url: "https://cdn/x.jpg", media_type: "IMAGE" }] },
            },
          }),
        ),
    );
    const result = await reviewVideos(db, "p1", { fetcher: fetcher as never });
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    expect(result).toMatchObject({ watched: 0, failed: 1 });
    expect((updates[0].patch.content_review as { problem: string }).problem).toMatch(/photo or carousel/);
  });
});
