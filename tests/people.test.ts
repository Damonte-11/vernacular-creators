import { describe, expect, it } from "vitest";
import { handleKey, linkEdits, linkedAccounts, searchSaved, suggestLinks, unlinkEdits } from "@/lib/people";
import type { Creator } from "@/lib/types";
import { creator } from "./helpers";

const acc = (id: string, platform: Creator["platform"], handle: string, extra: Partial<Creator> = {}) =>
  creator({ id, platform, handle, name: "Kiekie", ...extra });

describe("linked accounts", () => {
  const ig = acc("ig", "instagram", "kie_kie__", { personId: "p1" });
  const yt = acc("yt", "youtube", "KieKieTV", { personId: "p1" });
  const tt = acc("tt", "tiktok", "kiekie", {});
  const other = acc("x", "instagram", "someone_else", { name: "Someone Else" });
  const all = [ig, yt, tt, other];

  it("lists the other accounts of the same person, never the account itself", () => {
    expect(linkedAccounts(ig, all).map((c) => c.id)).toEqual(["yt"]);
    expect(linkedAccounts(tt, all)).toEqual([]);
  });

  it("matches handles despite add-ons like TV or underscores", () => {
    expect(handleKey("KieKieTV")).toBe(handleKey("kie_kie__"));
  });

  it("suggests likely matches, but not ones already linked or unrelated", () => {
    expect(suggestLinks(tt, all).map((c) => c.id).sort()).toEqual(["ig", "yt"]);
    expect(suggestLinks(ig, all).map((c) => c.id)).toEqual(["tt"]);
    expect(suggestLinks(other, all)).toEqual([]);
  });

  it("links into the existing group and leaves the numbers alone", () => {
    expect(linkEdits(tt, ig, all, () => "new")).toEqual([["tt", { personId: "p1" }]]);
    const fresh = linkEdits(other, tt, all, () => "new");
    expect(fresh).toEqual([
      ["x", { personId: "new" }],
      ["tt", { personId: "new" }],
    ]);
  });

  it("unlinking the second-to-last account unlinks both", () => {
    expect(unlinkEdits(yt, all)).toEqual([
      ["yt", { personId: null }],
      ["ig", { personId: null }],
    ]);
  });

  it("searches the database by name or handle, best match first", () => {
    expect(searchSaved(all, "kie").map((c) => c.id).sort()).toEqual(["ig", "tt", "yt"]);
    expect(searchSaved(all, "kiekie")[0].id).toBe("tt"); // exact handle first
    expect(searchSaved(all, "someone").map((c) => c.id)).toEqual(["x"]);
    expect(searchSaved(all, "k")).toEqual([]);
  });
});
