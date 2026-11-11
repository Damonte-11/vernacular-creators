import "server-only";
/**
 * The sheet agent: keeps a project in step with the team's Google Sheet.
 * 1. Reads the sheet with the layout the team confirmed.
 * 2. Adds post links that aren't on the project yet, matching each one to a
 *    booked creator: plain rules first, Claude for the messy rest. Sure
 *    matches are added; guesses wait for the team to confirm in the app.
 * 3. Writes the latest numbers back into its own "VC …" columns.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { postNumbers, todayLagos } from "../projects";
import { matchRow, planWriteBack, postValues, readRows, rowLabel, squash, type PostValues, type SheetLayout, type SheetState } from "../sheet-sync";
import type { Creator, Platform, PostCheck, Project, ProjectPost } from "../types";
import { LookupError } from "./errors";
import type { Fetcher } from "./fetched";
import { randomBytes } from "crypto";
import { handleInUrl } from "../projects";
import { defaultBudget, identifyCreator } from "./identify";
import { loadSettings } from "./repository";
import { columnLetter, readSheet, serviceAccountEmail, spreadsheetId, writeCells } from "./google";
import { matchRowsWithAI, proposeLayout } from "./sheet-ai";

interface Loaded {
  id: string;
  name: string;
  sheet_url: string | null;
  start_date: string;
  end_date: string;
  sheet_state: SheetState | null;
  sheet_rows?: string[][] | null;
  project_creators: { creator_id: string; creators: { id: string; name: string; handle: string; platform: Platform } | null }[];
  project_posts: {
    id: string;
    url: string;
    url_key: string;
    creator_id: string | null;
    checks: PostCheck[] | null;
    problem: string | null;
    posted_date: string | null;
    match_note?: string | null;
    sheet_label?: string | null;
  }[];
}

export interface SheetSyncResult {
  /** True when the layout still needs the team to confirm it. */
  needsLayout: boolean;
  added: number;
  matched: number;
  guessed: number;
  unmatched: number;
  written: number;
  handEdited: number;
  message: string;
}

const empty = (message: string, needsLayout = false): SheetSyncResult => ({
  needsLayout,
  added: 0,
  matched: 0,
  guessed: 0,
  unmatched: 0,
  written: 0,
  handEdited: 0,
  message,
});

const LOADED_SELECT =
  "id, name, sheet_url, sheet_rows, start_date, end_date, sheet_state, project_creators(creator_id, creators(id, name, handle, platform)), project_posts(id, url, url_key, creator_id, checks, problem, posted_date, match_note, sheet_label)";

async function load(db: SupabaseClient, projectId: string): Promise<Loaded> {
  const { data, error } = await db.from("projects").select(LOADED_SELECT).eq("id", projectId).single();
  if (error) throw error;
  return data as unknown as Loaded;
}

async function saveState(db: SupabaseClient, projectId: string, state: SheetState) {
  const { error } = await db.from("projects").update({ sheet_state: state }).eq("id", projectId);
  if (error) throw error;
}

function withLog(state: SheetState, text: string, now: number): SheetState {
  return { ...state, log: [{ at: new Date(now).toISOString(), text }, ...(state.log ?? [])].slice(0, 50) };
}

/** Read the sheet and have the agent propose a layout for the team to confirm. */
export async function readLayout(
  db: SupabaseClient,
  projectId: string,
  fetcher: Fetcher = fetch,
  tab: string | null = null,
  now = Date.now(),
): Promise<SheetSyncResult> {
  const p = await load(db, projectId);
  const id = p.sheet_url ? spreadsheetId(p.sheet_url) : null;
  if (!id) return empty("Add the project's Google Sheet link first (Edit project).");
  const { tabs, tab: t } = await readSheet(id, tab ?? p.sheet_state?.layout?.tab ?? null, fetcher);
  const { layout, byAI } = await proposeLayout(t.title, t.rows);
  const state = withLog(
    { ...(p.sheet_state ?? {}), proposed: layout, tabs, headers: t.rows[layout.headerRow] ?? [] },
    `Read the layout of "${t.title}"${byAI ? " (with AI)" : ""}. Waiting for the team to confirm it.`,
    now,
  );
  await saveState(db, projectId, state);
  return empty(`Read "${t.title}". Check which column is which, then confirm.`, true);
}

/** The team confirmed (or corrected) the layout. */
export async function confirmLayout(db: SupabaseClient, projectId: string, layout: SheetLayout, now = Date.now()): Promise<SheetSyncResult | null> {
  const p = await load(db, projectId);
  if (layout.columns.link === null) throw new LookupError("not_found", "Pick which column has the post links.");
  const state = withLog({ ...(p.sheet_state ?? {}), layout, proposed: null }, `Layout confirmed for "${layout.tab}".`, now);
  await saveState(db, projectId, state);
  // Rows the sheet's script already sent: add their links now; numbers are written on its next run.
  if (p.sheet_rows?.length && state.lastRowsTab === layout.tab) return (await applyRows(db, p, state, layout, p.sheet_rows, false, now)).result;
  return null;
}

