"use client";
import { useEffect, useMemo, useState } from "react";
import { bestDay, consistency, topPosts, whatWorks, type Finding } from "@/lib/dialect-insights";
import { countedEngagements, countedViews, FORMAT_LABEL, monthName, platformLabel, type DialectPlatform, type DialectProject } from "@/lib/dialect";
import { formatFull, formatNumber, formatPercent } from "@/lib/format";
import { shortDate } from "@/lib/projects";
import { IS_LIVE } from "@/lib/supabase/config";
import { Icon } from "../icons";
import { Card, cx, SectionHeader } from "../ui";
import { VMark } from "../voice";
import { Segmented } from "./bits";

/** What V wrote for each set of findings this visit, so switching months back and forth doesn't ask again. */
const written = new Map<string, { title: string; line: string }[]>();

/** The month's insights: what's working and what's not, best day to post, posting consistency and top posts. */
export function MonthInsights({ p, month, today }: { p: DialectProject; month: string; today: string }) {
  const findings = useMemo(() => whatWorks(p, month, today), [p, month, today]);
  const days = useMemo(() => bestDay(p, month, today), [p, month, today]);
  const steady = consistency(p, month, today);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Working p={p} findings={findings} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <BestDay days={days} />
          <Consistency c={steady} month={month} />
        </div>
      </div>
      <TopPosts p={p} month={month} />
    </div>
  );
}

/* ── What's working, what's not ─────────────────────────────────── */

