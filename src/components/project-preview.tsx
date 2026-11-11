"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatFull, formatNumber, formatPercent } from "@/lib/format";
import { platformName } from "@/lib/platforms";
import {
  attentionItems,
  checkpoint,
  creatorState,
  CREATOR_STATES,
  dayDate,
  matchLinks,
  projectTotals,
  type CreatorState,
  type ProjectTotals,
  type SampleCreator,
  type SampleProject,
} from "@/lib/projects-sample";
import { Icon } from "./icons";
import { buttonClass, Card, cx, SectionHeader } from "./ui";

/* ── Design preview banner ───────────────────────────────────── */

export function PreviewBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-info/40 bg-info-soft px-3.5 py-2.5 text-[13px] text-info sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <Icon name="info" size={16} className="mt-0.5 shrink-0" />
        <span>
          <b className="font-semibold">Design preview.</b> Made-up sample campaigns, not saved anywhere. Nothing here is a real client or creator.
        </span>
      </p>
      {children}
    </div>
  );
}

/* ── Verdict words ───────────────────────────────────────────── */

export function verdictText(t: ProjectTotals, p: SampleProject): { tone: "good" | "warn" | "bad" | "none"; label: string; line: string } {
  switch (t.verdict) {
    case "met":
      return { tone: "good", label: "Guarantee met", line: `${formatNumber(t.views - p.guarantee)} views over the ${formatNumber(p.guarantee)} promised.` };
    case "ahead":
      return { tone: "good", label: "Ahead of pace", line: `${formatNumber(t.gap)} views ahead of where we should be on day ${p.today}.` };
    case "on-track":
      return { tone: "good", label: "On track", line: `Within ${formatNumber(Math.abs(t.gap))} views of today's pace.` };
    case "behind":
      return { tone: "bad", label: "Behind pace", line: `${formatNumber(-t.gap)} views short of where we should be on day ${p.today}.` };
    default:
      return { tone: "none", label: "Not started", line: `Starts ${dayDate(p, 1)}. ${p.creators.length} creators lined up.` };
  }
}

