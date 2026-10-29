import type { Creator, ListItemFields, ListStatus, ShortlistItem } from "./types";

/** The six statuses, in the order a campaign usually moves through them. */
export const LIST_STATUSES: { id: ListStatus; label: string; tone: "neutral" | "info" | "warn" | "good" | "done" | "bad" }[] = [
  { id: "shortlisted", label: "Shortlisted", tone: "neutral" },
  { id: "contacted", label: "Contacted", tone: "info" },
  { id: "negotiating", label: "Negotiating", tone: "warn" },
  { id: "active", label: "Active", tone: "good" },
  { id: "ended", label: "Ended", tone: "done" },
  { id: "declined", label: "Declined", tone: "bad" },
];

export function statusLabel(s: ListStatus): string {
  return LIST_STATUSES.find((x) => x.id === s)?.label ?? s;
}

export function newListItem(creatorId: string, fields: ListItemFields = {}): ShortlistItem {
  return { creatorId, addedAt: new Date().toISOString(), status: "shortlisted", rate: null, labels: [], notes: "", ...fields };
}

/** Reads a status written any way (e.g. from a spreadsheet) as one of the six. */
export function parseStatus(text: string): ListStatus {
  const t = text.trim().toLowerCase();
  if (!t) return "shortlisted";
  if (/declin|reject|block|\bno\b|not interested|\bpass(ed)?\b/.test(t)) return "declined";
  if (/\bended?\b|\bdone\b|complet|finish|\bpaid\b|closed/.test(t)) return "ended";
  if (/active|live|confirm|book|signed|in progress|running|posting/.test(t)) return "active";
  if (/negotiat|discuss|counter|quote|pending rate/.test(t)) return "negotiating";
  if (/contact|reach|email|messag|dm|pending|sent|follow/.test(t)) return "contacted";
  return "shortlisted";
}

/** "₦150,000", "150k", "NGN 1.2m", "1,500,000" → a number of Naira. Blank or unreadable → null. */
export function parseRate(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  if (typeof text === "number") return Number.isFinite(text) && text >= 0 ? Math.round(text) : null;
  const t = text.trim().toLowerCase().replace(/₦|ngn|naira|n(?=\d)|,|\s/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  return Math.round(n);
}

export function formatNaira(n: number | null): string {
  if (n === null) return "—";
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

/** Labels written as "Food, Lifestyle" or "food; lifestyle". */
export function parseLabels(text: string): string[] {
  return [...new Set(text.split(/[,;|]/).map((l) => l.trim().toLowerCase()).filter(Boolean))];
}

/** The first email address in a bio, e.g. "Brand collab: contact@studio.com". */
export function bioEmail(bio: string): string | null {
  return bio.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase() ?? null;
}

/** The email to show for a creator: the saved one, or one found in their bio. */
export function contactEmail(c: Creator): { email: string; fromBio: boolean } | null {
  if (c.email) return { email: c.email, fromBio: false };
  const e = bioEmail(c.bio);
  return e ? { email: e, fromBio: true } : null;
}

/** A spreadsheet-safe CSV (Excel opens it). Cells starting with = + - @ are prefixed so they can't run as formulas. */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let s = v === null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
