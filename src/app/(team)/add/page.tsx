"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { LookupForm, PlatformToggle } from "@/components/lookup-form";
import { buttonClass, Card, cx, inputClass, PageHeader, SectionHeader } from "@/components/ui";
import { platformName } from "@/lib/platforms";
import { clock, slowDownSeconds, waitWithCountdown } from "@/lib/data/wait";
import { normalizeHandle, useCreators } from "@/lib/data/creators";
import { lookupCreator, type LookupResult } from "@/lib/data/lookup";
import { enqueue } from "@/lib/data/queue";
import { IS_LIVE } from "@/lib/supabase/config";
import { QueueStatusCard } from "@/components/queue-status";
import type { Platform } from "@/lib/types";

/** Most handles a single bulk add will take. */
const BULK_LIMIT = 100;

export default function AddPage() {
  return (
    <>
      <PageHeader title="Add creators" subtitle="Every creator you look up is saved, so the whole team can find them later." />
      <Card className="mb-6 p-5 sm:p-6">
        <SectionHeader title="One creator" description="Opens their profile as soon as the lookup finishes." className="mb-4" />
        <LookupForm />
      </Card>
      <BulkAdd />
      <QueueStatusCard className="mt-6" />
    </>
  );
}

function BulkAdd() {
  const creators = useCreators();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [text, setText] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  const handles = [...new Set(text.split(/[\s,;]+/).map((h) => h.trim()).filter(Boolean))];

  const [notice, setNotice] = useState<string | null>(null);
  const [queuedMsg, setQueuedMsg] = useState<string | null>(null);

  /** Every handle goes to the background queue: the server looks them up ~150 an hour, no tab needed. No 100 limit here. */
  async function queueAll() {
    setNotice(null);
    const res = await enqueue(handles.map((h) => ({ platform, handle: normalizeHandle(h) })).filter((i) => i.handle));
    if ("error" in res) return setNotice(`Couldn't queue them: ${res.error}`);
    setText("");
    setQueuedMsg(
      `${res.queued} queued in the background${res.alreadyWaiting ? ` (${res.alreadyWaiting} were already waiting)` : ""}. Creators already saved are matched instantly; new ones are looked up about 150 an hour. You can close this page.`,
    );
    setTotal(0);
  }

  async function run() {
    const list = handles.slice(0, BULK_LIMIT);
    setResults([]);
    setTotal(list.length);
    setRunning(true);
    setNotice(null);
    stop.current = false;
    let known = creators;
    for (const h of list) {
      if (stop.current) break;
      // One at a time, so we stay inside the platforms' rate limits.
      let r = await lookupCreator(platform, h, known);
      // A platform's hourly limit: wait as long as it asks, then carry on (for as long as this tab stays open).
      while (r.status === "error" && r.code === "rate_limited" && !stop.current) {
        const ok = await waitWithCountdown(
          slowDownSeconds(r.retryAfterSeconds),
          (left) => setNotice(`${platformName(platform)} asked us to slow down (its hourly limit). Carrying on automatically in ${clock(left)}. Keep this tab open.`),
          () => stop.current,
        );
        setNotice(null);
        if (!ok) break;
        r = await lookupCreator(platform, h, known);
      }
      if (r.status === "added") known = [...known, r.creator];
      setResults((prev) => [...prev, r]);
      if (r.status === "error" && (r.code === "quota" || r.code === "auth" || r.code === "config")) {
        setNotice(`Stopped: ${r.error}`);
        break;
      }
    }
    setRunning(false);
  }

  const done = results.length;
  const added = results.filter((r) => r.status === "added").length;
  const existing = results.filter((r) => r.status === "existing" || r.status === "refreshed").length;
  const failed = results.filter((r) => r.status === "error");

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Bulk add"
        description={`Paste handles, one per line or separated by commas. They're looked up one at a time to respect the platforms' limits (up to ${BULK_LIMIT} at once).`}
        className="mb-4"
      />
      <div className="mb-3 flex">
        <PlatformToggle value={platform} onChange={setPlatform} />
      </div>
      <textarea
        className={cx(inputClass, "min-h-36 leading-relaxed")}
        placeholder={"@first_creator\n@second_creator\nthird_creator"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={running}
        aria-label="Handles to add"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {running ? (
          <button className={buttonClass.secondary} onClick={() => (stop.current = true)}>
            Stop
          </button>
        ) : (
          <>
            {IS_LIVE && (
              <button className={buttonClass.primary} disabled={handles.length === 0} onClick={queueAll}>
                Add {handles.length || ""} in the background
              </button>
            )}
            <button className={IS_LIVE ? buttonClass.secondary : buttonClass.primary} disabled={handles.length === 0} onClick={run}>
              {IS_LIVE ? "Add now (keep this tab open)" : `Add ${handles.length > 0 ? Math.min(handles.length, BULK_LIMIT) : ""} ${handles.length === 1 ? "creator" : "creators"}`}
            </button>
          </>
        )}
        {handles.length > 0 && !running && <p className="text-xs text-muted">{handles.length} {handles.length === 1 ? "handle" : "handles"} found</p>}
        {handles.length > BULK_LIMIT && <p className="text-xs text-warn">Add now takes the first {BULK_LIMIT}; the background has no limit.</p>}
      </div>

      {queuedMsg && <p className="mt-4 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{queuedMsg}</p>}
      {notice && total === 0 && <p className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{notice}</p>}
      {total > 0 && (
        <div className="mt-5" aria-live="polite">
          {notice && <p className="mb-2 rounded-lg bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">{notice}</p>}
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{running ? `Looking up ${done + 1} of ${total}…` : `Finished: ${done} of ${total} checked`}</span>
            <span className="text-muted">
              {added} added · {existing} already saved · {failed.length} failed
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Bulk add progress">
            <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                {r.status === "error" ? (
                  <>
                    <span className="font-semibold">@{r.handle}</span>
                    <span className="flex items-start gap-1 text-right text-bad">
                      <Icon name="alert" size={14} className="mt-0.5 shrink-0" /> {r.error}
                    </span>
                  </>
                ) : (
                  <>
                    <Link href={`/creators/${encodeURIComponent(r.creator.id)}`} className="font-semibold text-accent-ink hover:underline">
                      @{r.creator.handle}
                    </Link>
                    <span className="flex items-center gap-3 text-muted">
                      {r.status === "added" ? "Added" : r.status === "refreshed" ? "Updated" : "Already saved"}
                      <Link href={`/creators/${encodeURIComponent(r.creator.id)}?discover=1`} className="text-xs font-semibold text-ink-2 hover:underline">
                        Find other platforms
                      </Link>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
