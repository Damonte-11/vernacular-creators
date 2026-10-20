import { BAND_ANCHORS } from "@config/benchmarks";
import { SIZE_BANDS, type SizeBandId } from "@config/size-bands";

const ORDER = SIZE_BANDS.map((b) => b.id);

/**
 * A benchmark for this exact follower count: each band's numbers apply at its
 * anchor, and in between they blend smoothly (on a log scale), so crossing
 * from one band into the next never causes a sudden jump.
 */
export function smoothByFollowers<T extends Record<string, number>>(table: Record<SizeBandId, T>, followers: number): T {
  const x = Math.log10(Math.max(followers, 1));
  const first = ORDER[0];
  const last = ORDER[ORDER.length - 1];
  if (x <= Math.log10(BAND_ANCHORS[first])) return table[first];
  if (x >= Math.log10(BAND_ANCHORS[last])) return table[last];

  for (let i = 1; i < ORDER.length; i++) {
    const lo = ORDER[i - 1];
    const hi = ORDER[i];
    const x1 = Math.log10(BAND_ANCHORS[hi]);
    if (x <= x1) {
      const x0 = Math.log10(BAND_ANCHORS[lo]);
      const t = (x - x0) / (x1 - x0);
      const out: Record<string, number> = {};
      for (const k of Object.keys(table[lo])) out[k] = table[lo][k] + (table[hi][k] - table[lo][k]) * t;
      return out as T;
    }
  }
  return table[last];
}

/** Same as smoothByFollowers, for tables of single numbers. */
export function smoothNumber(table: Record<SizeBandId, number>, followers: number): number {
  const wrapped = Object.fromEntries(Object.entries(table).map(([k, v]) => [k, { v }])) as Record<SizeBandId, { v: number }>;
  return smoothByFollowers(wrapped, followers).v;
}
