import { describe, expect, it } from "vitest";
import { AGENT_COLUMNS, guessLayout, matchRow, parseSheetDate, planWriteBack, readRows } from "@/lib/sheet-sync";
import { emptyBrief } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { creator } from "./helpers";

const kemi = creator({ id: "kemi", name: "Kemi Adeola", handle: "kemi.cooks", platform: "tiktok" });
const tolu = creator({ id: "tolu", name: "Tolu Bankole", handle: "tolukitchen", platform: "instagram" });
const all = [kemi, tolu];
const project: Project = {
  id: "p",
  name: "Launch",
  client: "",
  chorusType: "seedlings",
  vertical: "",
  startDate: "2026-11-01",
  endDate: "2026-11-21",
  guarantee: null,
  objective: "awareness",
  brief: emptyBrief(),
  sheetUrl: null,
  commentCap: 3000,
  createdAt: "",
  creators: [
    { creatorId: "kemi", dueDate: null, postsAgreed: 1 },
    { creatorId: "tolu", dueDate: null, postsAgreed: 1 },
  ],
  posts: [],
  documents: [],
};

// A messy sheet: a title row, then headers, odd spellings, two links in a cell, a Drive link.
const rows = [
  ["Malt launch – links tracker"],
  ["S/N", "Influencer", "IG / TT handle", "Platform", "Date live", "Post link"],
  ["1", "Tolu B", "@ToluKitchen", "Insta", "4/11/2026", "https://www.instagram.com/reel/CABC1/"],
  ["2", "Kemi", "kemicook", "TikTok", "Nov 5", "https://www.tiktok.com/@kemi.cooks/video/111 https://www.tiktok.com/@kemi.cooks/video/222"],
  ["3", "Someone", "", "", "", "https://drive.google.com/file/d/brief"],
  ["4", "Tunde", "@tunde", "IG", "6th Nov 2026", "https://www.instagram.com/reel/CXYZ9/"],
];

describe("sheet layout and rows", () => {
  it("finds the header row and which column is which, without AI", () => {
    const l = guessLayout("Sheet1", rows);
    expect(l.headerRow).toBe(1);
    expect(l.columns).toMatchObject({ link: 5, name: 1, handle: 2, platform: 3, date: 4 });
  });

  it("reads one entry per post link, skips non-post links, and reads dates written any way", () => {
    const r = readRows(rows, guessLayout("Sheet1", rows));
    expect(r.map((x) => x.url)).toEqual([
      "https://www.instagram.com/reel/CABC1/",
      "https://www.tiktok.com/@kemi.cooks/video/111",
      "https://www.tiktok.com/@kemi.cooks/video/222",
      "https://www.instagram.com/reel/CXYZ9/",
    ]);
    expect(r.map((x) => x.date)).toEqual(["2026-11-04", parseSheetDate("Nov 5"), parseSheetDate("Nov 5"), "2026-11-06"]);
  });

  it("matches sure rows and only guesses at the rest", () => {
    const r = readRows(rows, guessLayout("Sheet1", rows));
    expect(matchRow(r[0], project, all)).toMatchObject({ creatorId: "tolu", how: "handle column" });
    expect(matchRow(r[1], project, all).creatorId).toBe("kemi"); // handle in the link
    const tunde = matchRow(r[3], project, all);
    expect(tunde.creatorId).toBeNull();
  });

  it("remembers a spelling the team confirmed", () => {
    const row = { row: 9, url: "https://www.instagram.com/reel/C1/", urlKey: "x", platform: "instagram" as const, handle: "T. Bankole", name: "", date: null };
    expect(matchRow(row, project, all).creatorId).toBeNull();
    expect(matchRow(row, project, all, { tbankole: "tolu" }).creatorId).toBe("tolu");
  });
});

describe("writing numbers back", () => {
  const layout = guessLayout("Sheet1", rows);
  const sheetRows = readRows(rows, layout);
  const values = new Map([[sheetRows[0].urlKey, { views: "45000", engagements: "3100", er: "6.9%", checked: "2026-11-10", status: "Day 3" }]]);

  it("adds its own headed columns after the team's and fills only those", () => {
    const plan = planWriteBack(rows, layout, sheetRows, values);
    const headers = plan.cells.filter((c) => c.row === 1);
    expect(headers.map((c) => c.value)).toEqual([...AGENT_COLUMNS]);
    expect(Math.min(...headers.map((c) => c.col))).toBe(6); // after column F
    expect(plan.cells.filter((c) => c.row === 2).map((c) => c.value)).toEqual(["45000", "3100", "6.9%", "2026-11-10", "Day 3"]);
  });

  it("leaves a cell alone when someone has typed over what the agent wrote", () => {
    const withCols = rows.map((r, i) => (i === 1 ? [...r, ...AGENT_COLUMNS] : i === 2 ? [...r, "50000", "3100", "6.9%", "2026-11-09", "Day 1"] : r));
    const written = {
      [sheetRows[0].urlKey]: { "VC Views": "40000", "VC Engagements": "3100", "VC ER by views": "6.9%", "VC Last checked": "2026-11-09", "VC Status": "Day 1" },
    };
    const plan = planWriteBack(withCols, layout, sheetRows, values, written);
    expect(plan.handEdited).toEqual([{ row: 2, column: "VC Views" }]);
    expect(plan.cells.map((c) => c.value)).toEqual(["2026-11-10", "Day 3"]); // views kept, unchanged cells skipped
  });
});

describe("the sheet script", () => {
  it("is valid JavaScript with the project's address and code inside, and can't be broken by the project name", async () => {
    const { sheetScript } = await import("@/lib/sheet-script");
    const s = sheetScript("https://vernacular-creators.vercel.app/", "abcdefghijklmnopqrstuvwx123", 'Launch */ alert("x") /*\nnext');
    expect(() => new Function(s)).not.toThrow();
    expect(s).toContain('const VC_URL = "https://vernacular-creators.vercel.app/api/sheet-hook";');
    expect(s).toContain('const VC_CODE = "abcdefghijklmnopqrstuvwx123";');
    expect(s).not.toContain("*/ alert");
  });
});
