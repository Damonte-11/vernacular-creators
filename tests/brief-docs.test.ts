import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const extracted = {
  brand: "Zest",
  product: "Zest Juice",
  keyMessage: "No added sugar",
  mustSay: ["no added sugar", "Available in Shoprite"],
  hashtags: ["#ZestUp"],
  dos: [],
  donts: ["No swearing"],
  competitors: ["Chivita"],
  notes: "One reel each.",
};

function fakeDb(brief: Record<string, unknown>, docs: Record<string, unknown>[]) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from(table: string) {
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        eq: () => {
          if (patch) updates.push(patch);
          return q;
        },
        update: (p: Record<string, unknown>) => {
          patch = p;
          return q;
        },
        single: async () => ({ data: { brief }, error: null }),
        then: (resolve: (r: { data: unknown; error: null }) => void) =>
          resolve({ data: patch ? null : table === "project_documents" ? docs : null, error: null }),
      };
      return q;
    },
    storage: { from: () => ({ download: async () => ({ data: new Blob(["Brief text"], { type: "text/plain" }), error: null }) }) },
  };
  return { db: db as never, updates };
}

describe("brief documents", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "g";
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("knows Google links", async () => {
    const { googleDocRef } = await import("@/lib/server/brief-docs");
    expect(googleDocRef("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit")).toEqual({
      type: "document",
      id: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
    });
    expect(googleDocRef("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view")).toEqual({ type: "file", id: "1AbCdEfGhIjKlMnOpQrStUvWxYz" });
    expect(googleDocRef("https://example.com/brief")).toBeNull();
  });

  it("only fills blanks and adds new items; what the team typed stays", async () => {
    const { mergeBrief } = await import("@/lib/server/brief-docs");
    const { emptyBrief } = await import("@/lib/projects");
    const { brief, added } = mergeBrief({ ...emptyBrief(), brand: "Zest Nigeria", mustSay: ["No added sugar"] }, extracted);
    expect(brief.brand).toBe("Zest Nigeria");
    expect(brief.product).toBe("Zest Juice");
    expect(brief.mustSay).toEqual(["No added sugar", "Available in Shoprite"]);
    expect(added).toBe(7);
  });

  it("reads a public Google Doc and an uploaded file, skips contracts, and says what it couldn't open", async () => {
    const { readBriefDocs } = await import("@/lib/server/brief-docs");
    const { db, updates } = fakeDb({}, [
      { id: "1", kind: "brief", title: "Brief", url: "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit", file_path: null },
      { id: "2", kind: "guidelines", title: "Guidelines", url: "", file_path: "p/guide.txt" },
      { id: "3", kind: "contract", title: "Contract", url: "https://docs.google.com/document/d/1ZZZZZZZZZZZZZZZZZZZZZZZZZ/edit", file_path: null },
      { id: "4", kind: "deck", title: "Private deck", url: "https://docs.google.com/presentation/d/1YYYYYYYYYYYYYYYYYYYYYYYYY/edit", file_path: null },
    ]);
    const seen: string[] = [];
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("/document/d/1AbC")) return new Response("The brief: Zest Juice", { headers: { "content-type": "text/plain" } });
      if (url.includes("/presentation/")) return new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } });
      if (url.endsWith(":generateContent"))
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(extracted) }] } }] }));
      throw new Error(url);
    });
    const result = await readBriefDocs(db, "p1", fetcher as never);
    expect(result.read).toBe(2);
    expect(result.message).toMatch(/Read 2 documents, added 9 points/);
    expect(result.message).toMatch(/"Private deck" couldn't be opened/);
    expect(seen.some((u) => u.includes("1ZZZ"))).toBe(false);
    expect((updates[0].brief as { keyMessage: string }).keyMessage).toBe("No added sugar");
  });
});
