"use client";
import { useMemo, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatFull, formatNumber } from "@/lib/format";
import { searchSaved } from "@/lib/people";
import { platformName } from "@/lib/platforms";
import { addDays, creatorState, CREATOR_STATES, daysBetween, postNumbers, postsBy, projectWindow, shortDate, type CreatorState } from "@/lib/projects";
import type { Creator, Project, ProjectCreator } from "@/lib/types";
import { Icon } from "../icons";
import { Avatar, buttonClass, Card, CreatorLink, cx, EmptyState, inputClass, labelClass, tabClass, tabCountClass } from "../ui";

type Layout = "lanes" | "calendar" | "roster";
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: "lanes", label: "Lanes" },
  { id: "calendar", label: "Calendar" },
  { id: "roster", label: "Roster" },
];

function viewsOf(p: Project, creatorId: string): number | null {
  const counted = postsBy(p, creatorId)
    .map((x) => postNumbers(x).views)
    .filter((v): v is number => v !== null);
  return counted.length ? counted.reduce((a, b) => a + b, 0) : null;
}

function Who({ c }: { c: Creator }) {
  return (
    <CreatorLink id={c.id} className="flex min-w-0 items-center gap-2 rounded-md hover:underline">
      <Avatar name={c.name} photoUrl={c.photoUrl} size={26} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{c.name}</span>
        <span className="flex items-center gap-1 truncate text-xs text-muted">
          <Icon name={c.platform} size={11} />
          <span className="sr-only">{platformName(c.platform)}</span>@{c.handle}
        </span>
      </span>
    </CreatorLink>
  );
}

