/**
 * Hand-checked examples. Each expected number was worked out on paper first;
 * the working is in the comments.
 */
import { describe, expect, it } from "vitest";
import { analyzeCreator } from "@/lib/analyze";
import { computeMetrics, engagementBenchmark } from "@/lib/metrics";
import { estimateReach, viewsToReach } from "@/lib/reach";
import { growthFactor } from "@/lib/score";
import { percentile, trimmedMean } from "@/lib/stats";
import { sizeBandFor } from "@/lib/size-bands";
import { applyFilters, EMPTY_FILTERS } from "@/lib/filter";
import { shortlistTotals } from "@/lib/report";
import { suggestNiches } from "@/lib/niche";
import { normalizeHandle } from "@/lib/data/creators";
import { APP_DEFAULTS } from "@config/app";
import { creator, DAY, NOW, post, SETTINGS } from "./helpers";

// A 25K-follower Instagram creator with 4 posts, 2/6/10/14 days old.
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
    // Fewer than 5 posts, so nothing is trimmed: a plain average.
    expect(m.avgLikes).toBe(550); // (400+500+600+700)/4
    expect(m.avgComments).toBe(25); // (10+20+30+40)/4
  });

  it("works out engagement rate and label", () => {
    // (550 + 25) / 25,000 = 2.3%. At 25K the micro numbers apply: poor <1.5%, average <3% → "average"
    expect(m.engagementRate).toBeCloseTo(0.023);
    expect(m.engagementLabel).toBe("average");
  });

  it("marks few posts as low confidence and widens the expected range", () => {
    // Only 4 posts (under 8), so the range is the 10th–90th percentile, not the middle 50%.
    // Per post: 410, 520, 630, 740. 10th → 410 + 0.3 × 110 = 443; 90th → 630 + 0.7 × 110 = 707
    expect(m.lowConfidence).toBe(true);
    expect(m.expectedEngagements!.low).toBeCloseTo(443);
    expect(m.expectedEngagements!.high).toBeCloseTo(707);
  });

  it("uses the middle 50% with enough posts", () => {
    // 8 posts of 410, 420 … 480 engagements: middle 50% = 427.5 to 462.5
    const eight = Array.from({ length: 8 }, (_, i) => ({ ...post(2 + i, 400 + i * 10, 10), id: `e${i}` }));
    const m8 = computeMetrics(creator({ posts: eight }), SETTINGS, NOW);
    expect(m8.lowConfidence).toBe(false);
    expect(m8.expectedEngagements).toEqual({ low: 427.5, high: 462.5 });
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
    // Micro Instagram: 18%–35% of 25,000 = 4,500–8,750
    const r = estimateReach(basic, computeMetrics(basic, SETTINGS, NOW));
    expect(r).toMatchObject({ low: 4_500, high: 8_750, method: "benchmark" });
  });

  it("uses public views × 0.6 when at least 3 posts have them", () => {
    // Views 1000/2000/3000/4000 → middle 50% = 1,750–3,250. Views include repeat plays,
    // so reach = 60% of that: 1,050–1,950
    const c = creator({ posts: [post(2, 400, 10, 1000), post(6, 500, 20, 2000), post(10, 600, 30, 3000), post(14, 700, 40, 4000)] });
    const r = estimateReach(c, computeMetrics(c, SETTINGS, NOW));
    expect(r).toMatchObject({ low: 1_050, high: 1_950, method: "views" });
  });

  it("learns the views-to-reach factor from logged campaign results", () => {
    // Two results reached 40% and 50% of their views → median 45%.
    // Weight = 2 / (2 + 5) = 0.2857 → factor = 0.7143 × 60% + 0.2857 × 45% = 55.71%
    const results = [
      { id: "1", creatorId: "a", postUrl: "", reach: 4_000, impressions: null, views: 10_000, loggedBy: "", loggedAt: "" },
      { id: "2", creatorId: "b", postUrl: "", reach: 5_000, impressions: null, views: 10_000, loggedBy: "", loggedAt: "" },
    ];
    expect(viewsToReach(results).factor).toBeCloseTo(0.5571, 4);
    expect(viewsToReach([]).factor).toBe(0.6);
  });

  it("blends in logged campaign results for the same size band", () => {
    // Two other micro creators reached 30% and 40% of followers → median 35%.
    // Weight = 2 / (2 + 5) = 0.2857. Centre = 0.7143 × 26% + 0.2857 × 35% = 28.57%.
    // Range shrinks by 1 − 0.2857/2 = 0.857: low = 28.57% − 8% × 0.857 = 21.71% × 25,000 → 5,429
    //                                          high = 28.57% + 9% × 0.857 = 36.29% × 25,000 → 9,071
    const others = [creator({ id: "a", followers: 10_000 }), creator({ id: "b", followers: 40_000 })];
    const results = [
      { id: "1", creatorId: "a", postUrl: "", reach: 3_000, impressions: null, views: null, loggedBy: "", loggedAt: "" },
      { id: "2", creatorId: "b", postUrl: "", reach: 16_000, impressions: null, views: null, loggedBy: "", loggedAt: "" },
    ];
    const r = estimateReach(basic, computeMetrics(basic, SETTINGS, NOW), results, [basic, ...others]);
    expect(r.method).toBe("benchmark+campaigns");
    expect(r.low).toBe(5_429);
    expect(r.high).toBe(9_071);
  });

  it("ignores campaign results from a different size band", () => {
    const big = creator({ id: "a", followers: 900_000 });
    const results = [1, 2, 3].map((i) => ({ id: `${i}`, creatorId: "a", postUrl: "", reach: 500_000, impressions: null, views: null, loggedBy: "", loggedAt: "" }));
    expect(estimateReach(basic, computeMetrics(basic, SETTINGS, NOW), results, [basic, big]).method).toBe("benchmark");
  });
});

