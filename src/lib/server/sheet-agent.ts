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
import { columnLetter, readSheet, spreadsheetId, writeCells } from "./google";
import { matchRowsWithAI, proposeLayout } from "./sheet-ai";

interface Loaded {
  id: string;
  sheet_url: string | null;
  start_date: string;
  end_date: string;
  sheet_state: SheetState | null;
  project_creators: { creator_id: string; creators: { id: string; name: string; handle: string; platform: Platform } | null }[];
  project_posts: {
    id: string;
    url: string;
    url_key: string;
    creator_id: string | null;
    checks: PostCheck[] | null;
    problem: string | null;
    posted_date: string | null;
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

async function load(db: SupabaseClient, projectId: string): Promise<Loaded> {
  const { data, error } = await db
    .from("projects")
    .select(
      "id, sheet_url, start_date, end_date, sheet_state, project_creators(creator_id, creators(id, name, handle, platform)), project_posts(id, url, url_key, creator_id, checks, problem, posted_date)",
    )
    .eq("id", projectId)
    .single();
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
export async function confirmLayout(db: SupabaseClient, projectId: string, layout: SheetLayout, now = Date.now()): Promise<void> {
  const p = await load(db, projectId);
  if (layout.columns.link === null) throw new LookupError("not_found", "Pick which column has the post links.");
  const state = withLog({ ...(p.sheet_state ?? {}), layout, proposed: null }, `Layout confirmed for "${layout.tab}".`, now);
  await saveState(db, projectId, state);
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
  const today = todayLagos(now);
  const rows = readRows(tab.rows, layout);

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
  const ai = await matchRowsWithAI(
    unsure.filter((r) => r.handle || r.name || r.url),
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
    if (!creatorId && a?.creatorId && a.confidence === "high") {
      creatorId = a.creatorId;
      note = `Matched by the agent: ${a.reason}`;
    } else if (!creatorId) {
      suggested = a?.creatorId ?? guesses.get(r.urlKey) ?? null;
      note = a ? a.reason : suggested ? "Close spelling of a booked creator's handle." : "No booked creator matches what's written in the sheet.";
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
  const plan = planWriteBack(tab.rows, layout, rows, values, state.written ?? {});
  await writeCells(
    id,
    layout.tab,
    plan.cells.map((c) => ({ a1: `${columnLetter(c.col)}${c.row + 1}`, value: c.value })),
    fetcher,
  );
  const numberCells = plan.cells.filter((c) => c.row !== layout.headerRow).length;

  const parts = [
    insert.length ? `Added ${insert.length} new ${insert.length === 1 ? "link" : "links"}` : "No new links",
    matched ? `${matched} matched` : "",
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
      { ...state, written: plan.written, headers: tab.rows[layout.headerRow] ?? [], lastSyncAt: new Date(now).toISOString(), lastResult: message },
      message,
      now,
    ),
  );
  return { needsLayout: false, added: insert.length, matched, guessed, unmatched, written: numberCells, handEdited: plan.handEdited.length, message };
}

/** Hourly: sync every project with a confirmed sheet that is running or ended in the last two weeks. */
export async function syncAllSheets(db: SupabaseClient, deadline: number, fetcher: Fetcher = fetch): Promise<{ synced: number; notes: string[] }> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from("projects").select("id, name, sheet_url, sheet_state").not("sheet_url", "is", null).gte("end_date", since);
  if (error) throw error;
  const notes: string[] = [];
  let synced = 0;
  for (const p of (data ?? []) as { id: string; name: string; sheet_state: SheetState | null }[]) {
    if (!p.sheet_state?.layout) continue;
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
