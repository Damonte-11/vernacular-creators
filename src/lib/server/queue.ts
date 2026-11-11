import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListItemFields, Platform } from "../types";
import { LookupError } from "./errors";
import { assertTikTokAllowance, fetchFromPlatform } from "./lookup-service";
import { findCreator, loadSettings, saveFetchedCreator } from "./repository";

/** Most platform lookups per run: inside Instagram's ~200 an hour, leaving room for the team's own lookups. */
export const QUEUE_LOOKUPS_PER_RUN = 150;
/** A row that keeps failing for other reasons is given up after this many tries. */
const MAX_ATTEMPTS = 3;

interface QueueRow {
  id: number;
  platform: Platform;
  handle: string;
  email: string | null;
  list_id: string | null;
  fields: ListItemFields;
  attempts: number;
}

export interface QueueSummary {
  done: number;
  failed: number;
  lookups: number;
  waiting: number;
  stopped: string | null;
}

/**
 * Works through the background import queue: creators already saved are
 * matched straight away; the rest are looked up (up to QUEUE_LOOKUPS_PER_RUN),
 * saved, and added to their list. A platform that says "slow down" is left
 * for the next run.
 */
export async function processQueue(db: SupabaseClient, deadline: number, maxLookups: number = QUEUE_LOOKUPS_PER_RUN): Promise<QueueSummary> {
  const settings = await loadSettings(db);
  const summary: QueueSummary = { done: 0, failed: 0, lookups: 0, waiting: 0, stopped: null };
  const { data, error } = await db.from("import_queue").select("id, platform, handle, email, list_id, fields, attempts").eq("status", "waiting").order("id").limit(1000);
  if (error) throw error;
  const paused = new Set<Platform>();

  for (const row of (data ?? []) as QueueRow[]) {
    if (Date.now() > deadline) {
      summary.stopped = "Out of time for this run; the rest continue next hour";
      break;
    }
    if (paused.has(row.platform)) continue;
    try {
      // The database first: no lookup for creators already saved.
      let creator = await findCreator(db, row.platform, row.handle);
      if (!creator) {
        if (summary.lookups >= maxLookups) {
          summary.stopped = `Looked up ${maxLookups} this hour (the safe limit); the rest continue next hour`;
          break;
        }
        if (row.platform === "tiktok") await assertTikTokAllowance(db);
        summary.lookups++;
        creator = await saveFetchedCreator(db, await fetchFromPlatform(row.platform, row.handle, 1), settings, null);
      }
      if (row.email && !creator.email) await db.from("creators").update({ email: row.email }).eq("id", creator.id).is("email", null);
      if (row.list_id) {
        const { error: listError } = await db
          .from("shortlist_items")
          .upsert({ shortlist_id: row.list_id, creator_id: creator.id, ...itemColumns(row.fields) }, { onConflict: "shortlist_id,creator_id" });
        if (listError) throw listError;
      }
      await finish(db, row.id, "done", "", creator.id);
      summary.done++;
    } catch (e) {
      if (e instanceof LookupError && ["not_found", "not_professional", "hidden_subscribers"].includes(e.code)) {
        await finish(db, row.id, "failed", e.message);
        summary.failed++;
      } else if (e instanceof LookupError && ["rate_limited", "quota", "auth", "config"].includes(e.code)) {
        // Leave it waiting; this platform tries again next run.
        paused.add(row.platform);
        summary.stopped = `${row.platform}: ${e.message}`;
      } else {
        const message = e instanceof Error ? e.message : String(e);
        if (row.attempts + 1 >= MAX_ATTEMPTS) {
          await finish(db, row.id, "failed", message);
          summary.failed++;
        } else await db.from("import_queue").update({ attempts: row.attempts + 1, detail: message }).eq("id", row.id);
      }
    }
  }
  const { count } = await db.from("import_queue").select("id", { count: "exact", head: true }).eq("status", "waiting");
  summary.waiting = count ?? 0;
  return summary;
}

async function finish(db: SupabaseClient, id: number, status: "done" | "failed", detail: string, creatorId?: string) {
  await db
    .from("import_queue")
    .update({ status, detail, creator_id: creatorId ?? null, done_at: new Date().toISOString() })
    .eq("id", id);
}

function itemColumns(f: ListItemFields): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.status) row.status = f.status;
  if (f.rate !== undefined) row.rate = f.rate;
  if (f.labels) row.labels = f.labels;
  if (f.notes) row.notes = f.notes;
  return row;
}
