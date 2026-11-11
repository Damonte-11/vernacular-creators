"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CreatorTable } from "@/components/creator-table";
import { Icon } from "@/components/icons";
import { LookupForm } from "@/components/lookup-form";
import { PaceBar, TONE_TEXT, verdictText } from "@/components/project/summary";
import { projectPhase, projectTotals, todayLagos } from "@/lib/projects";
import { QueueStatusCard } from "@/components/queue-status";
import { buttonClass, Card, EmptyState, PageHeader, SectionHeader, StatStrip, StatTile } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { useAppState } from "@/lib/data/store";
import { sortAnalyses } from "@/lib/filter";
import { formatFull, formatNumber } from "@/lib/format";
import { TOP_CREATORS_MIN_FOLLOWERS } from "@config/app";

export default function HomePage() {
  const all = useAnalyses();
  const { projects } = useAppState();
  const today = todayLagos();
  const top = useMemo(() => sortAnalyses(all.filter((a) => a.creator.followers >= TOP_CREATORS_MIN_FOLLOWERS), "score").slice(0, 8), [all]);
  const flagged = all.filter((a) => a.flags.some((f) => f.severity !== "low")).length;
  const scored = all.filter((a) => a.score.total !== null);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const foundThisWeek = all.filter((a) => a.creator.discoveredAt && new Date(a.creator.discoveredAt).getTime() >= weekAgo).length;
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score.total ?? 0), 0) / scored.length) : null;
  const live = useMemo(() => projects.filter((p) => projectPhase(p, today) !== "finished").sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5), [projects, today]);

  return (
    <>
      <PageHeader title="Home" subtitle="Look up a creator, or pick up where the team left off." />

      <Card className="mb-5 p-4 sm:p-5">
        <SectionHeader title="Look up a creator" description="Saved creators appear as you type. Anyone new is fetched from the platform and saved." className="mb-3" />
        <LookupForm />
      </Card>

      <StatStrip className="mb-5">
        <StatTile label="Creators saved" value={formatFull(all.length)} hint={<Link href="/creators" className="hover:text-ink hover:underline">Browse and filter</Link>} />
        <StatTile label="Average score" value={avgScore ?? "—"} hint="Across everyone with a score" />
        <StatTile label="With warning signs" value={formatFull(flagged)} hint="Medium or high flags" />
        <StatTile
          label="Found this week"
          value={formatFull(foundThisWeek)}
          hint={<Link href="/discovered" className="hover:text-ink hover:underline">See what discovery found</Link>}
        />
      </StatStrip>

      <QueueStatusCard hideWhenEmpty className="mb-5" />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <SectionHeader
            title="Top creators right now"
            description={`Highest Creator Scores among creators with ${formatNumber(TOP_CREATORS_MIN_FOLLOWERS)}+ followers.`}
            className="mb-3"
            action={
              <Link href="/leaderboards" className={buttonClass.ghost}>
                Leaderboards <Icon name="back" size={14} className="rotate-180" />
              </Link>
            }
          />
          {top.length === 0 && all.length > 0 ? (
            <EmptyState
              title={`No creators with ${formatNumber(TOP_CREATORS_MIN_FOLLOWERS)}+ followers yet`}
              body="Smaller creators are on the Leaderboards, ranked against others of their size."
              action={
                <Link href="/leaderboards" className={buttonClass.secondary}>
                  Leaderboards
                </Link>
              }
            />
          ) : top.length === 0 ? (
            <EmptyState
              title="No creators yet"
              body="Look someone up above, or paste a whole list of handles on the Add creators page. Everyone you look up is saved."
              action={
                <Link href="/add" className={buttonClass.primary}>
                  Add creators
                </Link>
              }
            />
          ) : (
            <CreatorTable rows={top} ranked />
          )}
        </section>

        <section>
          <SectionHeader
            title="Projects"
            description="Running and starting soon."
            className="mb-3"
            action={
              <Link href="/projects" className={buttonClass.ghost}>
                All projects <Icon name="back" size={14} className="rotate-180" />
              </Link>
            }
          />
          {live.length === 0 ? (
            <Card className="border-dashed p-4 text-[13px] text-ink-2">
              No running projects.{" "}
              <Link href="/projects/new" className="font-medium text-ink underline">
                Start one
              </Link>{" "}
              for your next Chorus campaign.
            </Card>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {live.map((p) => {
                const t = projectTotals(p, today);
                const v = verdictText(t, p);
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="block px-3.5 py-2.5 transition-colors hover:bg-surface-2">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] font-medium">{p.name}</span>
                        <span className={`shrink-0 text-xs font-medium ${TONE_TEXT[v.tone]}`}>{v.label}</span>
                      </span>
                      <span className="mt-1.5 block">
                        <PaceBar p={p} t={t} size="sm" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
