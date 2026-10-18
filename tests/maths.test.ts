/**
 * Hand-checked examples. Each expected number was worked out on paper first;
 * the working is in the comments.
 */
import { describe, expect, it } from "vitest";
import { analyzeCreator } from "@/lib/analyze";
import { computeMetrics } from "@/lib/metrics";
import { estimateReach } from "@/lib/reach";
import { growthFactor } from "@/lib/score";
import { percentile } from "@/lib/stats";
import { sizeBandFor } from "@/lib/size-bands";
import { applyFilters, EMPTY_FILTERS } from "@/lib/filter";
import { shortlistTotals } from "@/lib/report";
import { suggestNiches } from "@/lib/niche";
import { normalizeHandle } from "@/lib/data/creators";
import { creator, DAY, NOW, post, SETTINGS } from "./helpers";

// A 20K-follower Instagram creator with 4 posts, 2/6/10/14 days old.
const basic = creator({
  posts: [post(2, 400, 10), post(6, 500, 20), post(10, 600, 30), post(14, 700, 40)],
});

describe("size bands", () => {
  it("puts creators in the right band (lower edge belongs to the higher band)", () => {
    expect(sizeBandFor(9_999)).toBe("nano");
    expect(sizeBandFor(10_000)).toBe("micro");
    expect(sizeBandFor(250_000)).toBe("macro");
    expect(sizeBandFor(5_000_000)).toBe("mega");
  });
});

describe("percentile", () => {
  it("interpolates between values", () => {
    // [410, 520, 630, 740]: 25th → position 0.75 → 410 + 0.75 × 110 = 492.5
    expect(percentile([740, 410, 630, 520], 0.25)).toBeCloseTo(492.5);
    expect(percentile([410, 520, 630, 740], 0.75)).toBeCloseTo(657.5);
  });
});

describe("engagement", () => {
  const m = computeMetrics(basic, SETTINGS, NOW);

  it("averages likes and comments", () => {
    expect(m.avgLikes).toBe(550); // (400+500+600+700)/4
    expect(m.avgComments).toBe(25); // (10+20+30+40)/4
  });

  it("works out engagement rate and label", () => {
    // (550 + 25) / 20,000 = 2.875%. Micro Instagram: poor <1.5%, average <3% → "average"
    expect(m.engagementRate).toBeCloseTo(0.02875);
    expect(m.engagementLabel).toBe("average");
  });

  it("gives expected engagements as the middle 50% of posts", () => {
    // Per post: 410, 520, 630, 740 → 492.5 to 657.5
    expect(m.expectedEngagements!.low).toBeCloseTo(492.5);
    expect(m.expectedEngagements!.high).toBeCloseTo(657.5);
  });

  it("leaves out posts under 24 hours old", () => {
    const c = creator({ posts: [...basic.posts, post(0.5, 99_999, 9_999)] });
    expect(computeMetrics(c, SETTINGS, NOW).avgLikes).toBe(550);
  });

  it("only uses the most recent N posts", () => {
    const m3 = computeMetrics(basic, { ...SETTINGS, recentPostCount: 2 }, NOW);
    expect(m3.avgLikes).toBe(450); // newest two: 400, 500
  });

  it("can't work out engagement when likes are hidden", () => {
    const c = creator({ posts: basic.posts.map((p) => ({ ...p, likes: null })) });
    const mh = computeMetrics(c, SETTINGS, NOW);
    expect(mh.likesHidden).toBe(true);
    expect(mh.engagementRate).toBeNull();
    expect(mh.avgComments).toBe(25);
  });
});

