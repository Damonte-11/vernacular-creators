import { describe, expect, it } from "vitest";
import { attentionItems, creatorState, emptyBrief, handleInUrl, normaliseUrl, parseViews, projectTotals, projectWindow, readPastedLinks } from "@/lib/projects";
import { sampleCreators } from "@/sample-data/creators";
import { sampleProjects } from "@/sample-data/projects";
import type { PostCheck, Project } from "@/lib/types";
import { creator } from "./helpers";

const kemi = creator({ id: "kemi", name: "Kemi Adeola", handle: "kemi.cooks", platform: "tiktok" });
const tolu = creator({ id: "tolu", name: "Tolu Bankole", handle: "tolukitchen", platform: "instagram" });
const yt = creator({ id: "yt", name: "Lagos Tech Desk", handle: "lagostechdesk", platform: "youtube" });

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p",
    name: "Launch",
    client: "",
    chorusType: "seedlings",
    vertical: "",
    startDate: "2026-11-01",
    endDate: "2026-11-21",
    guarantee: 1_000_000,
    objective: "awareness",
    brief: emptyBrief(),
    sheetUrl: null,
    commentCap: 3000,
    createdAt: "2026-10-25T00:00:00Z",
    creators: [
      { creatorId: "kemi", dueDate: "2026-11-03", postsAgreed: 1 },
      { creatorId: "tolu", dueDate: "2026-11-05", postsAgreed: 1 },
      { creatorId: "yt", dueDate: "2026-11-15", postsAgreed: 1 },
    ],
    posts: [],
    documents: [],
    ...over,
  };
}

const check = (day: number, views: number, likes: number, comments: number): PostCheck => ({
  day,
  checkedAt: "",
  views,
  likes,
  comments,
  shares: null,
  source: "auto",
});

describe("pasted links", () => {
  const p = project();
  const all = [kemi, tolu, yt];

  it("matches by the handle in the link, ignoring dots, underscores and case", () => {
    const [r] = readPastedLinks("https://www.tiktok.com/@Kemi_Cooks/video/7301", p, all);
    expect(r.creatorId).toBe("kemi");
    expect(r.platform).toBe("tiktok");
  });

  it("matches by a handle or name written on the same line", () => {
    const rows = readPastedLinks("Tolu Bankole - https://www.instagram.com/reel/C8xYz/\n@lagostechdesk https://youtube.com/shorts/abc", p, all);
    expect(rows.map((r) => r.creatorId)).toEqual(["tolu", "yt"]);
  });

  it("offers a guess for a near-miss spelling instead of matching it outright", () => {
    const [r] = readPastedLinks("https://www.tiktok.com/@kemicook/video/1", p, all);
    expect(r.creatorId).toBeNull();
    expect(r.suggestion).toBe("kemi");
  });

  it("only matches creators on the same platform as the link", () => {
    const [r] = readPastedLinks("kemi.cooks https://www.instagram.com/reel/C1/", p, all);
    expect(r.creatorId).toBeNull();
  });

  it("skips repeats and marks links already on the project", () => {
    const withPost = project({
      posts: [
        {
          id: "x",
          creatorId: "kemi",
          url: "https://tiktok.com/@kemi.cooks/video/9?is_from_webapp=1",
          platform: "tiktok",
          postedDate: "2026-11-03",
          addedAt: "",
          source: "app",
          checks: [],
          problem: null,
        },
      ],
    });
    const rows = readPastedLinks("https://www.tiktok.com/@kemi.cooks/video/9\nhttps://www.tiktok.com/@kemi.cooks/video/9/", withPost, all);
    expect(rows).toHaveLength(1);
    expect(rows[0].duplicate).toBe(true);
  });

  it("reads handles out of links and tidies links for comparison", () => {
    expect(handleInUrl("https://www.instagram.com/tolukitchen/reel/C8x/")).toBe("tolukitchen");
    expect(handleInUrl("https://www.instagram.com/reel/C8x/")).toBeNull();
    expect(normaliseUrl("https://m.TikTok.com/@a/video/1/?x=2#t")).toBe("tiktok.com/@a/video/1");
  });
});

