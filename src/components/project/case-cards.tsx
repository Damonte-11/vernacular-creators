"use client";
import Link from "next/link";
import { useMemo } from "react";
import { creatorView } from "@/lib/creator-view";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { formatNumber, formatPercent } from "@/lib/format";
import { chorusLabel, projectPhase, projectTotals, shortDate, todayLagos } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { Avatar, PostCover } from "../creators/media";
import { cx } from "../ui";
import { verdictText } from "./summary";

const ON_DARK: Record<string, string> = { good: "#3ccf5a", warn: "#ffc21c", bad: "#ff6b5b" };

/** The website's work-card colours, with the text colour that reads on each. */
const BLOCKS = [
  { bg: "#f75115", on: "#1b1b1a" },
  { bg: "#16cdeb", on: "#1b1b1a" },
  { bg: "#9a62f7", on: "#ffffff" },
  { bg: "#ffc21c", on: "#1b1b1a" },
  { bg: "#0b5edd", on: "#ffffff" },
  { bg: "#0aa021", on: "#ffffff" },
];

/**
 * Finished Chorus campaigns as case-study cards, like "Our Work" on the Vernacular website:
 * the headline number, the outcome in one line, and the creators who did it. Made to be screenshotted into pitches.
 */
export function CaseCards({ projects }: { projects: Project[] }) {
  const analyses = useAnalyses();
  const views = useMemo(() => new Map(analyses.map((a) => [a.creator.id, creatorView(a, NOW)])), [analyses]);
  const today = todayLagos();
  const done = projects.filter((p) => projectPhase(p, today) === "finished").sort((a, b) => b.endDate.localeCompare(a.endDate));
  if (!done.length) return null;
  return (
    <section className="mb-8" aria-labelledby="cases-h">
      <h2 id="cases-h" className="text-xl font-bold tracking-tight">
        Finished campaigns
      </h2>
      <p className="mb-4 text-[13px] text-muted">The headline for each, ready to screenshot into a pitch. Open one for the full report.</p>
      <div className="grid gap-4">
        {done.map((p, i) => {
          const t = projectTotals(p, today);
          const v = verdictText(t, p);
          const block = BLOCKS[i % BLOCKS.length];
          const people = p.creators.map((c) => views.get(c.creatorId)).filter((x) => !!x);
          const covers = people.flatMap((x) => x.best.slice(0, 1)).slice(0, 3);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}?tab=report`}
              className="group grid overflow-hidden rounded-2xl bg-[#242322] text-[#f2eee4] transition-transform duration-300 hover:-translate-y-1 md:grid-cols-[minmax(0,.4fr)_minmax(0,.6fr)]"
            >
              <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold" style={{ color: block.bg }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    Chorus {chorusLabel(p.chorusType)} · {p.client || "No client set"}
                  </span>
                  <h3 className="mt-4 text-3xl font-semibold leading-none tracking-tight sm:text-4xl">{p.name}</h3>
                  <p className="mt-3 text-[15px] leading-snug text-[#b4b0a7]">
                    <b className="font-semibold text-[#f2eee4]">{formatNumber(t.views)} views</b>
                    {p.guarantee ? ` on a ${formatNumber(p.guarantee)} guarantee` : ""}, from {t.posts} posts by {p.creators.length} creators
                    {t.erByViews !== null ? `, ${formatPercent(t.erByViews)} engagement by views` : ""}.
                  </p>
                  <p className="mt-2 text-[13px] font-medium" style={{ color: ON_DARK[v.tone] ?? "#f2eee4" }}>
                    {v.label}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-quiet transition-colors group-hover:text-[#f2eee4]">
                  Open the report <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    {shortDate(p.startDate)} – {shortDate(p.endDate)}
                  </span>
                </span>
              </div>
              <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden p-6" style={{ background: block.bg, color: block.on }}>
                {covers.length > 0 ? (
                  <div className="grid w-full max-w-md grid-cols-3 gap-3 transition-transform duration-700 group-hover:scale-[1.03]">
                    {covers.map((c, k) => (
                      <div key={c.id} className={cx("overflow-hidden rounded-xl shadow-[0_12px_30px_rgba(0,0,0,.25)]", k === 1 && "-translate-y-3")}>
                        <PostCover post={c} className="aspect-[3/4]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-5xl font-semibold tracking-tight">{formatNumber(t.views)}</p>
                )}
                {people.length > 0 && (
                  <div className="absolute bottom-4 left-4 flex -space-x-2">
                    {people.slice(0, 6).map((x) => (
                      <span key={x.id} className="rounded-full ring-2" style={{ "--tw-ring-color": block.bg } as React.CSSProperties}>
                        <Avatar v={x} size={30} />
                      </span>
                    ))}
                    {people.length > 6 && (
                      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-black/25 text-[11px] font-semibold">+{people.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
