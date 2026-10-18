import { NICHE_KEYWORDS } from "@config/app";

/** Suggest niches from words in a bio. Suggestions only; the team decides. */
export function suggestNiches(bio: string): string[] {
  const text = bio.toLowerCase();
  const hits: { niche: string; count: number }[] = [];
  for (const [niche, words] of Object.entries(NICHE_KEYWORDS)) {
    const count = words.filter((w) => new RegExp(`\\b${w}\\b`).test(text)).length;
    if (count > 0) hits.push({ niche, count });
  }
  return hits.sort((a, b) => b.count - a.count).map((h) => h.niche);
}
