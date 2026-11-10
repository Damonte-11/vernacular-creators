import { describe, expect, it } from "vitest";
import { DISCOVERY_DEFAULTS } from "@config/discovery";
import { decide, mediaSignal, mentionedHandles, nigeriaSignal, searchQueries } from "@/lib/discovery-rules";

const NOW = Date.UTC(2026, 10, 10);
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const cfg = DISCOVERY_DEFAULTS;
const base = { name: "Tolu", bio: "Comedy skits from Lagos", followers: 40_000, country: null, lastPostAt: daysAgo(5) };

describe("discovery rules", () => {
  it("adds active Nigerian creators above the minimum", () => {
    expect(decide(base, cfg, false, NOW)).toMatchObject({ decision: "add" });
    expect(decide({ ...base, bio: "Food and travel", country: "NG" }, cfg, false, NOW)).toMatchObject({ decision: "add" });
  });

  it("allows up to 60 days since the last post", () => {
    expect(decide({ ...base, lastPostAt: daysAgo(55) }, cfg, false, NOW).decision).toBe("add");
    expect(decide({ ...base, lastPostAt: daysAgo(61) }, cfg, false, NOW)).toEqual({ decision: "skip", reason: "No posts in the last 60 days" });
  });

  it("skips small accounts, businesses and creators based elsewhere", () => {
    expect(decide({ ...base, followers: 4_000 }, cfg, false, NOW).decision).toBe("skip");
    expect(decide({ ...base, bio: "Lagos boutique. DM to order, we deliver nationwide" }, cfg, false, NOW).reason).toMatch(/business/);
    expect(decide({ ...base, bio: "Comedy", country: "GH" }, cfg, false, NOW).reason).toMatch(/outside Nigeria/);
  });

  it("puts tagged accounts without their own Nigeria link in Worth a look, not the database", () => {
    const noLink = { ...base, bio: "Dancer and choreographer" };
    expect(decide(noLink, cfg, true, NOW).decision).toBe("review");
    expect(decide(noLink, cfg, false, NOW).decision).toBe("skip");
    expect(decide(noLink, { ...cfg, reviewQueue: false }, true, NOW).decision).toBe("skip");
  });

  it("only adds creators that pass the quality bar", () => {
    const good = { score: 78, engagementLabel: "good" as const, highFlags: [] };
    expect(decide(base, cfg, false, NOW, good)).toMatchObject({ decision: "add", reason: expect.stringContaining("score 78") });
    expect(decide(base, cfg, false, NOW, { ...good, score: 52 }).reason).toBe("Creator Score 52 (under 65)");
    expect(decide(base, cfg, false, NOW, { ...good, engagementLabel: "poor" }).reason).toBe("Poor engagement for their size");
    expect(decide(base, cfg, false, NOW, { ...good, highFlags: ["Likely bought likes"] }).reason).toMatch(/Warning signs/);
  });

  it("skips blogs, news and fan pages, but not ordinary creator bios", () => {
    expect(decide({ ...base, name: "Lagos Gist Hub", bio: "Latest news and gist 🇳🇬" }, cfg, false, NOW).reason).toMatch(/blog, news or fan page/);
    expect(mediaSignal({ name: "Kie Kie TV", bio: "New skits daily. Social media influencer" })).toBeNull();
  });

  it("matches Nigeria words as whole words", () => {
    expect(nigeriaSignal({ name: "", bio: "Based in Abuja 🇳🇬", country: null })).toBeTruthy();
    expect(nigeriaSignal({ name: "", bio: "Benjamin from Jostens", country: null })).toBeNull();
  });

  it("reads @mentions but not emails or the creator's own handle", () => {
    expect(mentionedHandles("Shoot with @kiekie and @Mr.Macaroni. Email me@mail.com @me", "me")).toEqual(["kiekie", "mr.macaroni"]);
  });

  it("rotates YouTube searches through every niche and city", () => {
    const a = searchQueries({ keywords: ["comedy", "food"], cities: ["Lagos", "Abuja"] }, 2, 0);
    const b = searchQueries({ keywords: ["comedy", "food"], cities: ["Lagos", "Abuja"] }, 2, 1);
    expect([...a, ...b].sort()).toEqual(["comedy Abuja", "comedy Lagos", "food Abuja", "food Lagos"]);
  });
});