/* ── The script inside the sheet (no Google Cloud key needed) ── */

/** A new secret code for the project's sheet script. Replaces any earlier one. */
export async function createHookToken(db: SupabaseClient, projectId: string): Promise<string> {
  const p = await load(db, projectId);
  const token = randomBytes(24).toString("base64url");
  await saveState(db, projectId, { ...(p.sheet_state ?? {}), hookToken: token });
  return token;
}

/** Most rows and columns kept from a sheet the script sends, and characters per cell. */
const KEEP_ROWS = 2000;
const KEEP_COLS = 40;
const KEEP_CHARS = 500;

export interface HookReply {
  /** Which tab the script should send next time it asks. */
  tab?: string;
  cells?: { a1: string; value: string }[];
  message?: string;
}

/**
 * Called by the script inside a Google Sheet, hourly or from its menu. First
 * call (no rows) asks which tab to send; the second sends that tab's rows and
 * gets back the cells to write.
 */
export async function handleHook(
  db: SupabaseClient,
  body: { token: string; tabs: string[]; tab?: string; rows?: string[][] },
  now = Date.now(),
): Promise<HookReply | null> {
  const { data, error } = await db.from("projects").select(LOADED_SELECT).eq("sheet_state->>hookToken", body.token).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as unknown as Loaded;
  const state: SheetState = { ...(p.sheet_state ?? {}), tabs: body.tabs, lastHeardAt: new Date(now).toISOString() };
  const wanted = state.layout?.tab ?? state.proposed?.tab ?? null;
  if (!body.rows) return { tab: wanted && body.tabs.includes(wanted) ? wanted : body.tabs[0] };

  const tab = body.tab ?? body.tabs[0] ?? "Sheet1";
  const rows = body.rows.slice(0, KEEP_ROWS).map((r) => r.slice(0, KEEP_COLS).map((c) => String(c ?? "").slice(0, KEEP_CHARS)));
  const kept = { ...state, lastRowsTab: tab };
  const { error: rowsError } = await db.from("projects").update({ sheet_rows: rows }).eq("id", p.id);
  if (rowsError) throw rowsError;

  if (!state.layout) {
    const { layout, byAI } = await proposeLayout(tab, rows);
    await saveState(
      db,
      p.id,
      withLog(
        { ...kept, proposed: layout, headers: rows[layout.headerRow] ?? [] },
        `The sheet connected and sent "${tab}"${byAI ? "; layout read with AI" : ""}. Waiting for the team to confirm the layout.`,
        now,
      ),
    );
    return { message: `Connected to "${p.name}". Now confirm which column is which on the project's Sheet tab in the app; links come in on the next sync.` };
  }
  if (tab !== state.layout.tab) {
    await saveState(db, p.id, withLog(kept, `The sheet sent "${tab}", but the layout is for "${state.layout.tab}".`, now));
    return { message: `This project reads the tab "${state.layout.tab}". Rename it back, or confirm a new layout in the app.` };
  }
  const { cells, result } = await applyRows(db, p, kept, state.layout, rows, true, now);
  return { cells, message: result.message };
}

/** The team matched a sheet spelling to a creator: remember it for next time. */
export async function learnAlias(db: SupabaseClient, projectId: string, label: string, creatorId: string): Promise<void> {
  const p = await load(db, projectId);
  const state = p.sheet_state ?? {};
  const aliases = { ...(state.aliases ?? {}) };
  for (const part of label.split("·")) if (squash(part).length >= 2) aliases[squash(part)] = creatorId;
  await saveState(db, projectId, { ...state, aliases });
}

export async function syncSheet(db: SupabaseClient, projectId: string, fetcher: Fetcher = fetch, now = Date.now()): Promise<SheetSyncResult> {
  const p = await load(db, projectId);
  const id = p.sheet_url ? spreadsheetId(p.sheet_url) : null;
  if (!id) return empty("Add the project's Google Sheet link first (Edit project).");
  const state = p.sheet_state ?? {};
  if (!state.layout) return readLayout(db, projectId, fetcher, null, now);
  const layout = state.layout;
  const { tab } = await readSheet(id, layout.tab, fetcher);
  if (tab.title !== layout.tab) {
    await saveState(db, projectId, withLog(state, `The tab "${layout.tab}" is gone. Confirm the layout again.`, now));
    return empty(`The tab "${layout.tab}" isn't in the sheet any more. Confirm the layout again.`, true);
  }
  const { cells, result } = await applyRows(db, p, state, layout, tab.rows, true, now);
  await writeCells(id, layout.tab, cells, fetcher);
  return result;
}

