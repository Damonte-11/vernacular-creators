import { describe, expect, it } from "vitest";
import { bioMentions, discoveryPlan, handleGuesses } from "@/lib/discover";

describe("finding a creator's other accounts", () => {
  it("reads handles written in the bio", () => {
    const bio = "Multiple award winning 🏆 TikTok: @kiekie_official | YT - KieKieTV | bookings@mail.com";
    expect(bioMentions(bio, "instagram")).toEqual([
      { platform: "tiktok", handle: "kiekie_official", source: "bio" },
      { platform: "youtube", handle: "KieKieTV", source: "bio" },
    ]);
  });

  it("reads profile links and ignores the creator's own platform", () => {
    const bio = "Watch: https://www.youtube.com/@KieKieTV and https://tiktok.com/@kiekie. IG: kie_kie__";
    expect(bioMentions(bio, "instagram").map((m) => `${m.platform}:${m.handle}`)).toEqual(["tiktok:kiekie", "youtube:KieKieTV"]);
  });

  it("doesn't mistake ordinary words for handles", () => {
    expect(bioMentions("New videos on my YouTube channel every Friday", "instagram")).toEqual([]);
  });

  it("guesses the same handle, tidied", () => {
    expect(handleGuesses("kie_kie__")).toEqual(["kie_kie__", "kiekie"]);
  });

  it("uses bio mentions first and only guesses platforms the bio doesn't mention", () => {
    const plan = discoveryPlan("TikTok: @kiekie", "kie_kie__", "instagram");
    expect(plan[0]).toEqual({ platform: "tiktok", handle: "kiekie", source: "bio" });
    expect(plan.filter((m) => m.platform === "tiktok")).toHaveLength(1);
    expect(plan.filter((m) => m.platform === "youtube").map((m) => m.handle)).toEqual(["kie_kie__", "kiekie"]);
  });
});
