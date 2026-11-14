"use client";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { IS_LIVE } from "@/lib/supabase/config";
import type { AudienceSignals, Creator } from "@/lib/types";
import { buttonClass, cx } from "../ui";

function Bars({ items }: { items: { label: string; share: number }[] }) {
  const top = Math.max(...items.map((x) => x.share), 1);
  return (
    <ul className="space-y-2">
      {items.map((x) => (
        <li key={x.label} className="grid grid-cols-[84px_1fr_36px] items-center gap-2 text-[13px]">
          <span className="truncate text-ink-2">{x.label}</span>
          <span className="h-2 rounded-full bg-line">
            <span className="cr-grow block h-full rounded-full bg-accent" style={{ width: `${(x.share / top) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{x.share}%</span>
        </li>
      ))}
    </ul>
  );
}

/** What the people commenting look like: read on request (Apify credit for Instagram and TikTok), kept on the creator. */
export function AudiencePanel({ creator }: { creator: Creator }) {
  const [a, setA] = useState<AudienceSignals | null>(creator.audience ?? null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const paid = creator.platform !== "youtube";

  async function read() {
    if (a && !window.confirm(`Read their comments again?${paid ? " This uses Apify credit." : ""}`)) return;
    setBusy(true);
    setProblem(null);
    const res = await fetch(`/api/creators/${encodeURIComponent(creator.id)}/audience`, { method: "POST" }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { audience?: AudienceSignals; error?: string } | undefined;
    setBusy(false);
    if (res?.ok && body?.audience) setA(body.audience);
    else setProblem(body?.error ?? "Couldn't read their comments. Please try again.");
  }

  const button = IS_LIVE && (
    <button className={cx(a ? buttonClass.secondary : buttonClass.primary, "no-print")} onClick={read} disabled={busy}>
      {busy ? "Reading comments… (up to a minute)" : a ? "Read again" : "Read their comments"}
    </button>
  );

  if (!a)
    return (
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <p className="text-[13px] text-ink-2">
          Read the comments on their latest posts to see what language their audience comments in, how they feel, how many look like bots, and what they keep
          talking about.
          {paid ? " Uses a little Apify credit." : " Free for YouTube."}
        </p>
        {!IS_LIVE && <p className="mt-2 text-xs text-muted">The live app reads real comments; the demo has none to read.</p>}
        <div className="mt-3">{button}</div>
        {problem && (
          <p role="alert" className="mt-2 text-xs text-bad">
            {problem}
          </p>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <p className="mb-3 text-[13px] font-semibold">Languages they comment in</p>
          {a.languages.length ? <Bars items={a.languages} /> : <p className="text-[13px] text-muted">Not enough real comments.</p>}
        </div>
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <p className="mb-3 text-[13px] font-semibold">How they feel</p>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <span className="bg-good" style={{ width: `${a.sentiment.positive}%` }} />
            <span className="mx-[2px] bg-line-strong" style={{ width: `${a.sentiment.neutral}%` }} />
            <span className="bg-bad" style={{ width: `${a.sentiment.negative}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-2">
            Positive {a.sentiment.positive}% · neutral {a.sentiment.neutral}% · negative {a.sentiment.negative}%
          </p>
          <p className="mt-3 text-[13px]">
            <b className="tabular-nums">{a.questionShare}%</b> ask questions · <b className="tabular-nums">{a.buyingShare}%</b> show buying interest
          </p>
        </div>
        <div className={cx("rounded-2xl p-4 sm:p-5", a.spamShare > 15 ? "bg-bad-soft ring-1 ring-bad/20" : "bg-surface ring-1 ring-line")}>
          <p className="mb-1 text-[13px] font-semibold">Bots and spam</p>
          <p className={cx("text-3xl font-bold tabular-nums tracking-tight", a.spamShare > 15 && "text-bad")}>{a.spamShare}%</p>
          <p className="mt-1 text-xs text-ink-2">
            of comments look like bots, promos or emoji floods{a.spamShare > 15 ? ". That's high: check the comments before booking." : "."}
          </p>
        </div>
      </div>
      {a.themes.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <p className="mb-2 text-[13px] font-semibold">What people keep talking about</p>
          <div className="flex flex-wrap gap-1.5">
            {a.themes.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-[13px] ring-1 ring-line">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          From {a.comments} comments on their latest {a.posts} posts, read {formatDate(a.readAt)}
          {a.byAI < a.comments ? ` (${a.comments - a.byAI} read by plain rules)` : ""}. Estimates from commenters, not platform data.
          {a.note ? ` ${a.note}` : ""}
        </span>
        {button}
      </div>
      {problem && (
        <p role="alert" className="text-xs text-bad">
          {problem}
        </p>
      )}
    </div>
  );
}
