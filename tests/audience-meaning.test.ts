import { describe, expect, it } from "vitest";
import { meaning } from "@/lib/audience-meaning";
import type { AudienceSignals } from "@/lib/types";

const base: AudienceSignals = {
  readAt: "2026-11-01T00:00:00Z",
  posts: 5,
  comments: 300,
  byAI: 300,
  languages: [{ label: "Pidgin", share: 70 }],
  sentiment: { positive: 65, neutral: 30, negative: 5 },
  spamShare: 3,
  questionShare: 12,
  buyingShare: 8,
  themes: ["jollof", "prices", "Lagos traffic"],
  note: null,
};

describe("what an audience means for a brand", () => {
  it("reads a warm, buying audience", () => {
    const m = meaning(base).join(" ");
    expect(m).toMatch(/comment in Pidgin \(70%\)/);
    expect(m).toMatch(/warm: 65% positive/);
    expect(m).toMatch(/8% ask where to buy/);
    expect(m).toMatch(/12% ask questions/);
    expect(m).toMatch(/only 3% look like bots/);
    expect(m).toMatch(/jollof, prices, Lagos traffic/);
  });
  it("warns about a negative, botty audience with no buying interest", () => {
    const m = meaning({ ...base, sentiment: { positive: 30, neutral: 45, negative: 25 }, spamShare: 22, buyingShare: 1, questionShare: 2, themes: [] }).join(
      " ",
    );
    expect(m).toMatch(/25% of comments are negative/);
    expect(m).toMatch(/Better for awareness than for sales/);
    expect(m).toMatch(/22% look like bots/);
    expect(m).not.toMatch(/ask questions/);
  });
});
