import { beforeEach, describe, expect, it, vi } from "vitest";
import { creator } from "./helpers";

vi.mock("server-only", () => ({}));
const saved = new Map<string, ReturnType<typeof creator>>();
const fetchFromPlatform = vi.fn();
vi.mock("@/lib/server/repository", () => ({
  findCreator: async (_db: unknown, platform: string, h: string) => saved.get(`${platform}:${h.toLowerCase()}`) ?? null,
  saveFetchedCreator: async (_db: unknown, f: { handle: string; platform: "instagram" }) =>
    creator({ id: `new-${f.handle}`, handle: f.handle, platform: f.platform }),
}));
vi.mock("@/lib/server/lookup-service", () => ({
  fetchFromPlatform: (...a: unknown[]) => fetchFromPlatform(...a),
  assertTikTokAllowance: async () => undefined,
}));

const settings = {} as never;
const budget = () => ({ instagram: 10, tiktok: 1, youtube: 20, deadline: Date.now() + 60_000 });

describe("finding who posted a link", () => {
  beforeEach(() => {
    saved.clear();
    fetchFromPlatform.mockReset();
  });

  it("uses the database first, from the handle in the link", async () => {
    const { identifyCreator } = await import("@/lib/server/identify");
    saved.set("tiktok:kemi.cooks", creator({ id: "kemi", handle: "kemi.cooks", platform: "tiktok" }));
    const r = await identifyCreator({} as never, { url: "https://www.tiktok.com/@kemi.cooks/video/1", platform: "tiktok", handle: "" }, settings, budget());
    expect(r.creator?.id).toBe("kemi");
    expect(fetchFromPlatform).not.toHaveBeenCalled();
  });

  it("looks a new Instagram creator up from the sheet's handle, but only keeps them if the post is theirs", async () => {
    const { identifyCreator } = await import("@/lib/server/identify");
    fetchFromPlatform.mockResolvedValue({ handle: "tunde", platform: "instagram", posts: [{ url: "https://www.instagram.com/reel/CXYZ9/" }] });
    const ok = await identifyCreator(
      {} as never,
      { url: "https://www.instagram.com/reel/CXYZ9/", platform: "instagram", handle: "@Tunde" },
      settings,
      budget(),
    );
    expect(ok.creator?.id).toBe("new-tunde");
    expect(ok.added).toBe(true);
    const typo = await identifyCreator(
      {} as never,
      { url: "https://www.instagram.com/reel/COTHER/", platform: "instagram", handle: "@Tunde" },
      settings,
      budget(),
    );
    expect(typo.creator).toBeNull();
    expect(typo.note).toMatch(/isn't among their latest posts/);
  });

  it("stays within the run's allowance and explains a link with only a name", async () => {
    const { identifyCreator } = await import("@/lib/server/identify");
    const b = { ...budget(), instagram: 0 };
    const waiting = await identifyCreator({} as never, { url: "https://www.instagram.com/someone/reel/C1/", platform: "instagram", handle: "" }, settings, b);
    expect(waiting.note).toMatch(/next sync/);
    const noHandle = await identifyCreator({} as never, { url: "https://www.instagram.com/reel/C1/", platform: "instagram", handle: "" }, settings, budget());
    expect(noHandle.note).toMatch(/only a name/);
    expect(fetchFromPlatform).not.toHaveBeenCalled();
  });
});

describe("reading handles the way people write them", () => {
  it("handles @, spaces, profile links and several platforms in one cell", async () => {
    const { cleanHandle } = await import("@/lib/server/identify");
    expect(cleanHandle(" @Kemi.Cooks ")).toBe("Kemi.Cooks");
    expect(cleanHandle("kemi_cooks")).toBe("kemi_cooks");
    expect(cleanHandle("https://www.instagram.com/tolukitchen/?hl=en")).toBe("tolukitchen");
    expect(cleanHandle("https://www.tiktok.com/@kemi.cooks")).toBe("kemi.cooks");
    expect(cleanHandle("IG: @tolu_k / TT: @tolu.tt", "tiktok")).toBe("tolu.tt");
    expect(cleanHandle("IG: @tolu_k / TT: @tolu.tt", "instagram")).toBe("tolu_k");
    expect(cleanHandle("Big Tolu (@tolu_k)", "instagram")).toBe("tolu_k");
    expect(cleanHandle("Tolu Bankole")).toBeNull();
    expect(cleanHandle("https://www.instagram.com/reel/C1/")).toBeNull();
  });
});
