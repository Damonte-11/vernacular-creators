import "server-only";
/**
 * One way in to AI for the app's agents: Gemini (free tier) when
 * GEMINI_API_KEY is set, otherwise Claude when ANTHROPIC_API_KEY is set.
 * Returns null when no AI is set up or it can't help; callers fall back to rules.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { askGemini, geminiKey, geminiModel, type GeminiSchema } from "./gemini";

export function aiReady(): boolean {
  return !!geminiKey() || !!process.env.ANTHROPIC_API_KEY;
}

export function aiLabel(): string | null {
  if (geminiKey()) return `Google Gemini (${geminiModel()})`;
  if (process.env.ANTHROPIC_API_KEY) return "Claude";
  return null;
}

let client: Anthropic | null = null;

export async function askAI<T extends z.ZodType>(
  system: string,
  prompt: string,
  schema: T,
  geminiSchema: GeminiSchema,
  effort: "low" | "medium" = "low",
): Promise<z.infer<T> | null> {
  if (geminiKey()) return askGemini(system, prompt, geminiSchema, schema);
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      output_config: { effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return null;
    return (response.parsed_output as z.infer<T> | null) ?? null;
  } catch (e) {
    console.warn("AI call failed", e instanceof Error ? e.message : e);
    return null;
  }
}
