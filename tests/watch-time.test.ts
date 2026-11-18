import { describe, expect, it } from "vitest";
import type { Post } from "@/lib/types";
import { expectedWatch, formatWatch, qualityFromScore, watchCurves } from "@/lib/watch-time";

const video = (over: Partial<Post> = {}): Post => ({
  id: Math.random().toString(),
  platformPostId: "x",
  type: "video",
  postedAt: "2026-11-01T10:00:00Z",
  likes: 100,
  comments: 5,
  views: 1000,
  url: "",
  caption: "",
  ...over,
});

describe("Expected watch time", () => {
  it("matches the TikTok study at both ends for typical content", () => {
    expect(watchCurves(7.5, "tiktok").typical).toBeCloseTo(3.0, 0); // Buffer: 3.1s on 5–10s videos
    expect(watchCurves(90, "tiktok").typical).toBeCloseTo(11.1, 0); // Buffer: 11.3s on videos over a minute
  });

  it("lets strong content reach about 52s on a 2–3 minute video", () => {
    const s = watchCurves(150, "tiktok").strong;
    expect(s).toBeGreaterThan(48);
    expect(s).toBeLessThan(56);
    expect(watchCurves(15, "tiktok").strong / 15).toBeGreaterThan(0.6);
  });

  it("never estimates more than the video's own length", () => {
    for (const l of [3, 5, 8]) expect(watchCurves(l, "instagram").strong).toBeLessThanOrEqual(l * 0.95);
  });

  it("treats long YouTube videos by share watched", () => {
    const c = watchCurves(600, "youtube");
    expect(c.longForm).toBe(true);
    expect(c.typical / 600).toBeGreaterThan(0.3);
    expect(c.typical / 600).toBeLessThan(0.45);
    expect(c.strong).toBeGreaterThan(c.typical);
  });

  it("places a creator between typical and strong by Creator Score", () => {
    expect(qualityFromScore(30)).toBe(0);
    expect(qualityFromScore(85)).toBe(1);
    const posts = Array.from({ length: 5 }, () => video({ durationSeconds: 150 }));
    const low = expectedWatch({ platform: "tiktok", posts }, 30, 10_000)!;
    const high = expectedWatch({ platform: "tiktok", posts }, 90, 10_000)!;
    expect(low.perView).toBeCloseTo(low.typical);
    expect(high.perView).toBeCloseTo(high.strong);
    expect(high.lengthFrom).toBe("posts");
    expect(high.hoursPerPost).toBeCloseTo((10_000 * high.perView) / 3600);
  });

  it("assumes a usual length when the platform doesn't give one, and skips photo-only creators", () => {
    const reel = expectedWatch({ platform: "instagram", posts: [video({ type: "reel" })] }, 60, null)!;
    expect(reel.lengthFrom).toBe("assumed");
    expect(reel.length).toBe(30);
    expect(reel.hoursPerPost).toBeNull();
    expect(expectedWatch({ platform: "instagram", posts: [video({ type: "image" })] }, 60, 100)).toBeNull();
  });

  it("writes times plainly", () => {
    expect(formatWatch(9.4)).toBe("9s");
    expect(formatWatch(65)).toBe("1m 05s");
    expect(formatWatch(725)).toBe("12m");
  });
});