function Working({ p, findings }: { p: DialectProject; findings: Finding[] }) {
  const key = JSON.stringify([p.id, findings.map((f) => [f.title, f.detail])]);
  const [words, setWords] = useState(() => written.get(key) ?? null);
  useEffect(() => {
    setWords(written.get(key) ?? null);
    if (!IS_LIVE || !findings.length || written.has(key)) return;
    let live = true;
    fetch("/api/dialect/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: p.brand, findings: findings.map(({ kind, title, detail }) => ({ kind, title, detail })) }),
      signal: AbortSignal.timeout(12_000),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: { title: string; line: string }[] }>) : null))
      .then((b) => {
        if (!b || b.items.length !== findings.length) return;
        written.set(key, b.items);
        if (live) setWords(b.items);
      })
      .catch(() => undefined); // Slow or offline: the plain findings stay.
    return () => {
      live = false;
    };
  }, [key, findings, p.brand]);

  const shown = findings.map((f, i) => ({ ...f, title: words?.[i]?.title ?? f.title, line: words?.[i]?.line ?? f.detail }));
  const col = (kind: Finding["kind"]) => shown.filter((f) => f.kind === kind);
  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader title="What's working, what's not" description="The last 90 days. Each post is measured against its own platform's usual views." />
      {findings.length === 0 ? (
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-3 text-[13px] text-ink-2">
          Nothing stands out yet. This needs at least 4 posts with views in the last 90 days, and a content type, purpose, format or time of day that does
          clearly better or worse than usual.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {(["working", "not"] as const).map((kind) => (
            <div key={kind}>
              <p className={cx("mb-2 text-xs font-semibold", kind === "working" ? "text-good" : "text-bad")}>
                {kind === "working" ? "Working" : "Not working"}
              </p>
              {col(kind).length ? (
                <ul className="space-y-3">
                  {col(kind).map((f) => (
                    <li key={f.title + f.detail} className="flex gap-3">
                      <span
                        className={cx(
                          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                          kind === "working" ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
                        )}
                        aria-hidden
                      >
                        <Icon name={kind === "working" ? "check" : "close"} size={13} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold leading-snug">{f.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{f.line}</span>
                        <span className="mt-1 block text-xs tabular-nums text-muted">
                          {f.ratio.toFixed(1)}× usual views · {f.posts} posts
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">{kind === "working" ? "Nothing clearly above usual." : "Nothing clearly below usual."}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {words && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <VMark size={18} /> Written up by V from these numbers. The numbers are the app&apos;s own.
        </p>
      )}
    </Card>
  );
}

/* ── Best day to post ───────────────────────────────────────────── */

function BestDay({ days }: { days: ReturnType<typeof bestDay> }) {
  const top = Math.max(...days.bars.map((b) => b.avg ?? 0), 1);
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">Best day to post</p>
      <p className="text-xs text-muted">Average views per post, last 90 days</p>
      {days.best === null ? (
        <p className="mt-3 text-[13px] text-muted">Not enough posts with views yet.</p>
      ) : (
        <>
          <div className="mt-3 flex h-28 items-end gap-1.5 pt-5" role="img" aria-label={`Best day: ${days.bars[days.best].day}`}>
            {days.bars.map((b, i) => (
              <span
                key={b.day}
                className={cx("cr-grow-y relative block flex-1 rounded-t-md", i === days.best ? "bg-brand" : b.avg ? "bg-line-strong" : "bg-line")}
                style={{ height: `${Math.max(4, ((b.avg ?? 0) / top) * 100)}%`, animationDelay: `${i * 40}ms` }}
                title={b.avg ? `${b.day}: ${formatNumber(b.avg)} average over ${b.posts} posts` : `${b.day}: no posts`}
              >
                {i === days.best && (
                  <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] font-semibold tabular-nums">{formatNumber(b.avg!)}</span>
                )}
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5">
            {days.bars.map((b, i) => (
              <span key={b.day} className={cx("flex-1 text-center text-[11px]", i === days.best ? "font-semibold text-ink" : "text-muted")}>
                {b.day}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* ── Posting consistency ─────────────────────────────────────────── */

function Consistency({ c, month }: { c: ReturnType<typeof consistency>; month: string }) {
  const share = c.target ? Math.min(1, c.done / c.target) : 0;
  const onPace = c.done >= c.expected;
  // A half circle: radius 70, length π·70.
  const len = Math.PI * 70;
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">Posting consistency</p>
      <p className="text-xs text-muted">{monthName(month)} posts against the target</p>
      {c.target ? (
        <div className="relative mx-auto mt-2 w-[180px]">
          <svg viewBox="0 0 180 100" className="w-full" aria-hidden>
            <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="var(--color-line)" strokeWidth="14" strokeLinecap="round" />
            <path
              d="M20 90 A70 70 0 0 1 160 90"
              fill="none"
              stroke={onPace ? "var(--color-brand)" : "var(--color-accent)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${share * len} ${len}`}
              className="transition-[stroke-dasharray] duration-700"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{Math.round(share * 100)}%</p>
            <p className="text-xs tabular-nums text-muted">
              {c.done} of {c.target} posts
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted">No posts target set for this month.</p>
      )}
      {c.target > 0 && c.expected > 0 && c.expected < c.target && (
        <p className={cx("mt-2 text-center text-xs", onPace ? "text-good" : "text-warn")}>
          {onPace ? "On pace" : `${c.expected - c.done} behind`}: about {c.expected} by today
        </p>
      )}
    </Card>
  );
}

/* ── Top posts per platform ──────────────────────────────────────── */

function TopPosts({ p, month }: { p: DialectProject; month: string }) {
  const [platform, setPlatform] = useState<DialectPlatform>(p.platforms[0]?.platform ?? "instagram");
  const rows = topPosts(p, month, platform);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3 sm:px-5">
        <SectionHeader title={`Top posts, ${monthName(month)}`} description="By views that count towards the target." />
        <Segmented
          value={platform}
          options={p.platforms.map((x) => ({ id: x.platform, label: platformLabel(x.platform) }))}
          onChange={setPlatform}
          label="Platform"
        />
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-center text-[13px] text-muted sm:px-5">No {platformLabel(platform)} posts this month yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="w-10 py-2 pl-4 font-medium sm:pl-5">#</th>
                <th className="px-3 py-2 font-medium">Post</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
                <th className="py-2 pl-3 pr-4 text-right font-medium sm:pr-5">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((x, i) => {
                const v = countedViews(x);
                return (
                  <tr key={x.id}>
                    <td className="py-2.5 pl-4 font-semibold tabular-nums text-accent-ink sm:pl-5">{i + 1}</td>
                    <td className="max-w-[320px] px-3 py-2.5">
                      <a href={x.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                        {x.title || "Untitled post"}
                      </a>
                      <span className="text-xs text-muted">
                        {shortDate(x.postedAt.slice(0, 10))}
                        {x.contentType ? ` · ${x.contentType}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{FORMAT_LABEL[x.format]}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{x.views === null && !x.organic ? "—" : formatFull(v)}</td>
                    <td className="py-2.5 pl-3 pr-4 text-right tabular-nums sm:pr-5">{v ? formatPercent(countedEngagements(x) / v) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
