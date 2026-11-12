import { describe, expect, it } from "vitest";
import { addToStats, emptyStats, numbersReport, pickQuotes, ruleLabel, templateSections } from "@/lib/campaign-report";
import { emptyBrief } from "@/lib/projects";
import type { CreatorAnalysis, PostCheck, Project } from "@/lib/types";

const brief = {
  ...emptyBrief(),
  brand: "Sample Malt",
  product: "new can",
  hashtags: ["#SundayAnyDay"],
  mustSay: ["available in stores"],
  competitors: ["Other Malt"],
};

describe("reading comments by rules", () => {
  it("tells brand talk, creator talk and spam apart, and spots signals and pidgin", () => {
    expect(ruleLabel("Where can I get Sample Malt in Lekki?", brief)).toMatchObject({
      about: "brand",
      signals: expect.arrayContaining(["message_pickup", "question", "buying"]),
    });
    expect(ruleLabel("Your skits always burst my brain 🔥🔥", brief)).toMatchObject({ about: "creator", sentiment: "positive" });
    expect(ruleLabel("Follow me back, check my page for promo", brief).about).toBe("spam");
    expect(ruleLabel("Sample Malt better pass Other Malt", brief).signals).toContain("comparison");
    expect(ruleLabel("Too expensive for me abeg", brief)).toMatchObject({
      sentiment: "negative",
      language: "pidgin",
      signals: expect.arrayContaining(["objection"]),
    });
    expect(ruleLabel("@tunde look at this", brief).signals).toContain("tag_friend");
  });

  it("adds comments up, keeping brand sentiment apart and leaving spam out", () => {
    const comments = [
      { postId: "a", text: "Love the new can!", likes: 9, replies: 1 },
      { postId: "a", text: "Sample Malt is too expensive", likes: 3, replies: 0 },
      { postId: "a", text: "follow back for promo", likes: 0, replies: 0 },
    ];
    const labels = comments.map((c) => ruleLabel(c.text, brief));
    const s = emptyStats();
    comments.forEach((c, i) => addToStats(s, c, labels[i]));
    expect(s.read).toBe(3);
    expect(s.about.spam).toBe(1);
    expect(s.brand).toEqual({ positive: 1, neutral: 0, negative: 1 });
    expect(s.withReplies).toBe(1);
    expect(pickQuotes(comments, labels).positive[0].text).toBe("Love the new can!");
  });
});

describe("the numbers", () => {
  const check = (views: number, likes: number): PostCheck => ({ day: 7, checkedAt: "", views, likes, comments: 0, shares: null, source: "auto" });
  const p: Project = {
    id: "p",
    name: "Launch",
    client: "C",
    chorusType: "seedlings",
    vertical: "",
    startDate: "2026-11-01",
    endDate: "2026-11-10",
    guarantee: 100_000,
    objective: "awareness",
    brief,
    sheetUrl: null,
    commentCap: 200,
    createdAt: "",
    creators: [
      { creatorId: "a", dueDate: "2026-11-02", postsAgreed: 1 },
      { creatorId: "b", dueDate: "2026-11-02", postsAgreed: 1 },
    ],
    posts: [
      {
        id: "1",
        creatorId: "a",
        url: "u1",
        platform: "instagram",
        postedDate: "2026-11-02",
        addedAt: "",
        source: "app",
        checks: [check(80_000, 8_000)],
        problem: null,
        caption: "New can, available in stores now #SundayAnyDay",
      },
      {
        id: "2",
        creatorId: "b",
        url: "u2",
        platform: "instagram",
        postedDate: "2026-11-06",
        addedAt: "",
        source: "app",
        checks: [check(10_000, 200)],
        problem: null,
        caption: "Chilling",
      },
    ],
    documents: [],
  };
  const analyses = new Map([
    ["a", { creator: { name: "Ada", handle: "ada", platform: "instagram" }, metrics: { avgViews: 40_000 } } as unknown as CreatorAnalysis],
    ["b", { creator: { name: "Bola", handle: "bola", platform: "instagram" }, metrics: { avgViews: 20_000 } } as unknown as CreatorAnalysis],
  ]);

  it("compares each creator with their usual, checks the brief and ranks for rebooking", () => {
    const n = numbersReport(p, analyses, "2026-11-15");
    expect(n.totals.verdict).toBe("behind"); // 90K of the 100K promised, and the window is over
    const ada = n.creators.find((c) => c.creatorId === "a")!;
    const bola = n.creators.find((c) => c.creatorId === "b")!;
    expect(ada.vsUsual).toBe(2);
    expect(bola.vsUsual).toBe(0.5);
    expect(bola.onTime).toBe(false);
    expect(n.creators[0].creatorId).toBe("a");
    expect(n.briefChecks).toEqual([
      { item: "available in stores", kind: "must-say", found: 1, checked: 2 },
      { item: "#SundayAnyDay", kind: "hashtag", found: 1, checked: 2 },
    ]);
    const text = templateSections(p, n, emptyStats());
    expect(text.summary).toMatch(/did not meet its views guarantee: 90K views against 100K/);
  });
});
