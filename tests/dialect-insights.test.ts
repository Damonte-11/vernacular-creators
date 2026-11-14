import { describe, expect, it } from "vitest";
import type { DialectPost, DialectProject } from "@/lib/dialect";
import { SAMPLE_TODAY, sampleDialectProject } from "@/lib/dialect-sample";
import { bestDay, changeShare, consistency, monthChange, topPosts, whatWorks } from "@/lib/dialect-insights";

let n = 0;
const post = (over: Partial<DialectPost>): DialectPost => ({
  id: `p${n++}`,
  platform: "tiktok",
  url: "",
  title: "",
  postedAt: "2026-11-05T12:00:00+01:00",
  format: "video",
  contentType: "Educational",
  purpose: "safety",
  views: 1000,
  likes: 40,
  comments: 10,
  shares: 0,
  saves: 0,
  ...over,
});
const project = (posts: DialectPost[]): DialectProject => ({ ...sampleDialectProject(), posts, followerReads: [], followersManual: {} });

describe("Dialect insights", () => {
  it("compares a running month with the same days of last month", () => {
    const p = project([
      post({ postedAt: "2026-10-03T10:00:00+01:00", views: 1000 }),
      post({ postedAt: "2026-10-20T10:00:00+01:00", views: 9000 }), // after day 12: left out of the comparison
      post({ postedAt: "2026-11-04T10:00:00+01:00", views: 1500 }),
    ]);
    const c = monthChange(p, "2026-11", "2026-11-12")!;
    expect(c.prev).toBe("2026-10");
    expect(c.sameDays).toBe(12);
    expect(c.views).toEqual({ now: 1500, before: 1000 });
    expect(changeShare(c.views)).toBeCloseTo(0.5);
    expect(c.followers).toBeNull();
    expect(monthChange(project([post({})]), "2026-11", "2026-11-12")).toBeNull();
  });

  it("finds the best day to post from average views, not one lucky post", () => {
    const p = project([
      ...Array.from({ length: 6 }, (_, i) => post({ postedAt: `2026-11-0${i + 2}T12:00:00+01:00`, views: 1000 })), // Mon–Sat
      post({ postedAt: "2026-11-05T18:00:00+01:00", views: 9000 }), // a second Thursday post
      post({ postedAt: "2026-10-29T12:00:00+01:00", views: 7000 }), // Thursday
      post({ postedAt: "2026-11-08T12:00:00+01:00", views: 50_000 }), // one Sunday post
      post({ postedAt: "2026-10-26T12:00:00+01:00", views: 1000 }),
      post({ postedAt: "2026-10-27T12:00:00+01:00", views: 1000 }),
    ]);
    const b = bestDay(p, "2026-11", "2026-11-12");
    expect(b.bars.map((x) => x.day)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(b.bars[3].posts).toBe(3);
    expect(b.best).toBe(3); // Thursday, not the single Sunday post
  });

  it("measures posting against the month's posts target", () => {
    const p = project([post({}), post({}), post({ decision: "excluded" })]);
    p.monthTargets["2026-11"] = { ...p.monthTargets["2026-11"], posts: 30 };
    expect(consistency(p, "2026-11", "2026-11-15")).toEqual({ done: 2, target: 30, expected: 15 });
  });

  it("lists a platform's top posts by counted views", () => {
    const p = project([post({ views: 10 }), post({ views: 300 }), post({ views: 50, platform: "instagram" })]);
    expect(topPosts(p, "2026-11", "tiktok").map((x) => x.views)).toEqual([300, 10]);
  });

  it("says what's working and what's not against each platform's usual", () => {
    const p = project([
      ...Array.from({ length: 4 }, (_, i) => post({ contentType: "Skit", purpose: "trend", views: 4000, postedAt: `2026-11-0${i + 1}T19:00:00+01:00` })),
      ...Array.from({ length: 4 }, (_, i) => post({ contentType: "Educational", views: 500, postedAt: `2026-10-1${i}T09:00:00+01:00` })),
      // Instagram is smaller, but its posts are judged against Instagram's own usual.
      post({ platform: "instagram", format: "carousel", contentType: "Behind the scenes", views: 100 }),
      post({ platform: "instagram", format: "carousel", contentType: "Behind the scenes", views: 100 }),
    ]);
    const f = whatWorks(p, "2026-11", SAMPLE_TODAY);
    const working = f.filter((x) => x.kind === "working").map((x) => x.title);
    const not = f.filter((x) => x.kind === "not").map((x) => x.title);
    expect(working).toContain("Skit posts");
    expect(not).toContain("Educational posts");
    expect(working.concat(not)).not.toContain("Behind the scenes posts"); // exactly Instagram's usual
    expect(f.find((x) => x.title === "Skit posts")!.detail).toMatch(/averaged 1\.\d× the page's usual views/);
  });
});
