/**
 * Creator size bands, by follower (or subscriber) count.
 * Creators are only ever compared with others in the same band.
 * `max` is exclusive; the last band has no upper limit.
 */
export const SIZE_BANDS = [
  { id: "nano", label: "Nano", min: 0, max: 10_000 },
  { id: "micro", label: "Micro", min: 10_000, max: 50_000 },
  { id: "mid", label: "Mid-tier", min: 50_000, max: 250_000 },
  { id: "macro", label: "Macro", min: 250_000, max: 1_000_000 },
  { id: "mega", label: "Mega", min: 1_000_000, max: Infinity },
] as const;

export type SizeBandId = (typeof SIZE_BANDS)[number]["id"];
