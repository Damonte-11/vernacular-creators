import { describe, expect, it, vi } from "vitest";
import type { SheetState } from "@/lib/sheet-sync";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/sheet-ai", async () => {
  const { guessLayout } = await import("@/lib/sheet-sync");
  return { proposeLayout: async (tab: string, rows: string[][]) => ({ layout: guessLayout(tab, rows), byAI: false }), matchRowsWithAI: async () => new Map() };
});

/** An in-memory stand-in for the two tables the hook touches. */
function fakeDb() {
  const project = {
    id: "p1",
    name: "Launch",
    sheet_url: null,
    sheet_rows: null as string[][] | null,
    start_date: "2026-11-01",
    end_date: "2026-11-21",
    sheet_state: { hookToken: "tok_abcdefghijklmnopqrstuvwxyz" } as SheetState,
    project_creators: [{ creator_id: "tolu", creators: { id: "tolu", name: "Tolu Bankole", handle: "tolukitchen", platform: "instagram" } }],
    project_posts: [] as { id: string; url_key: string; url: string; creator_id: string | null; checks: unknown[]; problem: null; posted_date: string }[],
  };
  const db = {
    from(table: string) {
      let patch: Record<string, unknown> | null = null;
      let filterValue: string | null = null;
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => {
          filterValue = v;
          if (patch && table === "projects") Object.assign(project, patch);
          return q;
        },
        update: (p: Record<string, unknown>) => {
          patch = p;
          return q;
        },
        upsert: (rows: { url_key: string; url: string; creator_id: string | null; posted_date: string }[]) => {
          for (const r of rows)
            project.project_posts.push({
              id: r.url_key,
              url_key: r.url_key,
              url: r.url,
              creator_id: r.creator_id,
              checks: [],
              problem: null,
              posted_date: r.posted_date,
            });
          return Promise.resolve({ error: null });
        },
        maybeSingle: () => Promise.resolve({ data: filterValue === project.sheet_state.hookToken ? project : null, error: null }),
        single: () => Promise.resolve({ data: project, error: null }),
        then: (resolve: (r: { data: unknown; error: null }) => void) =>
          resolve({ data: table === "project_posts" ? project.project_posts : null, error: null }),
      };
      return q;
    },
  };
  return { db: db as never, project };
}

const sheet = [
  ["Name", "Handle", "Post link"],
  ["Tolu", "@tolukitchen", "https://www.instagram.com/reel/CABC1/"],
];

describe("the sheet script's calls", () => {
  it("connects, waits for the layout, then adds links and sends numbers back", async () => {
    const { handleHook, confirmLayout } = await import("@/lib/server/sheet-agent");
    const { db, project } = fakeDb();
    const token = "tok_abcdefghijklmnopqrstuvwxyz";

    expect(await handleHook(db, { token: "wrong_code_wrong_code_wrong", tabs: ["Sheet1"] })).toBeNull();
    expect(await handleHook(db, { token, tabs: ["Sheet1"] })).toEqual({ tab: "Sheet1" });

    const first = await handleHook(db, { token, tabs: ["Sheet1"], tab: "Sheet1", rows: sheet });
    expect(first?.message).toMatch(/Connected/);
    expect(project.sheet_state.proposed?.columns.link).toBe(2);
    expect(project.project_posts).toHaveLength(0); // nothing added before the team confirms

    const confirmed = await confirmLayout(db, "p1", project.sheet_state.proposed!);
    expect(confirmed?.added).toBe(1); // the rows already sent are used straight away
    expect(project.project_posts[0].creator_id).toBe("tolu");

    const next = await handleHook(db, { token, tabs: ["Sheet1"], tab: "Sheet1", rows: sheet });
    const headers = next?.cells?.filter((c) => /1$/.test(c.a1)).map((c) => c.value);
    expect(headers).toEqual(["VC Views", "VC Engagements", "VC ER by views", "VC Last checked", "VC Status"]);
    expect(next?.cells?.find((c) => c.a1 === "H2")?.value).toBe("Waiting for numbers");
  });
});
