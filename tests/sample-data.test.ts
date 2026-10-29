import { describe, expect, it } from "vitest";
import { analyzeCreator } from "@/lib/analyze";
import { sampleCreators, simulateLookup } from "@/sample-data/creators";
import { NOW, SETTINGS } from "./helpers";

describe("sample data", () => {
  const creators = sampleCreators(NOW);
  const byHandle = (h: string) => analyzeCreator(creators.find((c) => c.handle === h)!, SETTINGS, NOW);

  it("has 43 clearly made-up creators", () => {
    expect(creators).toHaveLength(43);
    expect(creators.every((c) => c.isSample && c.handle.endsWith("_demo"))).toBe(true);
    expect(new Set(creators.map((c) => c.id)).size).toBe(43);
  });

  it("links some people's accounts across platforms", () => {
    const halima = creators.filter((c) => c.personId === "sample-person-halima");
    expect(halima.map((c) => c.platform).sort()).toEqual(["instagram", "tiktok", "youtube"]);
  });

  it("is the same every time", () => {
    expect(sampleCreators(NOW)).toEqual(creators);
  });

  it("gives every creator a score", () => {
    expect(creators.every((c) => analyzeCreator(c, SETTINGS, NOW).score.total !== null)).toBe(true);
  });

  it("flags the deliberate problem accounts", () => {
    expect(byHandle("blessingbites_demo").flags.map((f) => f.type)).toContain("low_engagement");
    expect(byHandle("adaglam_demo").flags.map((f) => f.type)).toContain("high_engagement");
    expect(byHandle("musalaughs_demo").flags.map((f) => f.type)).toContain("follower_jump");
    expect(byHandle("emekafits_demo").flags.map((f) => f.type)).toContain("posting_gap");
    expect(byHandle("segunreviews_demo").flags.map((f) => f.type)).toContain("likes_comments_ratio");
  });

  it("simulated lookups show the right errors", () => {
    expect(simulateLookup("instagram", "my_personal_page", NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/personal account/) });
    expect(simulateLookup("youtube", "notfound_channel", NOW)).toMatchObject({ ok: false });
    expect(simulateLookup("instagram", "brand_new_creator", NOW)).toMatchObject({ ok: true });
  });
});