describe("Creator Score", () => {
  it("matches the hand-worked example and re-balances missing factors", () => {
    // Engagement (no views, so by followers only): 2.3% is between poor (1.5% → 25)
    // and average (3% → 50): 25 + 25 × (2.3 − 1.5) / 1.5 = 38.33
    // Authenticity: no flags → 100
    // Consistency: 4 posts in 14 days = 8.6/month ≥ 8 → frequency 100.
    //   Spread of 410/520/630/740 = 0.2139 → steadiness 100 − 100 × 0.0139/0.8 = 98.26
    //   → (100 + 98.26) / 2 = 99.13
    // Views and growth have no data, so weights 30/25/15 are re-balanced over 70:
    //   (30 × 38.33 + 25 × 100 + 15 × 99.13) / 70 = 73.39 → 73
    const a = analyzeCreator(basic, SETTINGS, NOW);
    expect(a.flags).toEqual([]);
    expect(a.score.breakdown).toEqual({ engagement: 38, authenticity: 100, consistency: 99 });
    expect(a.score.total).toBe(73);
    expect(a.score.missing.map((x) => x.factor).sort()).toEqual(["growth", "views"]);
    expect(a.score.weightsUsed.engagement).toBeCloseTo(30 / 70);
  });

  it("follows the team's weights", () => {
    // Only engagement counts → score = engagement score.
    const weights = { engagement: 10, authenticity: 0, views: 0, consistency: 0, growth: 0 };
    expect(analyzeCreator(basic, { ...SETTINGS, weights }, NOW).score.total).toBe(38);
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

  it("doesn't punish genuinely high engagement", () => {
    // 4,100 / 25,000 = 16.4%: over 2× the "good" line, but with a normal 40 likes per comment
    // and nothing else odd. That's just a great creator: full engagement marks, no flag.
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 4_000, 100)) });
    const a = analyzeCreator(c, SETTINGS, NOW);
    expect(a.flags.map((f) => f.type)).not.toContain("high_engagement");
    expect(a.score.breakdown.engagement).toBe(100);
  });

  it("flags very high engagement only when something else backs it up", () => {
    // 16% engagement with 800 likes per comment (normal is up to 250): likely bought likes.
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 4_000, 5)) });
    const flag = analyzeCreator(c, SETTINGS, NOW).flags.find((f) => f.type === "high_engagement");
    expect(flag?.message).toMatch(/unusual likes-to-comments ratio/);
  });

  it("blends engagement by followers and by views", () => {
    // 4 Reels, each 550 likes + 25 comments on 11,500 views.
    // By followers: 575 / 25,000 = 2.3% → 38.33 (as above).
    // By views: 575 / 11,500 = 5% → between poor (3% → 25) and average (6% → 50): 25 + 25 × 2/3 = 41.67
    // Half and half: (38.33 + 41.67) / 2 = 40
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 550, 25, 11_500)) });
    const a = analyzeCreator(c, SETTINGS, NOW);
    expect(a.metrics.viewEngagementRate).toBeCloseTo(0.05);
    expect(a.metrics.viewEngagementLabel).toBe("average");
    expect(a.score.breakdown.engagement).toBe(40);
  });

  it("doesn't count weak engagement against Authenticity too", () => {
    // Very low engagement shows a flag and lowers Engagement, but Authenticity stays 100.
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 95, 5)) });
    const a = analyzeCreator(c, SETTINGS, NOW);
    expect(a.flags.map((f) => f.type)).toContain("low_engagement");
    expect(a.score.breakdown.authenticity).toBe(100);
  });
});

