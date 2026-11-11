/**
 * The sheet agent's rules, with no network calls: reading a team's Google
 * Sheet (whatever its layout), matching rows to creators, and working out
 * which numbers to write back. The server adds Google, Claude and saving.
 */
import { normaliseUrl, platformOfUrl, readPastedLinks } from "./projects";
import type { Creator, Platform, Project, ProjectPost } from "./types";

export type ColumnRole = "link" | "handle" | "name" | "platform" | "date";

export const COLUMN_ROLES: { id: ColumnRole; label: string; hint: string }[] = [
  { id: "link", label: "Post link", hint: "The column with the post links" },
  { id: "handle", label: "Handle", hint: "@handle or username, if the sheet has one" },
  { id: "name", label: "Creator name", hint: "The creator's name, if the sheet has one" },
  { id: "platform", label: "Platform", hint: "Instagram, TikTok or YouTube, if written" },
  { id: "date", label: "Date posted", hint: "When it went up, if written" },
];

/** Which column holds what. Column numbers start at 0 (A = 0). */
export interface SheetLayout {
  tab: string;
  /** Row of the column headings (0 = row 1). */
  headerRow: number;
  columns: Record<ColumnRole, number | null>;
}

/** Everything the sheet agent remembers about a project's sheet. */
export interface SheetState {
  /** The layout the team confirmed. Nothing is added until there is one. */
  layout?: SheetLayout | null;
  /** The agent's reading of the layout, waiting for the team to confirm. */
  proposed?: SheetLayout | null;
  /** Spellings the team has matched before: squashed text → creator ID. */
  aliases?: Record<string, string>;
  /** What the agent last wrote, per post (by link) and column, to spot hand edits. */
  written?: Record<string, Record<string, string>>;
  log?: { at: string; text: string }[];
  lastSyncAt?: string | null;
  lastResult?: string | null;
  tabs?: string[];
  /** Header labels of the confirmed tab, for showing the layout. */
  headers?: string[];
  /** Secret code the script inside the sheet sends (when connected that way). */
  hookToken?: string;
  /** When the sheet's script last sent rows. */
  lastHeardAt?: string;
  /** Which tab the sheet's script last sent (its rows are kept in projects.sheet_rows). */
  lastRowsTab?: string;
}

/** Columns the agent owns and writes into. Headed so nobody mistakes them for the team's. */
export const AGENT_COLUMNS = ["VC Views", "VC Engagements", "VC ER by views", "VC Last checked", "VC Status"] as const;
export type AgentColumn = (typeof AGENT_COLUMNS)[number];

export function squash(s: string): string {
  return s
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");
}

/* ── Layout ──────────────────────────────────────────────────── */

const ROLE_WORDS: Record<ColumnRole, RegExp> = {
  link: /link|url|post|video|reel|content/i,
  handle: /handle|user\s*name|username|^ig$|instagram|tiktok|@/i,
  name: /name|influencer|creator|talent/i,
  platform: /platform|channel|network/i,
  date: /date|posted|live|day/i,
};

/**
 * A best guess at the layout without AI: the header row is the first row with
 * two or more recognisable headings; the link column is the one with the most
 * post links under it.
 */
export function guessLayout(tab: string, rows: string[][]): SheetLayout {
  const columns: Record<ColumnRole, number | null> = { link: null, handle: null, name: null, platform: null, date: null };
  let headerRow = 0;
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const hits = (rows[r] ?? []).filter((c) => Object.values(ROLE_WORDS).some((re) => re.test(c ?? ""))).length;
    if (hits >= 2) {
      headerRow = r;
      break;
    }
  }
  const header = rows[headerRow] ?? [];
  const width = Math.max(0, ...rows.map((r) => r.length));
  // Link column: most cells with a post link below the header.
  let best = -1;
  let bestCount = 0;
  for (let c = 0; c < width; c++) {
    const n = rows.slice(headerRow + 1).filter((r) => /https?:\/\/\S*(instagram|tiktok|youtu)/i.test(r[c] ?? "")).length;
    if (n > bestCount) [best, bestCount] = [c, n];
  }
  if (best >= 0) columns.link = best;
  for (const role of ["handle", "name", "platform", "date"] as const) {
    const c = header.findIndex((h, i) => i !== columns.link && !Object.values(columns).includes(i) && ROLE_WORDS[role].test(h ?? ""));
    if (c >= 0) columns[role] = c;
  }
  return { tab, headerRow, columns };
}

