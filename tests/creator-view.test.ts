import { describe, expect, it } from "vitest";
import { analyzeCreator } from "@/lib/analyze";
import { creatorView, filterViews, NO_FILTERS, readQuery, similar, sortViews } from "@/lib/creator-view";
import { DEFAULT_SETTINGS } from "@/lib/data/demo-store";
import { sampleCreators, sampleNow } from "@/sample-data/creators";

const now = sampleNow();
const raw = sampleCreators(now);
const all = raw.map((c) => creatorView(analyzeCreator(c, DEFAULT_SETTINGS, now, [], raw), now));

describe("creator view", () => {
  it("reads a plain-language search into filters and keeps the rest as text", () => {
    const r = readQuery("Food creators in Lagos on Instagram with high engagement and email", ["Food", "Comedy"], ["Lagos", "Abuja"]);
    expect(r.filters).toMatchObject({ niches: ["Food"], cities: ["Lagos"], platforms: ["instagram"], minEr: 0.03, emailOnly: true });
    expect(r.filters.text).toBeUndefined();
    expect(readQuery("over 50k views jollof", [], []).filters).toMatchObject({ minViews: 50_000, text: "jollof" });
    expect(readQuery("micro tech", ["Tech"], []).filters).toMatchObject({ bands: ["micro"], niches: ["Tech"] });
  });

  it("filters by expected views and engagement ranges", () => {
    const out = filterViews(all, { ...NO_FILTERS, minViews: 10_000, maxViews: 100_000, minEr: 0.02 });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((x) => x.views !== null && x.views >= 10_000 && x.views < 100_000 && (x.er ?? 0) >= 0.02)).toBe(true);
  });

  it("sorts, and finds similar creators but not the same person's other accounts", () => {
    const byViews = sortViews(all, "views");
    expect((byViews[0].views ?? 0) >= (byViews[1].views ?? 0)).toBe(true);
    const withPerson = all.find((x) => x.a.creator.personId);
    if (withPerson) expect(similar(withPerson, all).some((y) => y.a.creator.personId === withPerson.a.creator.personId)).toBe(false);
  });

  it("lists tagged accounts from captions and marks paid ones", () => {
    const base = all[0];
    const posts = [
      { ...base.recent[0], id: "a", caption: "Loving @zestjuice #ad", postedAt: "2026-11-01T10:00:00Z" },
      { ...base.recent[0], id: "b", caption: "Again with @zestjuice and @friend", postedAt: "2026-11-02T10:00:00Z" },
    ];
    const v = creatorView({ ...base.a, creator: { ...base.a.creator, posts } }, now);
    expect(v.mentions[0]).toEqual({ handle: "@zestjuice", posts: 2, paid: true });
    expect(v.mentions.find((m) => m.handle === "@friend")?.paid).toBe(false);
  });
});
