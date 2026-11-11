import "server-only";
/**
 * Google Gemini, through the Gemini API (Google AI Studio key). Used by the
 * sheet agent when GEMINI_API_KEY is set: there is a free tier, so no card is
 * needed. Google may use free-tier requests to improve its products, so only
 * public or low-sensitivity data goes here (sheet rows, creator handles,
 * public comments), never briefs or contracts.
 *
 * GEMINI_MODEL picks the model (default below); change it in Vercel if Google
 * renames or retires the model, no code change needed.
 */
import type { z } from "zod";
import type { Fetcher } from "./fetched";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/** Gemini's response schema: an OpenAPI-style subset (types in capitals, `nullable` for optional values). */
export type GeminiSchema =
  | { type: "STRING" | "INTEGER" | "NUMBER" | "BOOLEAN"; nullable?: boolean; enum?: string[]; description?: string }
  | { type: "OBJECT"; properties: Record<string, GeminiSchema>; required: string[]; nullable?: boolean; description?: string }
  | { type: "ARRAY"; items: GeminiSchema; description?: string };

/** Last problem talking to Gemini, for the Sheet tab and the logs. */
export let lastGeminiProblem: string | null = null;

/**
 * Ask Gemini for JSON matching `schema`, then check it against `validate`.
 * Returns null when Gemini can't help (no key, free-tier limit, blocked, or an
 * answer that doesn't fit), and the agent carries on with plain rules.
 */
export async function askGemini<T extends z.ZodType>(
  system: string,
  prompt: string,
  schema: GeminiSchema,
  validate: T,
  fetcher: Fetcher = fetch,
): Promise<z.infer<T> | null> {
  const key = geminiKey();
  if (!key) return null;
  try {
    const res = await fetcher(`${API}/${encodeURIComponent(geminiModel())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
      error?: { message?: string; status?: string };
    };
    if (!res.ok) {
      lastGeminiProblem =
        res.status === 429
          ? "Gemini's free daily or per-minute limit was reached; rows wait for the next run."
          : res.status === 404
            ? `Gemini doesn't recognise the model "${geminiModel()}". Set GEMINI_MODEL in Vercel to a current model name.`
            : res.status === 400 || res.status === 403
              ? `Gemini refused the key or request: ${body.error?.message ?? res.status}.`
              : `Gemini had a problem: ${body.error?.message ?? res.status}.`;
      console.warn("Gemini error", res.status, body.error?.status, body.error?.message);
      return null;
    }
    if (body.promptFeedback?.blockReason) {
      lastGeminiProblem = `Gemini blocked the request (${body.promptFeedback.blockReason}).`;
      return null;
    }
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    const parsed = validate.safeParse(JSON.parse(text));
    if (!parsed.success) {
      lastGeminiProblem = "Gemini's answer didn't fit the expected shape.";
      return null;
    }
    lastGeminiProblem = null;
    return parsed.data;
  } catch (e) {
    lastGeminiProblem = `Couldn't reach Gemini: ${e instanceof Error ? e.message : String(e)}`;
    console.warn("Gemini call failed", lastGeminiProblem);
    return null;
  }
}