describe("warning flags", () => {
  it("flags very low engagement as high severity", () => {
    // 100 / 25,000 = 0.4%: below half of the 1.5% "poor" line
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 95, 5)) });
    const f = analyzeCreator(c, SETTINGS, NOW).flags.find((x) => x.type === "low_engagement");
    expect(f?.severity).toBe("high");
    expect(f?.message).toMatch(/0\.4%/);
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
    expect(t.followers).toBe(50_000);
    expect(t.reach).toEqual({ low: 9_000, high: 17_500 });
    expect(t.averageScore).toBe(73);
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

describe("boosted and unusual posts", () => {
  // Six typical posts of 500 likes + 20 comments, plus one boosted post with 10×.
  const typical = [2, 4, 6, 8, 10, 12].map((d) => post(d, 500, 20));
  const boosted = { ...post(3, 5_000, 200), id: "boosted" };

  it("sets aside a post far above the typical one", () => {
    // Median engagement of all 7 posts = 520; the boosted post (5,200) is over 3 × 520, so it's set aside.
    // What's left: six posts of 520 → engagement rate 520 / 25,000 = 2.08%, not inflated by the ad.
    const m = computeMetrics(creator({ posts: [...typical, boosted] }), SETTINGS, NOW);
    expect(m.setAside).toEqual([{ post: expect.objectContaining({ id: "boosted" }), reason: "high_engagement" }]);
    expect(m.typicalPosts).toHaveLength(6);
    expect(m.avgLikes).toBe(500);
    expect(m.engagementRate).toBeCloseTo(0.0208);
  });

  it("would have been inflated by a plain average", () => {
    // For comparison: a plain average would be (6 × 520 + 5,200) / 7 = 1,188.6 → 4.75%.
    const avg = (6 * 520 + 5_200) / 7 / 25_000;
    expect(avg).toBeCloseTo(0.0475, 4);
  });

  it("doesn't set anything aside for normal ups and downs", () => {
    const posts = [400, 450, 500, 520, 600, 700, 900].map((l, i) => post(i + 2, l, 20));
    expect(computeMetrics(creator({ posts }), SETTINGS, NOW).setAside).toEqual([]);
  });

  it("needs at least 5 posts before setting any aside", () => {
    const posts = [post(2, 100, 5), post(4, 100, 5), post(6, 5_000, 5)];
    expect(computeMetrics(creator({ posts }), SETTINGS, NOW).setAside).toEqual([]);
  });

  it("leaves out posts the team excluded", () => {
    const m = computeMetrics(creator({ posts: [...typical, { ...post(3, 900, 30), id: "ad", excluded: true }] }), SETTINGS, NOW);
    expect(m.setAside).toEqual([{ post: expect.objectContaining({ id: "ad" }), reason: "team" }]);
    expect(m.avgLikes).toBe(500);
  });

  it("raises a 'possibly boosted' flag when 2 or more posts are set aside", () => {
    const two = [boosted, { ...post(5, 6_000, 100), id: "boosted2" }];
    const a = analyzeCreator(creator({ posts: [...typical, ...two] }), SETTINGS, NOW);
    expect(a.flags.map((f) => f.type)).toContain("boosted_posts");
    const one = analyzeCreator(creator({ posts: [...typical, boosted] }), SETTINGS, NOW);
    expect(one.flags.map((f) => f.type)).not.toContain("boosted_posts");
  });

  it("looks further back for views when recent posts are photos", () => {
    // 12 recent photos (no views) + 4 older Reels within 6 months: views come from those 4 Reels.
    const photos = Array.from({ length: 12 }, (_, i) => post(i + 2, 500, 20));
    const reels = [20, 30, 40, 50].map((d, i) => ({ ...post(d, 500, 20, 8_000 + i * 1_000), id: `reel${d}` }));
    const old = { ...post(400, 500, 20, 99_000), id: "old" }; // over 6 months old: ignored
    const m = computeMetrics(creator({ posts: [...photos, ...reels, old] }), SETTINGS, NOW);
    expect(m.viewPostCount).toBe(4);
    expect(m.avgViews).toBe(9_500); // median of 8,000 / 9,000 / 10,000 / 11,000
    expect(estimateReach(creator(), m).method).toBe("views");
  });

  it("sets aside a boosted Reel from views", () => {
    const reels = [6_000, 7_000, 8_000, 9_000, 10_000, 90_000].map((v, i) => ({ ...post(i + 2, 500, 20, v), id: `r${i}` }));
    const m = computeMetrics(creator({ posts: reels }), SETTINGS, NOW);
    expect(m.setAside.map((x) => x.reason)).toEqual(["high_views"]);
    expect(m.avgViews).toBe(8_000);
  });
});

