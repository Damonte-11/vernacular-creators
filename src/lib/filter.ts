import type { SizeBandId } from "@config/size-bands";
import type { CreatorAnalysis, Platform } from "./types";

export interface CreatorFilters {
  q: string;
  platform: Platform | "";
  niche: string;
  city: string;
  country: string;
  band: SizeBandId | "";
  followersMin: string;
  followersMax: string;
  /** Percent, e.g. "2" = 2%. */
  erMin: string;
  erMax: string;
  /** Engagement by views, percent. */
  verMin: string;
  verMax: string;
  scoreMin: string;
  scoreMax: string;
  verified: "" | "yes" | "no";
}

export const EMPTY_FILTERS: CreatorFilters = {
  q: "",
  platform: "",
  niche: "",
  city: "",
  country: "",
  band: "",
  followersMin: "",
  followersMax: "",
  erMin: "",
  erMax: "",
  verMin: "",
  verMax: "",
  scoreMin: "",
  scoreMax: "",
  verified: "",
};

export type SortKey = "score" | "followers" | "engagement" | "name";

function num(s: string): number | null {
  if (s.trim() === "") return null;
  // Accept "10k", "1.5m", "10,000".
  const m = s.trim().toLowerCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!m) return null;
  return parseFloat(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
}

export function applyFilters(list: CreatorAnalysis[], f: CreatorFilters): CreatorAnalysis[] {
  const q = f.q.trim().toLowerCase().replace(/^@/, "");
  const fMin = num(f.followersMin);
  const fMax = num(f.followersMax);
  const erMin = num(f.erMin);
  const erMax = num(f.erMax);
  const verMin = num(f.verMin);
  const verMax = num(f.verMax);
  const sMin = num(f.scoreMin);
  const sMax = num(f.scoreMax);

  return list.filter(({ creator: c, metrics: m, score }) => {
    if (q && !c.name.toLowerCase().includes(q) && !c.handle.toLowerCase().includes(q)) return false;
    if (f.platform && c.platform !== f.platform) return false;
    if (f.niche && c.niche !== f.niche) return false;
    if (f.city && c.city !== f.city) return false;
    if (f.country && c.country !== f.country) return false;
    if (f.band && m.band !== f.band) return false;
    if (fMin !== null && c.followers < fMin) return false;
    if (fMax !== null && c.followers > fMax) return false;
    if (erMin !== null && (m.engagementRate === null || m.engagementRate * 100 < erMin)) return false;
    if (erMax !== null && (m.engagementRate === null || m.engagementRate * 100 > erMax)) return false;
    if (verMin !== null && (m.viewEngagementRate === null || m.viewEngagementRate * 100 < verMin)) return false;
    if (verMax !== null && (m.viewEngagementRate === null || m.viewEngagementRate * 100 > verMax)) return false;
    if (sMin !== null && (score.total === null || score.total < sMin)) return false;
    if (sMax !== null && (score.total === null || score.total > sMax)) return false;
    if (f.verified === "yes" && !c.verified) return false;
    if (f.verified === "no" && c.verified) return false;
    return true;
  });
}

export function sortAnalyses(list: CreatorAnalysis[], key: SortKey): CreatorAnalysis[] {
  const sorted = [...list];
  const nullLast = (v: number | null) => (v === null ? -Infinity : v);
  sorted.sort((a, b) => {
    switch (key) {
      case "score":
        return nullLast(b.score.total) - nullLast(a.score.total);
      case "followers":
        return b.creator.followers - a.creator.followers;
      case "engagement":
        return nullLast(b.metrics.engagementRate) - nullLast(a.metrics.engagementRate);
      case "name":
        return a.creator.name.localeCompare(b.creator.name);
    }
  });
  return sorted;
}

export function countActive(f: CreatorFilters): number {
  return Object.entries(f).filter(([k, v]) => k !== "q" && v !== "").length;
}
