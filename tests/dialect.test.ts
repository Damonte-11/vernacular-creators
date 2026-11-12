import { describe, expect, it } from "vitest";
import { attention, countedViews, monthStats, paceVerdict, readLink, splitTargets, type DialectPost } from "@/lib/dialect";
import { SAMPLE_TODAY, sampleDialectProject } from "@/lib/dialect-sample";

const post = (over: Partial<DialectPost>): DialectPost => ({
  id: "x",
  platform: "tiktok",
  url: "",
  title: "",
  postedAt: "2026-11-05T12:00:00+01:00",
  format: "video",
  contentType: "Skit",
  purpose: "trend",
  views: 1000,
  likes: 10,
  comments: 5,
  shares: 0,
  saves: 0,
  ...over,
});

describe("Dialect", () => {
  it("splits agreement totals evenly by month, the last month taking the rounding", () => {
    const t = splitTargets({ views: 1_000_001, followers: 10, posts: 7, engagements: 0 }, "2026-11", 4);
    expect(Object.keys(t)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(t["2026-11"].views).toBe(250_000);
    expect(t["2027-02"].views).toBe(250_001);
    expect(Object.values(t).reduce((a, x) => a + x.posts, 0)).toBe(7);
  });

  it("holds back a possible ad until someone decides, then counts it the way they chose", () => {
    expect(countedViews(post({ views: 500_000, possibleAd: true }))).toBe(0);
    expect(countedViews(post({ views: 500_000, possibleAd: true, decision: "organic" }))).toBe(500_000);
    expect(countedViews(post({ views: 500_000, possibleAd: true, decision: "manual", organic: { views: 9000, engagements: 300 } }))).toBe(9000);
    expect(countedViews(post({ views: 500_000, possibleAd: true, decision: "excluded" }))).toBe(0);
  });

  it("says where a month stands against its pace", () => {
    expect(paceVerdict(150_000, 300_000, 15, 30).text).toBe("On pace");
    expect(paceVerdict(100_000, 400_000, 12, 30)).toMatchObject({ tone: "bad", text: "Behind pace by 60K" });
    expect(paceVerdict(410_000, 400_000, 31, 31).text).toMatch(/Target met/);
  });

  it("reads the platform and format from a pasted link", () => {
    expect(readLink("https://www.instagram.com/p/ABC/")).toEqual({ platform: "instagram", format: "carousel" });
    expect(readLink("https://www.tiktok.com/@a/photo/123")).toEqual({ platform: "tiktok", format: "carousel" });
    expect(readLink("https://x.com/brand/status/1")).toEqual({ platform: "x", format: "tweet" });
    expect(readLink("https://example.com")).toBeNull();
  });

  it("lists the sample month's possible ad, missing carousel numbers and missing label", () => {
    const p = sampleDialectProject();
    const kinds = attention(p, "2026-11").map((a) => a.kind);
    expect(kinds.filter((k) => k === "ad")).toHaveLength(1);
    expect(kinds).toContain("numbers");
    expect(kinds).toContain("label");
    expect(monthStats(p, "2026-11", SAMPLE_TODAY).heldBack).toHaveLength(1);
  });
});
