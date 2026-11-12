"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "../supabase/browser";
import { IS_LIVE } from "../supabase/config";
import type { ListItemFields, Platform } from "../types";

export interface QueueItem {
  platform: Platform;
  handle: string;
  name?: string;
  email?: string | null;
  listId?: string | null;
  fields?: ListItemFields;
}

/** Puts handles in the background import queue (live only). Ones already waiting for the same list are skipped. */
export async function enqueue(items: QueueItem[]): Promise<{ queued: number; alreadyWaiting: number } | { error: string }> {
  const db = supabaseBrowser();
  const { data: waiting, error } = await db.from("import_queue").select("platform, handle, list_id").eq("status", "waiting").limit(20000);
  if (error)
    return { error: /import_queue/.test(error.message) ? "Run database update 0011_import_queue.sql in Supabase first (see docs/SETUP.md)." : error.message };
  const key = (p: string, h: string, l: string | null | undefined) => `${p}:${h.toLowerCase()}:${l ?? ""}`;
  const have = new Set((waiting ?? []).map((w) => key(w.platform, w.handle, w.list_id)));
  const fresh = items.filter((i) => {
    const k = key(i.platform, i.handle, i.listId);
    if (have.has(k)) return false;
    have.add(k);
    return true;
  });
  for (let i = 0; i < fresh.length; i += 500) {
    const { error: insertError } = await db.from("import_queue").insert(
      fresh.slice(i, i + 500).map((x) => ({
        platform: x.platform,
        handle: x.handle.replace(/^@/, ""),
        name: x.name ?? "",
        email: x.email ?? null,
        list_id: x.listId ?? null,
        fields: x.fields ?? {},
      })),
    );
    if (insertError) return { error: insertError.message };
  }
  return { queued: fresh.length, alreadyWaiting: items.length - fresh.length };
}

export interface QueueStatus {
  waiting: number;
  done: number;
  failed: number;
  recentFailures: { handle: string; platform: Platform; detail: string }[];
  lastDoneAt: string | null;
}

/** Live counts for the background queue, optionally for one list. Refreshes every 30 seconds. */
export function useQueueStatus(listId?: string) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const load = useCallback(async () => {
    if (!IS_LIVE) return;
    const db = supabaseBrowser();
    const count = async (s: string) => {
      let q = db.from("import_queue").select("id", { count: "exact", head: true }).eq("status", s);
      if (listId) q = q.eq("list_id", listId);
      return (await q).count ?? 0;
    };
    let failures = db.from("import_queue").select("handle, platform, detail").eq("status", "failed").order("done_at", { ascending: false }).limit(20);
    if (listId) failures = failures.eq("list_id", listId);
    let last = db.from("import_queue").select("done_at").eq("status", "done").order("done_at", { ascending: false }).limit(1);
    if (listId) last = last.eq("list_id", listId);
    const [waiting, done, failed, f, l] = await Promise.all([count("waiting"), count("done"), count("failed"), failures, last]);
    setStatus({
      waiting,
      done,
      failed,
      recentFailures: (f.data ?? []) as QueueStatus["recentFailures"],
      lastDoneAt: (l.data?.[0]?.done_at as string | undefined) ?? null,
    });
  }, [listId]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);
  return { status, reload: load };
}