export function CreatorsView({ p, today, byId, allCreators }: { p: Project; today: string; byId: Map<string, Creator>; allCreators: Creator[] }) {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      return (localStorage.getItem("project-layout") as Layout) || "lanes";
    } catch {
      return "lanes";
    }
  });
  const [adding, setAdding] = useState(p.creators.length === 0);
  const pick = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem("project-layout", l);
    } catch {}
  };
  const rows = p.creators.filter((pc) => byId.has(pc.creatorId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg bg-surface-2 p-0.5 ring-1 ring-line" role="radiogroup" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={layout === l.id}
              onClick={() => pick(l.id)}
              className={cx(
                "h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                layout === l.id ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button className={adding ? buttonClass.secondary : buttonClass.primary} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          <Icon name={adding ? "close" : "plus"} size={15} /> {adding ? "Done adding" : "Add creators"}
        </button>
      </div>

      {adding && <AddCreators p={p} allCreators={allCreators} today={today} />}

      {rows.length === 0 ? (
        !adding && <EmptyState title="No creators booked yet" body="Add the creators on this campaign, with the date each one's first post is due." />
      ) : layout === "lanes" ? (
        <Lanes p={p} today={today} byId={byId} rows={rows} />
      ) : layout === "calendar" ? (
        <Calendar p={p} today={today} byId={byId} rows={rows} />
      ) : (
        <Roster p={p} today={today} byId={byId} rows={rows} />
      )}
    </div>
  );
}

/* ── Adding creators ─────────────────────────────────────────── */

function AddCreators({ p, allCreators, today }: { p: Project; allCreators: Creator[]; today: string }) {
  const [q, setQ] = useState("");
  const [due, setDue] = useState(p.startDate > today ? p.startDate : today);
  const [count, setCount] = useState(1);
  const booked = new Set(p.creators.map((c) => c.creatorId));
  const matches = useMemo(() => searchSaved(allCreators, q, 8), [allCreators, q]);
  const add = (c: Creator) => actions.upsertProjectCreators(p.id, [{ creatorId: c.id, dueDate: due, postsAgreed: count }]);
  return (
    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_110px]">
        <label>
          <span className={labelClass}>Find a saved creator</span>
          <span className="relative block">
            <Icon name="search" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className={cx(inputClass, "pl-8")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or handle" autoFocus />
          </span>
        </label>
        <label>
          <span className={labelClass}>First post due</span>
          <input type="date" className={inputClass} value={due} min={p.startDate} max={p.endDate} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Posts agreed</span>
          <input type="number" min={1} max={20} className={inputClass} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
        </label>
      </div>
      {q.trim().length >= 2 && (
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {matches.length === 0 && (
            <li className="px-3 py-2.5 text-[13px] text-muted">No saved creator matches. Look them up on Add creators first, then add them here.</li>
          )}
          {matches.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={c.name} photoUrl={c.photoUrl} size={26} />
                <span className="min-w-0 text-[13px]">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Icon name={c.platform} size={11} /> @{c.handle} · {formatNumber(c.followers)}
                  </span>
                </span>
              </span>
              {booked.has(c.id) ? (
                <span className="inline-flex items-center gap-1 text-xs text-good">
                  <Icon name="check" size={12} /> On this project
                </span>
              ) : (
                <button className={buttonClass.secondary} onClick={() => add(c)}>
                  <Icon name="plus" size={14} /> Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Lanes ───────────────────────────────────────────────────── */

const STATE_STYLE: Record<CreatorState, { dot: string; head: string }> = {
  waiting: { dot: "bg-muted", head: "text-ink-2" },
  late: { dot: "bg-bad", head: "text-bad" },
  posted: { dot: "bg-accent", head: "text-ink" },
  final: { dot: "bg-good", head: "text-good" },
};

type ViewProps = { p: Project; today: string; byId: Map<string, Creator>; rows: ProjectCreator[] };

function Lanes({ p, today, byId, rows }: ViewProps) {
  const groups = useMemo(() => {
    const g: Record<CreatorState, ProjectCreator[]> = { waiting: [], late: [], posted: [], final: [] };
    for (const pc of rows) g[creatorState(p, pc, today)].push(pc);
    g.waiting.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    return g;
  }, [p, rows, today]);
  const [phoneLane, setPhoneLane] = useState<CreatorState>(groups.late.length ? "late" : "waiting");
  return (
    <div>
      <div className="mb-3 flex gap-5 overflow-x-auto border-b border-line md:hidden" role="tablist" aria-label="Creator status">
        {CREATOR_STATES.map((s) => (
          <button key={s.id} role="tab" aria-selected={phoneLane === s.id} onClick={() => setPhoneLane(s.id)} className={tabClass(phoneLane === s.id)}>
            {s.label} <span className={tabCountClass}>{groups[s.id].length}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {CREATOR_STATES.map((s) => (
          <section
            key={s.id}
            className={cx("min-w-0 rounded-xl bg-surface-2 p-1.5 ring-1 ring-line", phoneLane !== s.id && "hidden md:block")}
            aria-label={s.label}
          >
            <header className="flex items-center justify-between px-2 pb-1.5 pt-1">
              <h3 className={cx("flex items-center gap-2 text-[13px] font-semibold", STATE_STYLE[s.id].head)}>
                <span className={cx("h-2 w-2 rounded-full", STATE_STYLE[s.id].dot)} aria-hidden />
                {s.label}
              </h3>
              <span className="text-xs tabular-nums text-muted">{groups[s.id].length}</span>
            </header>
            {groups[s.id].length === 0 ? (
              <p className="px-2 pb-2 text-xs text-muted">{s.id === "late" ? "Nobody is late." : "None yet."}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {groups[s.id].map((pc) => {
                  const c = byId.get(pc.creatorId)!;
                  const posts = postsBy(p, pc.creatorId);
                  const v = viewsOf(p, pc.creatorId);
                  return (
                    <li key={pc.creatorId} className={cx("rounded-lg border bg-surface p-2.5", s.id === "late" ? "border-bad/30" : "border-line")}>
                      <Who c={c} />
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted">
                          {s.id === "waiting" && (pc.dueDate ? `Due ${shortDate(pc.dueDate)}` : "No due date")}
                          {s.id === "late" && pc.dueDate && <span className="font-medium text-bad">Was due {shortDate(pc.dueDate)}</span>}
                          {(s.id === "posted" || s.id === "final") && `${posts.length} of ${pc.postsAgreed} posted`}
                        </span>
                        {v !== null ? (
                          <span className="font-semibold tabular-nums">{formatNumber(v)} views</span>
                        ) : (
                          posts.length > 0 && <span className="font-medium text-warn">No numbers yet</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ── Calendar ────────────────────────────────────────────────── */

function Calendar({ p, today, byId, rows }: ViewProps) {
  const { days, today: todayN } = projectWindow(p, today);
  const dayList = Array.from({ length: days }, (_, i) => i + 1);
  const sorted = [...rows].sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
  const dayOf = (date: string | null) => (date ? daysBetween(p.startDate, date) + 1 : null);
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-2 text-[11px] text-muted">
                <th scope="col" className="sticky left-0 z-10 min-w-48 bg-surface-2 px-4 py-2 text-left text-xs font-medium">
                  Creator
                </th>
                {dayList.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className={cx("min-w-6 px-0 py-2 text-center font-medium tabular-nums", d === todayN && "text-accent-ink")}
                    title={shortDate(addDays(p.startDate, d - 1))}
                  >
                    {d}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium">
                  Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((pc) => {
                const c = byId.get(pc.creatorId)!;
                const state = creatorState(p, pc, today);
                const posts = postsBy(p, pc.creatorId);
                const v = viewsOf(p, pc.creatorId);
                const dueN = dayOf(pc.dueDate);
                return (
                  <tr key={pc.creatorId} className="hover:bg-surface-2/60">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-1.5 text-left font-normal">
                      <Who c={c} />
                    </th>
                    {dayList.map((d) => {
                      const post = posts.find((x) => dayOf(x.postedDate) === d);
                      return (
                        <td key={d} className={cx("h-10 p-0 text-center", d === todayN && "bg-accent-soft/60", d > todayN && "bg-surface-2/40")}>
                          {post ? (
                            <span
                              className={cx(
                                "mx-auto block h-3 w-3 rounded-full",
                                postNumbers(post).views === null ? "border-2 border-warn bg-surface" : "bg-ink",
                              )}
                              title={`Posted ${post.postedDate ? shortDate(post.postedDate) : ""}${postNumbers(post).views === null ? ", no numbers yet" : `: ${formatFull(postNumbers(post).views)} views`}`}
                            />
                          ) : d === dueN && posts.length === 0 ? (
                            <span
                              className={cx("mx-auto block h-3 w-3 rounded-full border-2", state === "late" ? "border-bad bg-bad-soft" : "border-muted")}
                              title={`Due ${pc.dueDate ? shortDate(pc.dueDate) : ""}${state === "late" ? ", not posted" : ""}`}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="px-4 py-1.5 text-right tabular-nums">
                      {v !== null ? (
                        formatNumber(v)
                      ) : state === "late" ? (
                        <span className="font-medium text-bad">Late</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-xs text-muted">
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
        {dayList
          .map((d) => {
            const date = addDays(p.startDate, d - 1);
            return {
              d,
              date,
              posted: p.posts.filter((x) => x.creatorId && x.postedDate === date),
              due: sorted.filter((pc) => pc.dueDate === date && postsBy(p, pc.creatorId).length === 0),
            };
          })
          .filter((x) => x.posted.length || x.due.length)
          .map(({ d, date, posted, due }) => (
            <li key={d}>
              <Card className={cx("p-3", d === todayN && "border-accent/60")}>
                <p className="text-[13px] font-semibold">
                  {shortDate(date)} <span className="font-normal text-muted">· day {d}</span>
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                  {posted.map((x) => {
                    const c = byId.get(x.creatorId!);
                    return (
                      <li key={x.id} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          {c && <Icon name={c.platform} size={13} className="shrink-0 text-muted" />} {c?.name ?? "Unknown"}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink-2">{formatNumber(postNumbers(x).views)} views</span>
                      </li>
                    );
                  })}
                  {due.map((pc) => {
                    const c = byId.get(pc.creatorId)!;
                    return (
                      <li key={pc.creatorId} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
                          <Icon name={c.platform} size={13} className="shrink-0 text-muted" /> {c.name}
                        </span>
                        <span className={cx("shrink-0 text-xs font-medium", date < today ? "text-bad" : "text-muted")}>{date < today ? "Late" : "Due"}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          ))}
      </ol>
    </>
  );
}

/* ── Roster: edit due dates and posts agreed ─────────────────── */

function Roster({ p, today, byId, rows }: ViewProps) {
  const label = Object.fromEntries(CREATOR_STATES.map((s) => [s.id, s.label])) as Record<CreatorState, string>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead className="border-b border-line bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th className="py-2 pl-4 pr-3 font-medium">Creator</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">First post due</th>
            <th className="px-3 py-2 font-medium">Posts agreed</th>
            <th className="px-3 py-2 text-right font-medium">Posted</th>
            <th className="px-3 py-2 text-right font-medium">Views</th>
            <th className="w-10 px-2 py-2">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((pc) => {
            const c = byId.get(pc.creatorId)!;
            const st = creatorState(p, pc, today);
            const v = viewsOf(p, pc.creatorId);
            return (
              <tr key={pc.creatorId}>
                <td className="py-1.5 pl-4 pr-3">
                  <Who c={c} />
                </td>
                <td className={cx("px-3 py-1.5 font-medium", STATE_STYLE[st].head)}>{label[st]}</td>
                <td className="px-3 py-1.5">
                  <input
                    type="date"
                    aria-label={`First post due for ${c.name}`}
                    className={cx(inputClass, "w-36")}
                    value={pc.dueDate ?? ""}
                    onChange={(e) => actions.upsertProjectCreators(p.id, [{ ...pc, dueDate: e.target.value || null }])}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    aria-label={`Posts agreed with ${c.name}`}
                    className={cx(inputClass, "w-20")}
                    value={pc.postsAgreed}
                    onChange={(e) => actions.upsertProjectCreators(p.id, [{ ...pc, postsAgreed: Math.max(1, Number(e.target.value) || 1) }])}
                  />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{postsBy(p, pc.creatorId).length}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{v === null ? <span className="text-muted">—</span> : formatNumber(v)}</td>
                <td className="px-2 py-1.5">
                  <button
                    className={buttonClass.icon}
                    aria-label={`Remove ${c.name} from this project`}
                    onClick={() =>
                      window.confirm(`Remove ${c.name} from this project? Their links stay, unmatched.`) && actions.removeProjectCreators(p.id, [pc.creatorId])
                    }
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
