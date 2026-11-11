"use client";
import { useMemo } from "react";
import { formatFull, formatNumber, formatPercent } from "@/lib/format";
import { addDays, attentionItems, creatorState, projectTotals, shortDate, type AttentionItem, type ProjectTotals } from "@/lib/projects";
import type { Creator, Project } from "@/lib/types";
import { Icon } from "../icons";
import { Card, cx, SectionHeader } from "../ui";

type Tone = "good" | "warn" | "bad" | "none";
export const TONE_TEXT: Record<Tone, string> = { good: "text-good", warn: "text-warn", bad: "text-bad", none: "text-muted" };
const TONE_DOT: Record<Tone, string> = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", none: "bg-muted" };

/** The guarantee verdict in words. */
export function verdictText(t: ProjectTotals, p: Project): { tone: Tone; label: string; line: string } {
  const g = p.guarantee ?? 0;
  switch (t.verdict) {
    case "met":
      return { tone: "good", label: "Guarantee met", line: `${formatNumber(t.views - g)} views over the ${formatNumber(g)} promised.` };
    case "ahead":
      return { tone: "good", label: "Ahead of pace", line: `${formatNumber(t.gap)} views ahead of where we should be on day ${t.window.today}.` };
    case "on-track":
      return { tone: "good", label: "On track", line: `Within ${formatNumber(Math.abs(t.gap))} views of today's pace.` };
    case "behind":
      return {
        tone: "bad",
        label: t.window.today >= t.window.days ? "Guarantee missed" : "Behind pace",
        line:
          t.window.today >= t.window.days
            ? `${formatNumber(g - t.views)} views short of the ${formatNumber(g)} promised.`
            : `${formatNumber(-t.gap)} views short of where we should be on day ${t.window.today}.`,
      };
    case "not-started": {
      const firstDue = p.creators
        .map((c) => c.dueDate)
        .filter((d): d is string => !!d)
        .sort()[0];
      const booked = `${p.creators.length} ${p.creators.length === 1 ? "creator" : "creators"} booked.`;
      if (t.window.today === 0) return { tone: "none", label: "Not started", line: `Starts ${shortDate(p.startDate)}. ${booked}` };
      return {
        tone: "none",
        label: "No posts due yet",
        line: firstDue ? `First posts are due ${shortDate(firstDue)}. ${booked}` : `Add creators with due dates to track pace.`,
      };
    }
    default:
      return { tone: "none", label: "No views guarantee set", line: "Add the guarantee from the contract to track pace (Edit project)." };
  }
}

