"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { PaceBar, TONE_TEXT, verdictText } from "@/components/project/summary";
import { TargetBar } from "@/components/dialect/bits";
import { buttonClass, EmptyState, PageHeader } from "@/components/ui";
import { useDialect } from "@/lib/data/dialect-store";
import { agreementMonths, attention, monthName, monthOf, monthStats, paceVerdict } from "@/lib/dialect";
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
        subtitle="Chorus campaigns with their views guarantee, and Dialect brands with this month against target."
        actions={
          <Link href="/projects/new" className={buttonClass.primary}>
            <Icon name="plus" size={15} /> New project
          </Link>
        }
      />
      <DialectSection today={today} />
      {projects.length === 0 ? (
        <EmptyState
          title="No Chorus campaigns yet"
          body="Create one for each Chorus campaign (creators, their post links, the brief and the views guarantee) or a Dialect project for a brand whose pages we run."
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

/** Dialect brands: this month's views against its target. */
function DialectSection({ today }: { today: string }) {
  const { projects, ready, error } = useDialect();
  if (!ready) return null;
  if (error && !projects.length) return <p className="mb-6 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">Dialect: {error}</p>;
  if (!projects.length) return null;
  const month = monthOf(today);
  return (
    <section aria-labelledby="g-dialect" className="mb-6">
      <h2 id="g-dialect" className="mb-2 text-sm font-semibold">
        Dialect <span className="font-normal text-muted">{projects.length}</span>
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {projects.map((p) => {
          const s = monthStats(p, month, today);
          const target = p.monthTargets[month]?.views ?? 0;
          const v = paceVerdict(s.views, target, s.day, s.days);
          const open = attention(p, month).length;
          const all = agreementMonths(p);
          const idx = all.indexOf(month);
          return (
            <li key={p.id}>
              <Link href={`/projects/dialect/${p.id}`} className="group block bg-surface px-4 py-3 transition-colors duration-100 hover:bg-surface-2">
                <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold group-hover:underline">{p.brand}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {p.client || "No client set"} · Dialect ·{" "}
                      {idx >= 0 ? `month ${idx + 1} of ${p.months}` : month < p.startMonth ? `Starts ${monthName(p.startMonth)}` : "Agreement ended"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                      <span className={`font-medium ${{ good: "text-good", warn: "text-warn", bad: "text-bad" }[v.tone]}`}>
                        {target ? v.text : "No target this month"}
                      </span>
                      <span className="tabular-nums text-muted">
                        <b className="font-semibold text-ink">{formatNumber(s.views)}</b>
                        {target ? ` / ${formatNumber(target)}` : ""} views in {monthName(month)}
                      </span>
                    </div>
                    <TargetBar done={s.views} target={target} pace={s.day && s.day < s.days ? s.day / s.days : null} />
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    {open > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">
                        <Icon name="alert" size={12} /> {open} to clear
                      </span>
                    ) : (
                      <span className="text-xs text-muted">{s.posts} posts this month</span>
                    )}
                    <Icon name="back" size={15} className="rotate-180 text-muted" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
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
