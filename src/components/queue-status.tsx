"use client";
import { useState } from "react";
import { useQueueStatus } from "@/lib/data/queue";
import { formatDate, formatNumber } from "@/lib/format";
import { IS_LIVE } from "@/lib/supabase/config";
import { Icon } from "./icons";
import { buttonClass, Card, cx } from "./ui";

/**
 * Progress of the background import queue (live only): how many creators are
 * waiting, done and failed, with a "Run now" button for when you don't want to
 * wait for the hourly run.
 */
export function QueueStatusCard({ listId, hideWhenEmpty, className }: { listId?: string; hideWhenEmpty?: boolean; className?: string }) {
  const { status, reload } = useQueueStatus(listId);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showFailures, setShowFailures] = useState(false);
  if (!IS_LIVE || !status) return null;
  if (hideWhenEmpty && status.waiting === 0 && status.failed === 0) return null;
  const hours = Math.ceil(status.waiting / 150);

  async function runNow() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/queue/run", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      setMessage(res.ok ? `Done ${body.done}, failed ${body.failed}, ${body.waiting} still waiting.${body.stopped ? ` ${body.stopped}.` : ""}` : (body.error ?? "The run failed."));
    } catch {
      setMessage("Couldn't reach the server.");
    }
    setRunning(false);
    void reload();
  }

  return (
    <Card className={cx("p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            {status.waiting > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />}
            Background imports{listId ? " for this list" : ""}
          </p>
          <p className="mt-0.5 text-sm text-ink-2">
            {status.waiting > 0
              ? `${formatNumber(status.waiting)} waiting to be looked up: about ${hours} ${hours === 1 ? "hour" : "hours"} at ~150 an hour. You can close this page.`
              : "Nothing waiting."}
            {status.lastDoneAt && <span className="text-muted"> Last one done {formatDate(status.lastDoneAt)}.</span>}
          </p>
        </div>
        {status.waiting > 0 && (
          <button className={buttonClass.secondary} onClick={runNow} disabled={running}>
            {running ? "Running… (up to 4 minutes)" : "Run now"}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-surface-2 px-2 py-1 ring-1 ring-line">
          <b className="tabular-nums">{formatNumber(status.waiting)}</b> waiting
        </span>
        <span className="rounded-md bg-good-soft px-2 py-1 text-good ring-1 ring-good/20">
          <b className="tabular-nums">{formatNumber(status.done)}</b> done
        </span>
        <button
          className={cx("rounded-md px-2 py-1 ring-1", status.failed ? "bg-bad-soft text-bad ring-bad/20 hover:underline" : "bg-surface-2 ring-line")}
          onClick={() => setShowFailures((s) => !s)}
          disabled={!status.failed}
          aria-expanded={showFailures}
        >
          <b className="tabular-nums">{formatNumber(status.failed)}</b> couldn&apos;t be added
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-ink-2">{message}</p>}
      {showFailures && status.recentFailures.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-lg text-xs ring-1 ring-line">
          {status.recentFailures.map((f, i) => (
            <li key={i} className="flex justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon name={f.platform} size={12} /> @{f.handle}
              </span>
              <span className="text-right text-bad">{f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