describe("reach estimate", () => {
  it("uses benchmarks when there are no views", () => {
    // Micro Instagram: 18%–35% of 20,000 = 3,600–7,000
    const r = estimateReach(basic, computeMetrics(basic, SETTINGS, NOW));
    expect(r).toMatchObject({ low: 3_600, high: 7_000, method: "benchmark" });
  });

  it("uses public views when at least 3 posts have them", () => {
    // Views 1000/2000/3000/4000 → middle 50% = 1,750–3,250
    const c = creator({ posts: [post(2, 400, 10, 1000), post(6, 500, 20, 2000), post(10, 600, 30, 3000), post(14, 700, 40, 4000)] });
    const r = estimateReach(c, computeMetrics(c, SETTINGS, NOW));
    expect(r).toMatchObject({ low: 1_750, high: 3_250, method: "views" });
  });

  it("blends in logged campaign results for the same size band", () => {
    // Two other micro creators reached 30% and 40% of followers → median 35%.
    // Weight = 2 / (2 + 5) = 0.2857. Centre = 0.7143 × 26% + 0.2857 × 35% = 28.57%.
    // Range shrinks by 1 − 0.2857/2 = 0.857: low = 28.57% − 8% × 0.857 = 21.71% → 4,343
    //                                          high = 28.57% + 9% × 0.857 = 36.29% → 7,257
    const others = [creator({ id: "a", followers: 10_000 }), creator({ id: "b", followers: 40_000 })];
    const results = [
      { id: "1", creatorId: "a", postUrl: "", reach: 3_000, impressions: null, views: null, loggedBy: "", loggedAt: "" },
      { id: "2", creatorId: "b", postUrl: "", reach: 16_000, impressions: null, views: null, loggedBy: "", loggedAt: "" },
    ];
    const r = estimateReach(basic, computeMetrics(basic, SETTINGS, NOW), results, [basic, ...others]);
    expect(r.method).toBe("benchmark+campaigns");
    expect(r.low).toBe(4_343);
    expect(r.high).toBe(7_257);
  });

  it("ignores campaign results from a different size band", () => {
    const big = creator({ id: "a", followers: 900_000 });
    const results = [1, 2, 3].map((i) => ({ id: `${i}`, creatorId: "a", postUrl: "", reach: 500_000, impressions: null, views: null, loggedBy: "", loggedAt: "" }));
    expect(estimateReach(basic, computeMetrics(basic, SETTINGS, NOW), results, [basic, big]).method).toBe("benchmark");
  });
});

describe("Creator Score", () => {
  it("matches the hand-worked example and re-balances missing factors", () => {
    // Engagement: 2.875% is between poor (1.5% → 25) and average (3% → 50):
    //   25 + 25 × (2.875 − 1.5) / 1.5 = 47.92
    // Authenticity: no flags → 100
    // Consistency: 4 posts in 14 days = 8.6/month ≥ 8 → frequency 100.
    //   Spread of 410/520/630/740 = 0.2139 → steadiness 100 − 100 × 0.0139/0.8 = 98.26
    //   → (100 + 98.26) / 2 = 99.13
    // Views and growth have no data, so weights 30/25/15 are re-balanced over 70:
    //   (30 × 47.92 + 25 × 100 + 15 × 99.13) / 70 = 77.49 → 77
    const a = analyzeCreator(basic, SETTINGS, NOW);
    expect(a.flags).toEqual([]);
    expect(a.score.breakdown).toEqual({ engagement: 48, authenticity: 100, consistency: 99 });
    expect(a.score.total).toBe(77);
    expect(a.score.missing.map((x) => x.factor).sort()).toEqual(["growth", "views"]);
    expect(a.score.weightsUsed.engagement).toBeCloseTo(30 / 70);
  });

  it("follows the team's weights", () => {
    // Only engagement counts → score = engagement score.
    const weights = { engagement: 10, authenticity: 0, views: 0, consistency: 0, growth: 0 };
    expect(analyzeCreator(basic, { ...SETTINGS, weights }, NOW).score.total).toBe(48);
  });

  it("scores growth from follower history", () => {
    // 10,000 → 10,300 in 30 days = 3% a month → 80
    const c = creator({
      snapshots: [
        { followers: 10_000, capturedAt: new Date(NOW - 30 * DAY).toISOString() },
        { followers: 10_300, capturedAt: new Date(NOW).toISOString() },
      ],
    });
    expect(growthFactor(c)).toEqual({ score: expect.closeTo(80, 5) });
  });

  it("needs two weeks of history before scoring growth", () => {
    const c = creator({
      snapshots: [
        { followers: 10_000, capturedAt: new Date(NOW - 5 * DAY).toISOString() },
        { followers: 10_300, capturedAt: new Date(NOW).toISOString() },
      ],
    });
    expect("missing" in growthFactor(c)).toBe(true);
  });

  it("doesn't reward suspiciously high engagement", () => {
    // 20% engagement on a micro account is 4× the "good" line: flagged, and engagement score drops below 100.
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 4_000, 5)) });
    const a = analyzeCreator(c, SETTINGS, NOW);
    expect(a.flags.map((f) => f.type)).toContain("high_engagement");
    expect(a.score.breakdown.engagement).toBeLessThan(100);
  });
});