describe("replacing set-aside posts", () => {
  // 14 normal posts, one every 3 days, plus one boosted post that's the newest.
  const normal = Array.from({ length: 14 }, (_, i) => ({ ...post(3 + i * 3, 500 + i, 20), id: `n${i}` }));
  const boosted = { ...post(2, 9_000, 300), id: "boosted" };

  it("replaces a set-aside post with the next older one, so 12 posts are still used", () => {
    const m = computeMetrics(creator({ posts: [boosted, ...normal] }), SETTINGS, NOW);
    expect(m.setAside.map((x) => x.post.id)).toEqual(["boosted"]);
    expect(m.typicalPosts).toHaveLength(12);
    // The 12 used are n0…n11: the boosted post's place went to n11 (the 13th post overall).
    expect(m.typicalPosts.map((p) => p.id)).toEqual(normal.slice(0, 12).map((p) => p.id));
    expect(m.postsUsed).toHaveLength(13); // 12 used + 1 set aside
  });

  it("replaces team-excluded posts too", () => {
    const posts = normal.map((p, i) => (i === 0 ? { ...p, excluded: true } : p));
    const m = computeMetrics(creator({ posts }), SETTINGS, NOW);
    expect(m.typicalPosts).toHaveLength(12);
    expect(m.typicalPosts[0].id).toBe("n1");
    expect(m.typicalPosts[11].id).toBe("n12");
  });

  it("doesn't reach back more than 6 months for replacements", () => {
    // 12 posts, the newest boosted; the only other post is 200 days old, so it can't stand in.
    const twelve = [boosted, ...normal.slice(0, 11), { ...post(200, 500, 20), id: "ancient" }];
    const m = computeMetrics(creator({ posts: twelve }), SETTINGS, NOW);
    expect(m.typicalPosts).toHaveLength(11);
    expect(m.typicalPosts.map((p) => p.id)).not.toContain("ancient");
  });

  it("still uses the normal last 12 even if some are older than 6 months", () => {
    // A creator who rarely posts: 12 posts spread over two years all count, as before.
    const rare = Array.from({ length: 12 }, (_, i) => ({ ...post(10 + i * 60, 500, 20), id: `r${i}` }));
    expect(computeMetrics(creator({ posts: rare }), SETTINGS, NOW).typicalPosts).toHaveLength(12);
  });
});