/**
 * The agent's work on a set of sheet rows, however they arrived (read through
 * Google's API, or sent by the script inside the sheet): add new links, match
 * them, and work out which cells to write back. `write` false plans nothing to
 * write (used when the rows are an earlier copy).
 */
async function applyRows(
  db: SupabaseClient,
  p: Loaded,
  state: SheetState,
  layout: SheetLayout,
  sheetRows: string[][],
  write: boolean,
  now: number,
): Promise<{ cells: { a1: string; value: string }[]; result: SheetSyncResult }> {
  const today = todayLagos(now);
  const rows = readRows(sheetRows, layout);

  // The project as the matching rules expect it.
  const creators: Creator[] = p.project_creators.filter((c) => c.creators).map((c) => ({ ...(c.creators as Creator) }));
  const project = { creators: p.project_creators.map((c) => ({ creatorId: c.creator_id, dueDate: null, postsAgreed: 1 })), posts: [] } as unknown as Project;
  const known = new Set(p.project_posts.map((x) => x.url_key));
  const fresh = rows.filter((r) => !known.has(r.urlKey));

  const sure = new Map<string, { creatorId: string; how: string }>();
  const unsure: typeof fresh = [];
  const guesses = new Map<string, string | null>();
  for (const r of fresh) {
    const m = matchRow(r, project, creators, state.aliases ?? {});
    if (m.creatorId) sure.set(r.urlKey, { creatorId: m.creatorId, how: m.how ?? "" });
    else {
      unsure.push(r);
      guesses.set(r.urlKey, m.suggestion);
    }
  }
  // Not booked yet? Work out who posted it (database first, then their platform) and book them.
  const postByKey = new Map(p.project_posts.map((x) => [x.url_key, x]));
  // Links already waiting for a creator are tried again, except ones that can't work until someone changes the sheet.
  const dead = /^(Couldn't find|Found @.* isn't among|".*" isn't a handle|The sheet has no handle|Couldn't tell|YouTube didn't say)/;
  const waitingOnes = rows.filter((r) => {
    const post = postByKey.get(r.urlKey);
    if (!post || post.creator_id !== null) return false;
    return !(post.match_note && dead.test(post.match_note) && (post.sheet_label ?? "") === rowLabel(r));
  });
  // A row that looks like a misspelling of someone already booked stays a guess, unless the link itself names the account.
  const toIdentify = [...unsure.filter((r) => handleInUrl(r.url) || !guesses.get(r.urlKey)), ...waitingOnes];
  const identifyNotes = new Map<string, string>();
  let found = 0;
  if (toIdentify.length) {
    const settings = await loadSettings(db);
    const budget = defaultBudget();
    for (const r of toIdentify) {
      const id = await identifyCreator(db, r, settings, budget);
      identifyNotes.set(r.urlKey, id.note);
      if (!id.creator) continue;
      const c = id.creator;
      if (!project.creators.some((x) => x.creatorId === c.id)) {
        const { error } = await db
          .from("project_creators")
          .upsert({ project_id: p.id, creator_id: c.id, due_date: r.date, posts_agreed: 1 }, { onConflict: "project_id,creator_id", ignoreDuplicates: true });
        if (error) throw error;
        project.creators.push({ creatorId: c.id, dueDate: r.date, postsAgreed: 1 });
        creators.push(c);
        found++;
      }
      const existing = postByKey.get(r.urlKey);
      if (existing) {
        await db.from("project_posts").update({ creator_id: c.id, suggested_creator_id: null, match_note: id.note }).eq("id", existing.id);
      } else sure.set(r.urlKey, { creatorId: c.id, how: id.note });
    }
    // Links still waiting: say why, so the team can see what's happening.
    for (const r of waitingOnes) {
      const post = postByKey.get(r.urlKey)!;
      if (!sure.has(r.urlKey) && identifyNotes.get(r.urlKey)) {
        const { data: now_ } = await db.from("project_posts").select("creator_id").eq("id", post.id).maybeSingle<{ creator_id: string | null }>();
        if (!now_?.creator_id)
          await db
            .from("project_posts")
            .update({ match_note: identifyNotes.get(r.urlKey) })
            .eq("id", post.id);
      }
    }
  }
  const stillUnsure = unsure.filter((r) => !sure.has(r.urlKey));
  const ai = await matchRowsWithAI(
    stillUnsure.filter((r) => r.handle || r.name || r.url),
    creators,
  );

  let matched = 0;
  let guessed = 0;
  let unmatched = 0;
  const insert = fresh.map((r) => {
    const s = sure.get(r.urlKey);
    const a = ai.get(r.urlKey);
    let creatorId: string | null = s?.creatorId ?? null;
    let suggested: string | null = null;
    let note: string | null = null;
    if (creatorId && s?.how && /database|Looked up/.test(s.how)) note = s.how;
    if (!creatorId && a?.creatorId && a.confidence === "high") {
      creatorId = a.creatorId;
      note = `Matched by the agent: ${a.reason}`;
    } else if (!creatorId) {
      suggested = a?.creatorId ?? guesses.get(r.urlKey) ?? null;
      note = a
        ? a.reason
        : suggested
          ? "Close spelling of a booked creator's handle."
          : (identifyNotes.get(r.urlKey) ?? "No booked creator matches what's written in the sheet.");
    }
    if (creatorId) matched++;
    else if (suggested) guessed++;
    else unmatched++;
    return {
      project_id: p.id,
      creator_id: creatorId,
      url: r.url,
      url_key: r.urlKey,
      platform: r.platform,
      posted_date: r.date ?? today,
      source: "sheet",
      suggested_creator_id: suggested,
      match_note: note,
      sheet_label: rowLabel(r) || null,
    };
  });
  if (insert.length) {
    const { error } = await db.from("project_posts").upsert(insert, { onConflict: "project_id,url_key", ignoreDuplicates: true });
    if (error) throw error;
  }

  // Write the latest numbers back for every row that is (now) on the project.
  const { data: posts } = await db.from("project_posts").select("id, url_key, creator_id, checks, problem, posted_date").eq("project_id", p.id);
  const values = new Map<string, PostValues>();
  for (const x of (posts ?? []) as { url_key: string; creator_id: string | null; checks: PostCheck[] | null; problem: string | null }[]) {
    const post = { checks: x.checks ?? [], problem: x.problem, creatorId: x.creator_id } as ProjectPost;
    const n = postNumbers(post);
    const status = !x.creator_id ? "Needs a creator in the app" : n.check ? `Day ${n.check.day}` : "Waiting for numbers";
    values.set(x.url_key, postValues(post, { views: n.views, engagements: n.engagements, er: n.er, checkedAt: n.check?.checkedAt ?? null }, status));
  }
  const plan = planWriteBack(sheetRows, layout, rows, values, state.written ?? {});
  const cells = write ? plan.cells.map((c) => ({ a1: `${columnLetter(c.col)}${c.row + 1}`, value: c.value })) : [];
  const numberCells = write ? plan.cells.filter((c) => c.row !== layout.headerRow).length : 0;

  const parts = [
    insert.length ? `Added ${insert.length} new ${insert.length === 1 ? "link" : "links"}` : "No new links",
    matched ? `${matched} matched` : "",
    found ? `${found} ${found === 1 ? "creator" : "creators"} found and added to the project` : "",
    guessed ? `${guessed} to confirm` : "",
    unmatched ? `${unmatched} with no creator` : "",
    numberCells ? `wrote ${numberCells} ${numberCells === 1 ? "cell" : "cells"} back` : "",
    plan.handEdited.length ? `${plan.handEdited.length} hand-edited ${plan.handEdited.length === 1 ? "cell" : "cells"} left alone` : "",
  ].filter(Boolean);
  const message = `${parts.join(", ")}.`;
  await saveState(
    db,
    p.id,
    withLog(
      {
        ...state,
        written: write ? plan.written : state.written,
        headers: sheetRows[layout.headerRow] ?? [],
        lastSyncAt: new Date(now).toISOString(),
        lastResult: message,
      },
      message,
      now,
    ),
  );
  return {
    cells,
    result: { needsLayout: false, added: insert.length, matched, guessed, unmatched, written: numberCells, handEdited: plan.handEdited.length, message },
  };
}

/** Hourly: sync every project with a confirmed sheet that is running or ended in the last two weeks. */
export async function syncAllSheets(db: SupabaseClient, deadline: number, fetcher: Fetcher = fetch): Promise<{ synced: number; notes: string[] }> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from("projects").select("id, name, sheet_url, sheet_state").not("sheet_url", "is", null).gte("end_date", since);
  if (error) throw error;
  const notes: string[] = [];
  let synced = 0;
  // Sheets connected through their own script send their rows themselves.
  if (!serviceAccountEmail()) return { synced: 0, notes };
  for (const p of (data ?? []) as { id: string; name: string; sheet_state: SheetState | null }[]) {
    if (!p.sheet_state?.layout || p.sheet_state.hookToken) continue;
    if (Date.now() > deadline) {
      notes.push("Out of time; the other sheets sync next hour.");
      break;
    }
    try {
      await syncSheet(db, p.id, fetcher);
      synced++;
    } catch (e) {
      notes.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { synced, notes };
}