describe("project numbers", () => {
  it("counts the window in whole days and caps at the end", () => {
    expect(projectWindow(project(), "2026-10-30")).toEqual({ days: 21, today: 0 });
    expect(projectWindow(project(), "2026-11-10")).toEqual({ days: 21, today: 10 });
    expect(projectWindow(project(), "2026-12-30")).toEqual({ days: 21, today: 21 });
  });

  it("uses each post's latest reading and compares views with a straight-line pace", () => {
    const p = project({
      posts: [
        {
          id: "a",
          creatorId: "kemi",
          url: "u1",
          platform: "tiktok",
          postedDate: "2026-11-03",
          addedAt: "",
          source: "app",
          checks: [check(1, 100_000, 5_000, 500), check(7, 200_000, 9_000, 1_000)],
          problem: null,
        },
        {
          id: "b",
          creatorId: "tolu",
          url: "u2",
          platform: "instagram",
          postedDate: "2026-11-05",
          addedAt: "",
          source: "app",
          checks: [check(3, 100_000, 2_000, 0)],
          problem: null,
        },
      ],
    });
    const t = projectTotals(p, "2026-11-11"); // day 11 of 21
    expect(t.views).toBe(300_000);
    expect(t.engagements).toBe(12_000);
    expect(t.erByViews).toBeCloseTo(0.04);
    // The line starts on the first due date (3 Nov, day 3): 9 of the 19 days from there.
    expect(t.pace).toBe(Math.round((1_000_000 * 9) / 19));
    expect(t.verdict).toBe("behind");
    expect(t.posts).toBe(2);
    expect(t.postsAgreed).toBe(3);
    expect(t.postsByDay[2]).toBe(1);
  });

  it("doesn't call a campaign behind before any post is due", () => {
    expect(projectTotals(project(), "2026-11-02").verdict).toBe("not-started");
  });

  it("calls the guarantee met once views pass it, and says nothing about pace without one", () => {
    const post = {
      id: "a",
      creatorId: "kemi",
      url: "u",
      platform: "tiktok" as const,
      postedDate: "2026-11-03",
      addedAt: "",
      source: "app" as const,
      checks: [check(7, 1_200_000, 1, 1)],
      problem: null,
    };
    expect(projectTotals(project({ posts: [post] }), "2026-11-10").verdict).toBe("met");
    expect(projectTotals(project({ posts: [post], guarantee: null }), "2026-11-10").verdict).toBe("no-guarantee");
  });

  it("knows who is late, who has posted and whose day-7 numbers are in", () => {
    const p = project({
      posts: [
        {
          id: "a",
          creatorId: "tolu",
          url: "u",
          platform: "instagram",
          postedDate: "2026-11-05",
          addedAt: "",
          source: "app",
          checks: [check(7, 1, 1, 1)],
          problem: null,
        },
      ],
    });
    expect(creatorState(p, p.creators[0], "2026-11-10")).toBe("late");
    expect(creatorState(p, p.creators[1], "2026-11-10")).toBe("final");
    expect(creatorState(p, p.creators[2], "2026-11-10")).toBe("waiting");
  });

  it("lists late creators first, then unmatched links and posts with no numbers", () => {
    const p = project({
      posts: [
        { id: "a", creatorId: null, url: "https://x.com/1", platform: null, postedDate: "2026-11-08", addedAt: "", source: "sheet", checks: [], problem: null },
        { id: "b", creatorId: "tolu", url: "u", platform: "instagram", postedDate: "2026-11-05", addedAt: "", source: "app", checks: [], problem: null },
      ],
    });
    const items = attentionItems(p, "2026-11-10", (id) => id);
    expect(items[0]).toMatchObject({ tone: "bad", creatorId: "kemi" });
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(["who-a", "nonum-b"]));
  });

  it("reads views written the way people write them", () => {
    expect(parseViews("750k")).toBe(750_000);
    expect(parseViews("1.2m")).toBe(1_200_000);
    expect(parseViews("45,300")).toBe(45_300);
    expect(parseViews("lots")).toBeNull();
  });
});

describe("sample projects", () => {
  it("build from the sample creators with every post matched to a booked creator", () => {
    const projects = sampleProjects(sampleCreators(), Date.UTC(2026, 10, 10, 12));
    expect(projects).toHaveLength(3);
    for (const p of projects) {
      const booked = new Set(p.creators.map((c) => c.creatorId));
      expect(p.posts.every((x) => x.creatorId && booked.has(x.creatorId))).toBe(true);
    }
    expect(projects[0].posts.length).toBeGreaterThan(5);
  });
});