/** Views so far in orange, a black notch for today's pace, the guarantee at the end. */
export function PaceBar({ p, t, size = "lg" }: { p: Project; t: ProjectTotals; size?: "lg" | "sm" }) {
  const g = p.guarantee ?? 0;
  const max = Math.max(g, t.views, 1) * (size === "lg" ? 1.04 : 1);
  const fill = (t.views / max) * 100;
  const pace = (t.pace / max) * 100;
  const goal = (g / max) * 100;
  const showPace = g > 0 && t.verdict !== "not-started" && t.verdict !== "met" && t.window.today < t.window.days;
  const v = verdictText(t, p);
  return (
    <div className="w-full">
      <div
        className={cx("relative w-full rounded-full bg-surface-2 ring-1 ring-inset ring-line", size === "lg" ? "h-4" : "h-2")}
        role="img"
        aria-label={g ? `${formatFull(t.views)} views of ${formatFull(g)} guaranteed. ${v.label}.` : `${formatFull(t.views)} views so far.`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, fill)}%` }} />
        {showPace && <div className="absolute -inset-y-1.5 w-0.5 rounded-full bg-ink" style={{ left: `calc(${pace}% - 1px)` }} aria-hidden />}
        {size === "lg" && g > 0 && goal < 100 && <div className="absolute -inset-y-1.5 w-px bg-line-strong" style={{ left: `${goal}%` }} aria-hidden />}
      </div>
      {size === "lg" && g > 0 && (
        <div className="relative mt-2 h-5 text-xs text-muted" aria-hidden>
          {showPace && (
            <span
              className="absolute whitespace-nowrap font-medium text-ink"
              style={{ left: `${pace}%`, transform: `translateX(${pace > 70 ? "-100%" : pace < 15 ? "0" : "-50%"})` }}
            >
              Today&apos;s pace {formatNumber(t.pace)}
            </span>
          )}
          <span className="absolute right-0">Guarantee {formatNumber(g)}</span>
        </div>
      )}
    </div>
  );
}

/** Guarantee panel, the five reported numbers, cadence, and what needs chasing. */
export function ProjectSummary({
  p,
  today,
  creators,
  onOpen,
}: {
  p: Project;
  today: string;
  creators: Map<string, Creator>;
  onOpen: (a: AttentionItem) => void;
}) {
  const t = useMemo(() => projectTotals(p, today), [p, today]);
  const v = verdictText(t, p);
  const attention = useMemo(() => attentionItems(p, today, (id) => creators.get(id)?.name ?? "A creator"), [p, today, creators]);
  const numbers = [
    { label: "Views", value: formatNumber(t.views) },
    { label: "Engagements", value: formatNumber(t.engagements) },
    { label: "ER by views", value: t.erByViews === null ? "—" : formatPercent(t.erByViews) },
    { label: "Posts", value: `${t.posts} of ${t.postsAgreed}` },
    { label: "Creators", value: `${t.creators}` },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className={cx("flex items-center gap-2 text-base font-semibold", TONE_TEXT[v.tone])}>
              <span className={cx("h-2.5 w-2.5 rounded-full", TONE_DOT[v.tone])} aria-hidden />
              {v.label}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-2">{v.line}</p>
          </div>
          <p className="text-[13px] text-muted">
            <span className="text-2xl font-semibold leading-none tracking-tight text-ink tabular-nums">{formatNumber(t.views)}</span>
            {p.guarantee ? ` / ${formatNumber(p.guarantee)} views` : " views"}
          </p>
        </div>
        <div className="mt-4">
          <PaceBar p={p} t={t} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-5">
          {numbers.map((n) => (
            <div key={n.label}>
              <dt className="text-xs font-medium text-muted">{n.label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{n.value}</dd>
            </div>
          ))}
        </dl>
        <Cadence p={p} t={t} today={today} />
      </Card>
      <Card className="flex flex-col p-4 sm:p-5">
        <SectionHeader
          title="Needs attention"
          description={attention.length ? `${attention.length} ${attention.length === 1 ? "thing" : "things"} to chase` : undefined}
        />
        {attention.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-good">
            <Icon name="check" size={16} /> Nothing to chase right now.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {attention.slice(0, 7).map((a) => (
              <li key={a.id}>
                <button onClick={() => onOpen(a)} className="flex w-full items-start gap-2.5 rounded-md py-2 text-left transition-colors hover:bg-surface-2">
                  <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.tone === "bad" ? "bg-bad" : "bg-warn")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{a.title}</span>
                    <span className="block text-xs text-muted">
                      <span className="sr-only">{a.tone === "bad" ? "Problem: " : "Check: "}</span>
                      {a.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {attention.length > 7 && <p className="mt-2 text-xs text-muted">and {attention.length - 7} more</p>}
      </Card>
    </div>
  );
}

function Cadence({ p, t, today }: { p: Project; t: ProjectTotals; today: string }) {
  const max = Math.max(1, ...t.postsByDay.map((n, i) => n + t.dueByDay[i]));
  const late = p.creators.filter((c) => creatorState(p, c, today) === "late").length;
  const due = t.dueByDay.reduce((a, b) => a + b, 0);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted">Posting cadence</p>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ink" aria-hidden /> Posted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-dashed border-muted" aria-hidden /> Still due
          </span>
          {late > 0 && <span className="font-medium text-bad">{late} late</span>}
        </p>
      </div>
      <div className="mt-3 flex h-14 items-end gap-[3px]" role="img" aria-label={`${t.posts} posts so far; ${due} still due.`}>
        {t.postsByDay.map((n, i) => {
          const d = t.dueByDay[i];
          const isToday = i + 1 === t.window.today && t.window.today < t.window.days;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 flex-col justify-end"
              title={`${shortDate(addDays(p.startDate, i))}: ${n} posted${d ? `, ${d} due` : ""}`}
            >
              {d > 0 && <div className="w-full rounded-t-[3px] border border-b-0 border-dashed border-muted/70" style={{ height: `${(d / max) * 100}%` }} />}
              {n > 0 && <div className="w-full rounded-t-[3px] bg-ink" style={{ height: `${(n / max) * 100}%` }} />}
              <div className={cx("mt-0.5 h-0.5 w-full", isToday ? "bg-accent" : "bg-line")} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{shortDate(p.startDate)}</span>
        {t.window.today > 0 && t.window.today < t.window.days && <span className="font-medium text-accent-ink">Today, day {t.window.today}</span>}
        <span>{shortDate(p.endDate)}</span>
      </div>
    </div>
  );
}