const TONE_TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad", none: "text-muted" };
const TONE_SOFT = { good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", none: "bg-surface-2 text-muted" };

/* ── Signature: the guarantee pace bar ───────────────────────── */

export function PaceBar({ p, t, size = "lg" }: { p: SampleProject; t: ProjectTotals; size?: "lg" | "sm" }) {
  // The bar runs to the guarantee, or further when the campaign has gone past it.
  const max = Math.max(p.guarantee, t.views) * (size === "lg" ? 1.04 : 1);
  const fill = (t.views / max) * 100;
  const pace = (t.pace / max) * 100;
  const goal = (p.guarantee / max) * 100;
  const v = verdictText(t, p);
  const h = size === "lg" ? "h-5" : "h-2";
  return (
    <div className="w-full">
      <div
        className={cx("relative w-full rounded-full bg-surface-2 ring-1 ring-inset ring-line", h)}
        role="img"
        aria-label={`${formatFull(t.views)} views of ${formatFull(p.guarantee)} guaranteed. ${v.label}.`}
      >
        <div className={cx("absolute inset-y-0 left-0 rounded-full", "bg-accent")} style={{ width: `${fill}%` }} />
        {t.verdict !== "not-started" && t.verdict !== "met" && (
          <div className="absolute -inset-y-1.5 w-0.5 rounded-full bg-ink" style={{ left: `calc(${pace}% - 1px)` }} aria-hidden />
        )}
        {size === "lg" && goal < 100 && <div className="absolute -inset-y-1.5 w-px bg-line-strong" style={{ left: `${goal}%` }} aria-hidden />}
      </div>
      {size === "lg" && (
        <div className="relative mt-2 h-5 text-xs text-muted" aria-hidden>
          {t.verdict !== "not-started" && t.verdict !== "met" && (
            <span className="absolute whitespace-nowrap font-medium text-ink" style={{ left: `${pace}%`, transform: `translateX(${pace > 70 ? "-100%" : "-50%"})` }}>
              Today&apos;s pace {formatNumber(t.pace)}
            </span>
          )}
          <span className="absolute right-0">Guarantee {formatNumber(p.guarantee)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Header + guarantee panel + attention ────────────────────── */

export function ProjectSummary({ p }: { p: SampleProject }) {
  const t = useMemo(() => projectTotals(p), [p]);
  const v = verdictText(t, p);
  const attention = useMemo(() => attentionItems(p), [p]);
  const numbers: { label: string; value: string; note?: string }[] = [
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
              <span className={cx("h-2.5 w-2.5 rounded-full", { good: "bg-good", warn: "bg-warn", bad: "bg-bad", none: "bg-muted" }[v.tone])} aria-hidden />
              {v.label}
            </p>
            <p className="mt-0.5 text-sm text-ink-2">{v.line}</p>
          </div>
          <p className="text-sm text-muted">
            <span className="text-2xl font-semibold leading-none tracking-tight text-ink tabular-nums">{formatNumber(t.views)}</span> / {formatNumber(p.guarantee)} views
          </p>
        </div>
        <div className="mt-5">
          <PaceBar p={p} t={t} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-5">
          {numbers.map((n) => (
            <div key={n.label}>
              <dt className="text-[13px] font-medium text-muted">{n.label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{n.value}</dd>
            </div>
          ))}
        </dl>
        <Cadence p={p} t={t} />
      </Card>
      <Card className="flex flex-col p-5">
        <SectionHeader title="Needs attention" description={attention.length ? `${attention.length} ${attention.length === 1 ? "thing" : "things"} to chase` : undefined} />
        {attention.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-good">
            <Icon name="check" size={16} /> Nothing to chase right now.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {attention.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start gap-2.5 py-2.5">
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.tone === "bad" ? "bg-bad" : "bg-warn")} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    <span className="sr-only">{a.tone === "bad" ? "Problem: " : "Check: "}</span>
                    {a.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {attention.length > 6 && <p className="mt-2 text-xs text-muted">and {attention.length - 6} more</p>}
      </Card>
    </div>
  );
}

/** Posts per day across the window: what went up, and what's still due. */
function Cadence({ p, t }: { p: SampleProject; t: ProjectTotals }) {
  const max = Math.max(1, ...t.postsByDay.map((n, i) => n + t.dueByDay[i]));
  const lateCount = p.creators.filter((c) => creatorState(c, p.today) === "late").length;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">Posting cadence</p>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ink" aria-hidden /> Posted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-dashed border-muted" aria-hidden /> Still due
          </span>
          {lateCount > 0 && <span className="text-bad">{lateCount} late</span>}
        </p>
      </div>
      <div className="mt-3 flex h-14 items-end gap-[3px]" role="img" aria-label={`${t.posts} posts so far over ${Math.min(p.today, p.days)} days; ${t.dueByDay.reduce((a, b) => a + b, 0)} still due.`}>
        {t.postsByDay.map((n, i) => {
          const due = t.dueByDay[i];
          const isToday = i + 1 === p.today;
          return (
            <div key={i} className="relative flex h-full flex-1 flex-col justify-end" title={`${dayDate(p, i + 1)}: ${n} posted${due ? `, ${due} due` : ""}`}>
              {due > 0 && <div className="w-full rounded-t-[3px] border border-b-0 border-dashed border-muted/70" style={{ height: `${(due / max) * 100}%` }} />}
              {n > 0 && <div className="w-full rounded-t-[3px] bg-ink" style={{ height: `${(n / max) * 100}%` }} />}
              <div className={cx("mt-0.5 h-0.5 w-full", isToday ? "bg-accent" : "bg-line")} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{dayDate(p, 1)}</span>
        {p.today > 0 && p.today < p.days && <span className="font-medium text-accent-ink">Today, day {p.today}</span>}
        <span>{dayDate(p, p.days)}</span>
      </div>
    </div>
  );
}

/* ── Paste links ─────────────────────────────────────────────── */

export function PasteLinks({ p }: { p: SampleProject }) {
  const [text, setText] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const matches = useMemo(() => matchLinks(p, text), [p, text]);
  const example = useMemo(() => {
    const c = p.creators.find((x) => x.posts.length === 0 && x.platform === "tiktok") ?? p.creators.find((x) => x.posts.length === 0);
    return c ? (c.platform === "tiktok" ? `https://www.tiktok.com/@${c.handle}/video/7301` : `https://www.instagram.com/${c.handle}/reel/Cx12`) : "";
  }, [p]);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="md:w-56 md:shrink-0">
          <p className="font-semibold">Add post links</p>
          <p className="mt-0.5 text-sm text-muted">Paste as many as you have. We match each link to its creator.</p>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="paste-links" className="sr-only">
            Post links
          </label>
          <textarea
            id="paste-links"
            rows={text ? 3 : 1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setAdded(null);
            }}
            placeholder="Paste links from WhatsApp, email or the sheet…"
            className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {!text && example && (
            <button className="mt-1.5 text-xs font-medium text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => setText(example)}>
              Try a sample link
            </button>
          )}
          {matches.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-lg ring-1 ring-line">
              {matches.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-ink-2">{m.url}</span>
                  {m.creator ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">
                      <Icon name="check" size={12} /> {m.creator.name}
                    </span>
                  ) : (
                    <span className="rounded-md bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">No match: pick a creator</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {added !== null && <p className="mt-2 text-sm text-good">Preview only: {added} link{added === 1 ? "" : "s"} would be added and checked for numbers on day 1, 3 and 7.</p>}
        </div>
        <button
          className={cx(buttonClass.primary, "md:self-start")}
          disabled={matches.filter((m) => m.creator).length === 0}
          onClick={() => {
            setAdded(matches.filter((m) => m.creator).length);
            setText("");
          }}
        >
          Add links
        </button>
      </div>
    </Card>
  );
}

/* ── Shared creator bits ─────────────────────────────────────── */

function creatorViews(c: SampleCreator): number | null {
  const counted = c.posts.filter((x) => x.views !== null);
  return counted.length ? counted.reduce((s, x) => s + (x.views ?? 0), 0) : null;
}

function CreatorLine({ c }: { c: SampleCreator }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{c.name}</p>
      <p className="flex items-center gap-1 truncate text-xs text-muted">
        <Icon name={c.platform} size={12} />
        <span className="sr-only">{platformName(c.platform)}</span>@{c.handle} · {c.tier}
      </p>
    </div>
  );
}

const STATE_STYLE: Record<CreatorState, { dot: string; head: string }> = {
  waiting: { dot: "bg-muted", head: "text-ink-2" },
  late: { dot: "bg-bad", head: "text-bad" },
  posted: { dot: "bg-accent", head: "text-ink" },
  final: { dot: "bg-good", head: "text-good" },
};

/* ── Layout A: lanes ─────────────────────────────────────────── */

export function LanesView({ p }: { p: SampleProject }) {
  const groups = useMemo(() => {
    const g: Record<CreatorState, SampleCreator[]> = { waiting: [], late: [], posted: [], final: [] };
    p.creators.forEach((c) => g[creatorState(c, p.today)].push(c));
    return g;
  }, [p]);
  const order: CreatorState[] = ["late", "waiting", "posted", "final"];
  const [phoneLane, setPhoneLane] = useState<CreatorState>(groups.late.length ? "late" : "waiting");
  return (
    <div>
      {/* Phones: one lane at a time */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-lg bg-surface-2 p-0.5 ring-1 ring-line md:hidden" role="tablist" aria-label="Creator status">
        {order.map((k) => {
          const s = CREATOR_STATES.find((x) => x.key === k)!;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={phoneLane === k}
              onClick={() => setPhoneLane(k)}
              className={cx("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium", phoneLane === k ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2")}
            >
              {s.label} <span className="tabular-nums text-muted">{groups[k].length}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {order.map((k) => {
          const s = CREATOR_STATES.find((x) => x.key === k)!;
          return (
            <section key={k} className={cx("min-w-0 rounded-xl bg-surface-2/70 p-2 ring-1 ring-line", phoneLane !== k && "hidden md:block")} aria-label={s.label}>
              <header className="flex items-center justify-between px-2 pb-2 pt-1">
                <h3 className={cx("flex items-center gap-2 text-sm font-semibold", STATE_STYLE[k].head)}>
                  <span className={cx("h-2 w-2 rounded-full", STATE_STYLE[k].dot)} aria-hidden />
                  {s.label}
                </h3>
                <span className="text-xs tabular-nums text-muted">{groups[k].length}</span>
              </header>
              {groups[k].length === 0 ? (
                <p className="px-2 pb-3 text-xs text-muted">{k === "late" ? "Nobody is late." : "None yet."}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {groups[k].map((c) => {
                    const v = creatorViews(c);
                    return (
                      <li key={c.id} className={cx("rounded-lg border bg-surface p-3", k === "late" ? "border-bad/30" : "border-line")}>
                        <CreatorLine c={c} />
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted">
                            {k === "waiting" && `Due ${dayDate(p, c.dueDay)}`}
                            {k === "late" && <span className="font-medium text-bad">Was due {dayDate(p, c.dueDay)}</span>}
                            {(k === "posted" || k === "final") && `${c.posts.length} of ${c.postsAgreed} posted`}
                          </span>
                          {v !== null ? (
                            <span className="font-semibold tabular-nums">{formatNumber(v)} views</span>
                          ) : (
                            c.posts.length > 0 && <span className="font-medium text-warn">No numbers yet</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ── Layout B: calendar ──────────────────────────────────────── */

export function CalendarView({ p }: { p: SampleProject }) {
  const days = Array.from({ length: p.days }, (_, i) => i + 1);
  const rows = useMemo(() => [...p.creators].sort((a, b) => a.dueDay - b.dueDay), [p]);
  return (
    <>
      {/* Laptop: creators against the days of the window */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-[11px] text-muted">
                <th scope="col" className="sticky left-0 z-10 min-w-48 bg-surface-2 px-4 py-2 text-left text-[13px] font-medium">
                  Creator
                </th>
                {days.map((d) => (
                  <th key={d} scope="col" className={cx("min-w-7 px-0 py-2 text-center font-medium tabular-nums", d === p.today && "text-accent-ink")}>
                    {d}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2 text-right text-[13px] font-medium">
                  Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const state = creatorState(c, p.today);
                const v = creatorViews(c);
                return (
                  <tr key={c.id} className="hover:bg-surface-2/60">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2 text-left font-normal">
                      <CreatorLine c={c} />
                    </th>
                    {days.map((d) => {
                      const post = c.posts.find((x) => x.postedDay === d);
                      const due = d === c.dueDay;
                      return (
                        <td key={d} className={cx("h-11 p-0 text-center", d === p.today && "bg-accent-soft/60", d > p.today && "bg-surface-2/40")}>
                          {post ? (
                            <span
                              className={cx("mx-auto block h-3 w-3 rounded-full", post.views === null ? "border-2 border-warn bg-surface" : "bg-ink")}
                              title={`Posted ${dayDate(p, d)}${post.views === null ? ", no numbers yet" : `: ${formatFull(post.views)} views`}`}
                            />
                          ) : due ? (
                            <span
                              className={cx("mx-auto block h-3 w-3 rounded-full border-2", state === "late" ? "border-bad bg-bad-soft" : "border-muted")}
                              title={`Due ${dayDate(p, d)}${state === "late" ? ", not posted" : ""}`}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right tabular-nums">
                      {v !== null ? formatNumber(v) : state === "late" ? <span className="font-medium text-bad">Late</span> : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Posted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-warn" /> Posted, no numbers yet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-muted" /> Due
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-bad bg-bad-soft" /> Due, not posted
          </span>
        </div>
      </Card>
      {/* Phones: day by day */}
      <ol className="flex flex-col gap-2 md:hidden">
        {days
          .map((d) => ({ d, posted: p.creators.filter((c) => c.posts.some((x) => x.postedDay === d)), due: p.creators.filter((c) => c.dueDay === d && c.posts.length === 0) }))
          .filter((x) => x.posted.length || x.due.length)
          .map(({ d, posted, due }) => (
            <li key={d}>
              <Card className={cx("p-3", d === p.today && "ring-2 ring-accent/40")}>
                <p className="text-sm font-semibold">
                  {dayDate(p, d)} <span className="font-normal text-muted">· day {d}</span>
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {posted.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <Icon name={c.platform} size={13} className="shrink-0 text-muted" /> {c.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-2">{formatNumber(creatorViews(c))} views</span>
                    </li>
                  ))}
                  {due.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
                        <Icon name={c.platform} size={13} className="shrink-0 text-muted" /> {c.name}
                      </span>
                      <span className={cx("shrink-0 text-xs font-medium", d < p.today ? "text-bad" : "text-muted")}>{d < p.today ? "Late" : "Due"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
      </ol>
    </>
  );
}

/* ── Layout C: posts ─────────────────────────────────────────── */

export function PostsView({ p }: { p: SampleProject }) {
  const [filter, setFilter] = useState<"all" | "problems">("all");
  const posts = useMemo(() => {
    const rows = p.creators.flatMap((c) => c.posts.map((post) => ({ c, post, er: post.views && post.engagements !== null ? post.engagements / post.views : null })));
    const problem = (r: (typeof rows)[number]) => r.post.views === null || (r.er !== null && r.er < 0.03 && p.today - r.post.postedDay >= 3);
    const sorted = rows.sort((a, b) => Number(problem(b)) - Number(problem(a)) || (b.post.views ?? 0) - (a.post.views ?? 0));
    return { all: sorted, problems: sorted.filter(problem), problem };
  }, [p]);
  const list = filter === "all" ? posts.all : posts.problems;
  if (posts.all.length === 0) {
    return (
      <Card className="border-dashed px-6 py-12 text-center shadow-none">
        <p className="font-semibold">No posts yet</p>
        <p className="mt-1 text-sm text-ink-2">Links appear here as creators post. Paste them above when they come in.</p>
      </Card>
    );
  }
  return (
    <div>
      <div className="mb-3 flex gap-2" role="group" aria-label="Filter posts">
        {(["all", "problems"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cx("h-7 rounded-lg px-2.5 text-[13px] font-medium ring-1 transition-colors", filter === f ? "bg-brand text-brand-ink ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-surface-2")}
          >
            {f === "all" ? `All posts ${posts.all.length}` : `Needs a look ${posts.problems.length}`}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map(({ c, post, er }) => {
          const problem = posts.problem({ c, post, er });
          return (
            <li key={post.id}>
              <Card className={cx("flex h-full flex-col p-4", problem && "border-warn/40")}>
                <div className="flex items-start justify-between gap-3">
                  <CreatorLine c={c} />
                  <span className={cx("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", post.views === null ? TONE_SOFT.warn : "bg-surface-2 text-ink-2 ring-1 ring-line")}>
                    {checkpoint(post, p.today)}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Views</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(post.views)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Engagements</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(post.engagements)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">ER by views</dt>
                    <dd className={cx("font-semibold tabular-nums", er !== null && er < 0.03 && "text-warn")}>{er === null ? "—" : formatPercent(er)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
                  <span>Posted {dayDate(p, post.postedDay)}</span>
                  <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                    Open post <Icon name="link" size={12} />
                  </a>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Projects index row ──────────────────────────────────────── */

export function ProjectRow({ p }: { p: SampleProject }) {
  const t = projectTotals(p);
  const v = verdictText(t, p);
  const attention = attentionItems(p).length;
  const status = p.today === 0 ? "Upcoming" : p.today >= p.days ? "Finished" : `Day ${p.today} of ${p.days}`;
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="group block bg-surface px-4 py-3 transition-colors duration-100 hover:bg-surface-2">
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_auto]">
          <div className="min-w-0">
            <p className="truncate font-semibold group-hover:underline">{p.name}</p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {p.client} · Chorus {p.type} · {status}
            </p>
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className={cx("font-medium", TONE_TEXT[v.tone])}>{v.label}</span>
              <span className="tabular-nums text-muted">
                <b className="font-semibold text-ink">{formatNumber(t.views)}</b> / {formatNumber(p.guarantee)} views
              </span>
            </div>
            <PaceBar p={p} t={t} size="sm" />
          </div>
          <div className="flex items-center gap-3 text-sm md:justify-end">
            {attention > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-bad-soft px-2 py-1 text-xs font-semibold text-bad">
                <Icon name="alert" size={12} /> {attention} to chase
              </span>
            ) : (
              <span className="text-xs text-muted">{p.creators.length} creators</span>
            )}
            <Icon name="back" size={16} className="rotate-180 text-muted" />
          </div>
        </div>
      </Link>
    </li>
  );
}