/* ── Rows ────────────────────────────────────────────────────── */

export interface SheetRow {
  /** Row in the sheet (0 = row 1). */
  row: number;
  url: string;
  urlKey: string;
  platform: Platform | null;
  handle: string;
  name: string;
  date: string | null;
}

const cell = (r: string[], c: number | null) => (c === null ? "" : (r[c] ?? "").trim());

/** One entry per post link in the sheet, below the header. A cell with two links gives two entries. */
export function readRows(rows: string[][], layout: SheetLayout): SheetRow[] {
  const out: SheetRow[] = [];
  const seen = new Set<string>();
  for (let i = layout.headerRow + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const linkText = cell(r, layout.columns.link) || r.join(" ");
    const urls = linkText.match(/https?:\/\/[^\s,;)"'<>]+/g) ?? [];
    for (const raw of urls) {
      const url = raw.replace(/[.,]+$/, "");
      const platform = platformOfUrl(url) ?? platformFromText(cell(r, layout.columns.platform));
      if (!platform) continue; // not a post link (e.g. a brief or a Drive file)
      const urlKey = normaliseUrl(url);
      if (seen.has(urlKey)) continue;
      seen.add(urlKey);
      out.push({
        row: i,
        url,
        urlKey,
        platform,
        handle: cell(r, layout.columns.handle),
        name: cell(r, layout.columns.name),
        date: parseSheetDate(cell(r, layout.columns.date)),
      });
    }
  }
  return out;
}

export function platformFromText(s: string): Platform | null {
  if (/insta|^ig$/i.test(s)) return "instagram";
  if (/tik\s*tok|^tt$/i.test(s)) return "tiktok";
  if (/you\s*tube|^yt$/i.test(s)) return "youtube";
  return null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Dates the way a Lagos team writes them: 2026-11-04, 4/11/2026 (day first), 4 Nov 2026, Nov 4. Year defaults to this year. */
export function parseSheetDate(s: string, thisYear: number = new Date().getUTCFullYear()): string | null {
  const t = s.trim();
  if (!t) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const ok = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null);
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) return ok(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : thisYear, +m[2], +m[1]);
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,})\.?,?\s*(\d{4})?$/i);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return ok(m[3] ? +m[3] : thisYear, MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]);
  m = t.match(/^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/i);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return ok(m[3] ? +m[3] : thisYear, MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
  return null;
}

/* ── Matching ────────────────────────────────────────────────── */

export interface RowMatch {
  creatorId: string | null;
  /** A guess for the team to confirm, when not sure. */
  suggestion: string | null;
  how: string | null;
}

/**
 * Sure matches only: the handle in the link, a handle or name column that
 * equals a booked creator's (ignoring case, @, dots and underscores), or a
 * spelling the team matched before. Anything else gets at most a guess.
 */
export function matchRow(row: SheetRow, project: Project, creators: Creator[], aliases: Record<string, string> = {}): RowMatch {
  const booked = new Set(project.creators.map((c) => c.creatorId));
  const pool = creators.filter((c) => booked.has(c.id) && (!row.platform || c.platform === row.platform));
  for (const text of [row.handle, row.name]) {
    const alias = text && aliases[squash(text)];
    if (alias && booked.has(alias)) return { creatorId: alias, suggestion: null, how: "matched like this before" };
  }
  if (row.handle) {
    const hit = pool.find((c) => squash(c.handle) === squash(row.handle));
    if (hit) return { creatorId: hit.id, suggestion: null, how: "handle column" };
  }
  if (row.name) {
    const hits = pool.filter((c) => squash(c.name) === squash(row.name));
    if (hits.length === 1) return { creatorId: hits[0].id, suggestion: null, how: "name column" };
  }
  // The link itself, or near-miss spellings, through the same reader as pasted links.
  const [read] = readPastedLinks(`${row.handle} ${row.name} ${row.url}`, { ...project, posts: [] }, creators);
  if (read?.creatorId) return { creatorId: read.creatorId, suggestion: null, how: read.how };
  return { creatorId: null, suggestion: read?.suggestion ?? null, how: null };
}

