import { parseLabels, parseRate, parseStatus } from "./lists";
import type { ListItemFields, Platform } from "./types";

/** What a spreadsheet column holds. "ignore" columns aren't imported. */
export type ColumnKind = "url" | "handle" | "platform" | "name" | "email" | "status" | "labels" | "rate" | "notes" | "ignore";

export const COLUMN_LABELS: Record<ColumnKind, string> = {
  url: "Profile link",
  handle: "@handle",
  platform: "Platform",
  name: "Name",
  email: "Email",
  status: "Status",
  labels: "Labels",
  rate: "Rate (₦)",
  notes: "Notes",
  ignore: "Don't import",
};

/** A tiny CSV reader: commas or semicolons, quoted cells, line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Checked in order: the more specific words first ("Creator notes" is notes, "Creator name" is a name).
const HEADER_HINTS: [ColumnKind, RegExp][] = [
  ["notes", /note|comment|remark/],
  ["email", /e-?mail/],
  ["status", /status|stage/],
  ["labels", /label|tag|categor/],
  ["rate", /rate|fee|price|cost|amount|budget|₦|ngn/],
  ["platform", /platform|channel|network|social/],
  ["url", /url|link/],
  ["handle", /handle|user ?name|@/],
  ["name", /name/],
  ["handle", /account|instagram|tiktok|youtube|creator|influencer|\big\b/],
];

/** Guesses what each column holds from its header, then from its values. */
export function detectColumns(header: string[], sample: string[][]): ColumnKind[] {
  const used = new Set<ColumnKind>();
  return header.map((h, col) => {
    const t = h.trim().toLowerCase();
    const values = sample.map((r) => (r[col] ?? "").trim()).filter(Boolean);
    let kind: ColumnKind = "ignore";
    // Values say more than headers for links and handles.
    if (values.length && values.every((v) => /(instagram|tiktok|youtube)\.com\//i.test(v))) kind = "url";
    else if (values.length && values.every((v) => /@/.test(v) && /\.[a-z]{2,}$/i.test(v) && !/\s/.test(v))) kind = "email";
    else kind = HEADER_HINTS.find(([, re]) => re.test(t))?.[0] ?? (values.length && values.every((v) => /^@[\w.]+$/.test(v)) ? "handle" : "ignore");
    // "Profile URL" + "Profile name" etc.: each kind is used once, except notes and labels.
    if (kind !== "ignore" && kind !== "notes" && kind !== "labels" && used.has(kind)) kind = "ignore";
    used.add(kind);
    return kind;
  });
}

export function platformFromText(text: string): Platform | null {
  const t = text.trim().toLowerCase();
  if (/instagram|^ig$|^insta/.test(t)) return "instagram";
  if (/tiktok|tik tok|^tt$/.test(t)) return "tiktok";
  if (/youtube|^yt$/.test(t)) return "youtube";
  return null;
}

export interface ImportRow {
  /** Spreadsheet row number, as people see it (header is row 1). */
  line: number;
  platform: Platform | null;
  handle: string | null;
  name: string;
  email: string | null;
  fields: ListItemFields;
  /** Why this row can't be imported, if it can't. */
  problem?: string;
}

/** Turns spreadsheet rows into creators to find, with their list fields. */
export function readRows(rows: string[][], kinds: ColumnKind[], defaultPlatform: Platform | null): ImportRow[] {
  const get = (r: string[], kind: ColumnKind) => kinds.flatMap((k, i) => (k === kind ? [(r[i] ?? "").trim()] : [])).filter(Boolean);
  return rows.map((r, idx) => {
    const url = get(r, "url")[0] ?? "";
    let platform = platformFromText(url) ?? platformFromText(get(r, "platform")[0] ?? "");
    let handle: string | null = null;
    if (url) {
      const m = url.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/(?:@|c\/|user\/|channel\/)?([^/?#\s]+)/i);
      handle = m?.[1] ?? null;
    }
    // A handle typed into the link column still counts as a handle.
    const rawHandle = get(r, "handle")[0] ?? (url && !handle && /^@?[\w.]{2,40}$/.test(url) ? url : undefined);
    if (!handle && rawHandle) {
      const m = rawHandle.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/(?:@|c\/|user\/|channel\/)?([^/?#\s]+)/i);
      platform ??= platformFromText(rawHandle);
      handle = (m?.[1] ?? rawHandle).replace(/^@/, "").trim() || null;
    }
    platform ??= defaultPlatform;
    const fields: ListItemFields = {};
    const status = get(r, "status")[0];
    if (status) fields.status = parseStatus(status);
    const rate = get(r, "rate")[0];
    if (rate) fields.rate = parseRate(rate);
    const labels = get(r, "labels").flatMap(parseLabels);
    if (labels.length) fields.labels = [...new Set(labels)];
    const notes = get(r, "notes").join(" · ");
    if (notes) fields.notes = notes;
    const email = get(r, "email")[0]?.toLowerCase() ?? null;
    const row: ImportRow = { line: idx + 2, platform, handle, name: get(r, "name")[0] ?? "", email, fields };
    if (!handle) row.problem = email ? "Only an email: add a handle or profile link" : "No handle or profile link";
    else if (!platform) row.problem = "Platform unknown: add a platform column or choose one above";
    return row;
  });
}
