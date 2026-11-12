import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const schema = z.object({ answer: z.string() });
const gSchema = { type: "OBJECT" as const, properties: { answer: { type: "STRING" as const } }, required: ["answer"] };

describe("Gemini", () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("does nothing without a key", async () => {
    const { askGemini } = await import("@/lib/server/gemini");
    const fetcher = vi.fn();
    expect(await askGemini("sys", "hi", gSchema, schema, fetcher as never)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("asks for JSON in the given shape, with the key in a header (not the address), and checks the answer", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "some-model";
    const { askGemini } = await import("@/lib/server/gemini");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"answer":"yes"}' }] } }] })));
    expect(await askGemini("sys", "hi", gSchema, schema, fetcher as never)).toEqual({ answer: "yes" });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/some-model:generateContent");
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", responseSchema: gSchema });
  });

  it("gives up quietly on the free-tier limit or an answer that doesn't fit, and says why", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const g = await import("@/lib/server/gemini");
    expect(await g.askGemini("s", "p", gSchema, schema, (async () => new Response("{}", { status: 429 })) as never)).toBeNull();
    expect(g.lastGeminiProblem).toMatch(/free daily or per-minute limit/);
    const wrong = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"nope":1}' }] } }] }));
    expect(await g.askGemini("s", "p", gSchema, schema, wrong as never)).toBeNull();
    expect(g.lastGeminiProblem).toMatch(/didn't fit/);
  });

  it("waits out a busy Gemini and tries again", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.useFakeTimers();
    try {
      const { askGemini } = await import("@/lib/server/gemini");
      let n = 0;
      const fetcher = vi.fn(async () =>
        ++n === 1
          ? new Response(JSON.stringify({ error: { status: "UNAVAILABLE", message: "high demand" } }), { status: 503 })
          : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] })),
      );
      const pending = askGemini("s", "p", gSchema, schema, fetcher as never);
      await vi.advanceTimersByTimeAsync(6_000);
      expect(await pending).toEqual({ answer: "ok" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