/** The words the team wrote for this row, kept so a confirmed match is remembered. */
export function rowLabel(row: Pick<SheetRow, "handle" | "name">): string {
  return [row.handle, row.name].filter(Boolean).join(" · ");
}

/* ── Writing numbers back ────────────────────────────────────── */

export interface WriteBackPlan {
  /** Cells to write: header cells for any new agent columns, then the numbers. */
  cells: { row: number; col: number; value: string }[];
  /** New memory of what the agent wrote. */
  written: Record<string, Record<string, string>>;
  /** Cells someone changed by hand, left alone. */
  handEdited: { row: number; column: AgentColumn }[];
}

export interface PostValues {
  views: string;
  engagements: string;
  er: string;
  checked: string;
  status: string;
}

/**
 * Agent columns go after the last used column, under the header row, and
 * only ever into those columns. A cell whose value differs from what the
 * agent last wrote (and isn't empty) was edited by a person and is skipped.
 */
export function planWriteBack(
  rows: string[][],
  layout: SheetLayout,
  sheetRows: SheetRow[],
  values: Map<string, PostValues>,
  written: Record<string, Record<string, string>> = {},
): WriteBackPlan {
  const header = rows[layout.headerRow] ?? [];
  const width = Math.max(header.length, ...rows.map((r) => r.length));
  const cells: WriteBackPlan["cells"] = [];
  const colOf = new Map<AgentColumn, number>();
  let next = width;
  for (const name of AGENT_COLUMNS) {
    const at = header.findIndex((h) => (h ?? "").trim() === name);
    if (at >= 0) colOf.set(name, at);
    else {
      colOf.set(name, next);
      cells.push({ row: layout.headerRow, col: next, value: name });
      next++;
    }
  }
  const memory: Record<string, Record<string, string>> = { ...written };
  const handEdited: WriteBackPlan["handEdited"] = [];
  for (const r of sheetRows) {
    const v = values.get(r.urlKey);
    if (!v) continue;
    const want: Record<AgentColumn, string> = {
      "VC Views": v.views,
      "VC Engagements": v.engagements,
      "VC ER by views": v.er,
      "VC Last checked": v.checked,
      "VC Status": v.status,
    };
    const before = memory[r.urlKey] ?? {};
    const after: Record<string, string> = { ...before };
    for (const name of AGENT_COLUMNS) {
      const col = colOf.get(name)!;
      const current = (rows[r.row]?.[col] ?? "").trim();
      if (current === want[name]) {
        after[name] = want[name];
        continue;
      }
      if (current !== "" && current !== (before[name] ?? "")) {
        handEdited.push({ row: r.row, column: name });
        continue;
      }
      cells.push({ row: r.row, col, value: want[name] });
      after[name] = want[name];
    }
    memory[r.urlKey] = after;
  }
  return { cells, written: memory, handEdited };
}

/** The numbers and status the agent writes for one post. */
export function postValues(
  post: ProjectPost,
  latest: { views: number | null; engagements: number | null; er: number | null; checkedAt: string | null },
  statusText: string,
): PostValues {
  return {
    views: latest.views === null ? "" : String(latest.views),
    engagements: latest.engagements === null ? "" : String(latest.engagements),
    er: latest.er === null ? "" : `${(latest.er * 100).toFixed(1)}%`,
    checked: latest.checkedAt ? latest.checkedAt.slice(0, 10) : "",
    status: post.problem ? `Couldn't read: ${post.problem.slice(0, 80)}` : statusText,
  };
}