describe("warning flags", () => {
  it("flags very low engagement as high severity", () => {
    // 0.5% on a micro account: below half of the 1.5% "poor" line
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 95, 5)) });
    const f = analyzeCreator(c, SETTINGS, NOW).flags.find((x) => x.type === "low_engagement");
    expect(f?.severity).toBe("high");
    expect(f?.message).toMatch(/0\.5%/);
  });

  it("flags too few likes per comment", () => {
    // 600 likes / 200 comments = 3 per comment (normal 8–250)
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 600, 200)) });
    expect(analyzeCreator(c, SETTINGS, NOW).flags.map((f) => f.type)).toContain("likes_comments_ratio");
  });

  it("flags a sudden follower jump", () => {
    // 20,000 → 26,000 in 3 days = +30%
    const c = creator({
      posts: basic.posts,
      snapshots: [
        { followers: 20_000, capturedAt: new Date(NOW - 10 * DAY).toISOString() },
        { followers: 26_000, capturedAt: new Date(NOW - 7 * DAY).toISOString() },
      ],
    });
    const f = analyzeCreator(c, SETTINGS, NOW).flags.find((x) => x.type === "follower_jump");
    expect(f?.message).toMatch(/30%/);
  });

  it("does not flag steady growth spread over weeks", () => {
    const c = creator({
      posts: basic.posts,
      snapshots: [0, 1, 2, 3].map((w) => ({ followers: 20_000 + w * 500, capturedAt: new Date(NOW - (21 - w * 7) * DAY).toISOString() })),
    });
    expect(analyzeCreator(c, SETTINGS, NOW).flags).toEqual([]);
  });

  it("flags no posts in over 30 days", () => {
    const c = creator({ posts: [40, 44, 48, 52].map((d) => post(d, 500, 20)) });
    const f = analyzeCreator(c, SETTINGS, NOW).flags.find((x) => x.type === "posting_gap");
    expect(f?.message).toMatch(/last 40 days/);
  });

  it("flags big swings between posts", () => {
    const c = creator({ posts: [2, 4, 6, 8, 10, 12].map((d, i) => post(d, i === 0 ? 5_000 : 200, 10)) });
    expect(analyzeCreator(c, SETTINGS, NOW).flags.map((f) => f.type)).toContain("engagement_swings");
  });
});

describe("helpers", () => {
  it("filters by follower range written as 10k", () => {
    const list = [analyzeCreator(basic, SETTINGS, NOW), analyzeCreator(creator({ id: "x", followers: 5_000 }), SETTINGS, NOW)];
    expect(applyFilters(list, { ...EMPTY_FILTERS, followersMin: "10k" }).map((a) => a.creator.id)).toEqual(["c1"]);
  });

  it("adds up shortlist totals", () => {
    const a = analyzeCreator(basic, SETTINGS, NOW);
    const t = shortlistTotals([a, a]);
    expect(t.followers).toBe(40_000);
    expect(t.reach).toEqual({ low: 7_200, high: 14_000 });
    expect(t.averageScore).toBe(77);
  });

  it("suggests niches from a bio", () => {
    expect(suggestNiches("Chef sharing easy recipes and food reviews")[0]).toBe("Food");
  });

  it("reads handles from links", () => {
    expect(normalizeHandle("https://www.instagram.com/Some.Creator/")).toBe("some.creator");
    expect(normalizeHandle("@Someone")).toBe("someone");
    expect(normalizeHandle("youtube.com/@channel_name")).toBe("channel_name");
  });
});
