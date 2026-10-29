import { describe, expect, it } from "vitest";
import { detectColumns, parseCsv, readRows } from "@/lib/import";
import { bioEmail, parseRate, parseStatus, toCsv } from "@/lib/lists";

describe("list fields", () => {
  it("reads statuses written many ways", () => {
    expect(parseStatus("Blocked")).toBe("declined");
    expect(parseStatus("Ended")).toBe("ended");
    expect(parseStatus("Pending")).toBe("contacted");
    expect(parseStatus("Confirmed")).toBe("active");
    expect(parseStatus("in negotiation")).toBe("negotiating");
    expect(parseStatus("")).toBe("shortlisted");
  });

  it("reads Naira rates", () => {
    expect(parseRate("₦150,000")).toBe(150_000);
    expect(parseRate("150k")).toBe(150_000);
    expect(parseRate("NGN 1.2m")).toBe(1_200_000);
    expect(parseRate("ask")).toBeNull();
  });

  it("finds an email in a bio", () => {
    expect(bioEmail("Brand collab: contact@dolfincontent.com")).toBe("contact@dolfincontent.com");
    expect(bioEmail("No email here")).toBeNull();
  });

  it("writes CSV that Excel opens safely", () => {
    expect(toCsv([["a,b", '=SUM(1)', null]])).toBe('﻿"a,b",\'=SUM(1),');
  });
});

describe("spreadsheet import", () => {
  const csv = `URL,Name,Status,Labels,Rate,Creator notes
https://instagram.com/sarahfit,Sarah Chen,Shortlisted,"Fitness, Wellness","₦300,000",Great engagement
https://www.tiktok.com/@thecookco,Maria,Active,Food,200k,Worked with us in Q1
,Alex,Contacted,Travel,150000,`;

  it("parses quoted cells and detects columns", () => {
    const [header, ...rows] = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(detectColumns(header, rows)).toEqual(["url", "name", "status", "labels", "rate", "notes"]);
  });

  it("reads platform and handle from links, and explains rows it can't use", () => {
    const [header, ...rows] = parseCsv(csv);
    const out = readRows(rows, detectColumns(header, rows), null);
    expect(out[0]).toMatchObject({ platform: "instagram", handle: "sarahfit", fields: { status: "shortlisted", rate: 300_000, labels: ["fitness", "wellness"] } });
    expect(out[1]).toMatchObject({ platform: "tiktok", handle: "thecookco", fields: { status: "active", rate: 200_000 } });
    expect(out[2].problem).toBe("No handle or profile link");
  });

  it("uses a platform column, or the chosen default, for @handles", () => {
    const [header, ...rows] = parseCsv("Creator,Platform\n@minimalist.maria,Instagram\n@coach_d,");
    const kinds = detectColumns(header, rows);
    expect(kinds).toEqual(["handle", "platform"]);
    const out = readRows(rows, kinds, "youtube");
    expect(out.map((r) => [r.platform, r.handle])).toEqual([
      ["instagram", "minimalist.maria"],
      ["youtube", "coach_d"],
    ]);
  });

  it("treats a handle in the link column as a handle", () => {
    const [header, ...rows] = parseCsv("URL,Status\n@someone_x,Active");
    expect(readRows(rows, ["url", "status"], "instagram")[0]).toMatchObject({ platform: "instagram", handle: "someone_x" });
    expect(readRows(rows, ["url", "status"], null)[0].problem).toMatch(/Platform unknown/);
    expect(header).toEqual(["URL", "Status"]);
  });

  it("flags email-only rows", () => {
    const [header, ...rows] = parseCsv("Name;Email;Platform\nSarah;sarah@sarahfit.com;YouTube");
    expect(readRows(rows, detectColumns(header, rows), null)[0].problem).toMatch(/Only an email/);
  });
});
