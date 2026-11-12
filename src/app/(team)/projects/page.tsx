"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { PaceBar, TONE_TEXT, verdictText } from "@/components/project/summary";
import { buttonClass, EmptyState, PageHeader } from "@/components/ui";
import { useAppState } from "@/lib/data/store";
import { formatNumber } from "@/lib/format";
import { useCreators } from "@/lib/data/creators";
import { attentionItems, chorusLabel, projectPhase, projectTotals, shortDate, todayLagos } from "@/lib/projects";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { projects } = useAppState();
  const creators = useCreators();
  const today = todayLagos();
  const nameOf = useMemo(() => {
    const m = new Map(creators.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? "A creator";
  }, [creators]);
  const groups = (["running", "upcoming", "finished"] as const)
    .map((phase) => ({
      phase,
      title: { running: "Running now", upcoming: "Starting soon", finished: "Finished" }[phase],
      items: projects
        .filter((p) => projectPhase(p, today) === phase)
        .sort((a, b) => (phase === "finished" ? b.endDate.localeCompare(a.endDate) : a.startDate.localeCompare(b.startDate))),
    }))
    .filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every Chorus campaign, with its views guarantee and what needs chasing."
        actions={
          <>
            <Link href="/projects/dialect-preview" className={buttonClass.secondary}>
              Dialect (design preview)
            </Link>
            <Link href="/projects/new" className={buttonClass.primary}>
              <Icon name="plus" size={15} /> New project
            </Link>
          </>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create one for each Chorus campaign: the creators, their post links, the brief and the views guarantee, in one place."
          action={
            <Link href="/projects/new" className={buttonClass.primary}>
              New project
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.phase} aria-labelledby={`g-${g.phase}`}>
              <h2 id={`g-${g.phase}`} className="mb-2 text-sm font-semibold">
                {g.title} <span className="font-normal text-muted">{g.items.length}</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {g.items.map((p) => (
                  <Row key={p.id} p={p} today={today} nameOf={nameOf} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Row({ p, today, nameOf }: { p: Project; today: string; nameOf: (id: string) => string }) {
  const t = projectTotals(p, today);
  const v = verdictText(t, p);
  const chase = attentionItems(p, today, nameOf).length;
  const phase = projectPhase(p, today);
  const when =
    phase === "upcoming"
      ? `Starts ${shortDate(p.startDate)}`
      : phase === "finished"
        ? `Ended ${shortDate(p.endDate)}`
        : `Day ${t.window.today} of ${t.window.days}`;
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="group block bg-surface px-4 py-3 transition-colors duration-100 hover:bg-surface-2">
        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto]">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold group-hover:underline">{p.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {p.client || "No client set"} · Chorus {chorusLabel(p.chorusType)} · {when}
            </p>
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className={`font-medium ${TONE_TEXT[v.tone]}`}>{v.label}</span>
              <span className="tabular-nums text-muted">
                <b className="font-semibold text-ink">{formatNumber(t.views)}</b>
                {p.guarantee ? ` / ${formatNumber(p.guarantee)}` : ""} views
              </span>
            </div>
            <PaceBar p={p} t={t} size="sm" />
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            {chase > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">
                <Icon name="alert" size={12} /> {chase} to chase
              </span>
            ) : (
              <span className="text-xs text-muted">
                {p.creators.length} creators · {t.posts} posts
              </span>
            )}
            <Icon name="back" size={15} className="rotate-180 text-muted" />
          </div>
        </div>
      </Link>
    </li>
  );
}