describe("engagement maths update", () => {
  it("has no cliff between size bands", () => {
    // Old behaviour: "poor" jumped from 2% to 1.5% between 9,999 and 10,000 followers.
    const a = engagementBenchmark("instagram", 9_999);
    const b = engagementBenchmark("instagram", 10_000);
    expect(Math.abs(a.poor - b.poor)).toBeLessThan(0.0001);
    // Exactly at an anchor, that band's numbers apply as written.
    expect(engagementBenchmark("instagram", 25_000)).toEqual({ poor: 0.015, average: 0.03, good: 0.05 });
    // Halfway (on a log scale) between nano (5K) and micro (25K) ≈ 11,180: halfway between 2% and 1.5%.
    expect(engagementBenchmark("instagram", Math.sqrt(5_000 * 25_000)).poor).toBeCloseTo(0.0175);
  });

  it("trims the most extreme posts from the average", () => {
    // 5 values: drop the lowest (1) and highest (100), average the rest → 3
    expect(trimmedMean([1, 2, 3, 4, 100])).toBe(3);
    // Fewer than 5: plain average
    expect(trimmedMean([1, 2, 3])).toBe(2);
    // 12 values: drop 1 at each end
    expect(trimmedMean([...Array(10).fill(10), 0, 1000])).toBe(10);
  });

  it("doesn't trim a creator who regularly goes viral", () => {
    // 12 posts, 4 of them 5× the rest: a third of posts is their normal pattern, not boosting.
    const posts = Array.from({ length: 12 }, (_, i) => ({ ...post(2 + i, i % 3 === 0 ? 2_500 : 500, 20), id: `v${i}` }));
    const m = computeMetrics(creator({ posts }), SETTINGS, NOW);
    expect(m.setAside).toEqual([]);
    expect(m.typicalPosts).toHaveLength(12);
  });

  it("spots followers who never watch", () => {
    // 25K followers, Reels get only 500 views (2% of followers; healthy for micro is ~35%),
    // yet the people who watch engage well (45 / 500 = 9% per view) → inactive or bought followers.
    const c = creator({ posts: [2, 6, 10, 14].map((d) => post(d, 40, 5, 500)) });
    const a = analyzeCreator(c, SETTINGS, NOW);
    const flag = a.flags.find((f) => f.type === "inactive_followers");
    expect(flag?.severity).toBe("medium");
    expect(a.score.breakdown.authenticity).toBe(80);
  });

  it("waits 3 days on Instagram and 7 days on YouTube by default", () => {
    const defaults = { ...SETTINGS, minPostAgeHours: APP_DEFAULTS.minPostAgeHours, minPostAgeHoursYoutube: APP_DEFAULTS.minPostAgeHoursYoutube };
    const posts = [post(2, 999, 9), post(4, 500, 20), post(8, 500, 20)];
    // Instagram: the 2-day-old post is too new; 4- and 8-day-old posts count.
    expect(computeMetrics(creator({ posts }), defaults, NOW).typicalPosts).toHaveLength(2);
    // YouTube: only the 8-day-old video counts.
    expect(computeMetrics(creator({ platform: "youtube", posts }), defaults, NOW).typicalPosts).toHaveLength(1);
  });

  it("works out engagement per view, ignoring posts without views", () => {
    // Two Reels: 600/10,000 = 6% and 400/10,000 = 4% → average 5%. The photo (no views) is ignored.
    const c = creator({ posts: [post(2, 580, 20, 10_000), post(4, 390, 10, 10_000), post(6, 900, 50)] });
    expect(computeMetrics(c, SETTINGS, NOW).viewEngagementRate).toBeCloseTo(0.05);
  });
});

describe("views use the middle post", () => {
  it("shows the median views, not the average", () => {
    // Views 1,000 / 2,000 / 3,000 / 4,000 / 9,000 / 10,000 (none over 3× the median, so none set aside).
    // Middle of six = (3,000 + 4,000) / 2 = 3,500. A trimmed average would say 4,500.
    const reels = [1_000, 2_000, 3_000, 4_000, 9_000, 10_000].map((v, i) => ({ ...post(2 + i, 500, 20, v), id: `m${i}` }));
    expect(computeMetrics(creator({ posts: reels }), SETTINGS, NOW).avgViews).toBe(3_500);
  });
});
