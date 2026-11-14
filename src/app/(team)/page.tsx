"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TOP_CREATORS_MIN_FOLLOWERS } from "@config/app";
import { CreatorCard } from "@/components/creators/card";
import { SideDrawer } from "@/components/creators/media";
import { ProfileDrawer } from "@/components/creators/profile-drawer";
import { TargetBar } from "@/components/dialect/bits";
import { Icon } from "@/components/icons";
import { LookupForm } from "@/components/lookup-form";
import { PaceBar, TONE_TEXT, verdictText } from "@/components/project/summary";
import { QueueStatusCard } from "@/components/queue-status";
import { buttonClass, cx, EmptyState } from "@/components/ui";
import { creatorView, sortViews } from "@/lib/creator-view";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { useDialect } from "@/lib/data/dialect-store";
import { useAppState } from "@/lib/data/store";
import { attention, monthName, monthOf, monthStats, paceVerdict } from "@/lib/dialect";
import { formatFull, formatNumber } from "@/lib/format";
import { attentionItems, projectPhase, projectTotals, todayLagos } from "@/lib/projects";

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Lagos" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Home: look someone up, see the database at a glance, and pick up what's waiting. */
export default function HomePage() {
  const analyses = useAnalyses();
  const all = useMemo(() => analyses.map((a) => creatorView(a, NOW)), [analyses]);
  const { projects } = useAppState();
  const dialect = useDialect();
  const today = todayLagos();
  const [openId, setOpenId] = useState<string | null>(null);

  const top = useMemo(
    () =>
      sortViews(
        all.filter((v) => v.followers >= TOP_CREATORS_MIN_FOLLOWERS && v.score !== null),
        "score",
      ).slice(0, 6),
    [all],
  );
  const flagged = all.filter((v) => v.a.flags.some((f) => f.severity !== "low")).length;
  const scored = all.filter((v) => v.score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, v) => s + (v.score ?? 0), 0) / scored.length) : null;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const foundThisWeek = all.filter((v) => v.a.creator.discoveredAt && new Date(v.a.creator.discoveredAt).getTime() >= weekAgo).length;
  const nameOf = useMemo(() => {
    const m = new Map(all.map((v) => [v.id, v.name]));
    return (id: string) => m.get(id) ?? "A creator";
  }, [all]);
  const chorus = useMemo(
    () => projects.filter((p) => projectPhase(p, today) !== "finished").sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [projects, today],
  );
  const month = monthOf(today);
  const brands = dialect.projects.filter((p) => p.monthTargets[month]);

  // What's waiting on the team, across everything.
  const waiting = [
    ...chorus.flatMap((p) => {
      const n = attentionItems(p, today, nameOf).length;
      return n ? [{ href: `/projects/${p.id}`, label: p.name, note: `${n} to chase`, tone: "bad" as const }] : [];
    }),
    ...brands.flatMap((p) => {
      const n = attention(p, month).length;
      return n ? [{ href: `/projects/dialect/${p.id}`, label: p.brand, note: `${n} to clear`, tone: "warn" as const }] : [];
    }),
  ];
  const open = openId ? (all.find((x) => x.id === openId) ?? null) : null;
  const index = top.findIndex((x) => x.id === openId);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-8 sm:py-8">
        <span className="pointer-events-none absolute right-0 top-0 hidden h-24 w-24 bg-accent sm:block" aria-hidden />
        <span className="pointer-events-none absolute right-24 top-24 hidden h-24 w-24 bg-rail sm:block" aria-hidden />
        <h1 className="relative text-3xl font-bold tracking-tight sm:text-4xl">{greeting()}.</h1>
        <p className="relative mt-1 text-[14px] text-white/60">Look a creator up, or pick up where the team left off.</p>
        <div className="relative mt-5 max-w-3xl rounded-2xl bg-surface p-3 text-ink shadow-[0_8px_30px_rgba(0,0,0,.25)] sm:p-4">
          <LookupForm />
        </div>
        <dl className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [formatFull(all.length), "Creators saved", "/creators", "Browse and filter"],
            [avgScore === null ? "—" : String(avgScore), "Average score", "/leaderboards", "See the leaderboards"],
            [formatFull(flagged), "With warning signs", "/creators", "Medium or high flags"],
            [formatFull(foundThisWeek), "Found this week", "/discovered", "See what discovery found"],
          ].map(([n, label, href, hint]) => (
            <Link key={label} href={href} className="group rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition-colors hover:bg-white/10">
              <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
              <dt className="text-xs text-white/70">{label}</dt>
              <p className="mt-0.5 text-[11px] text-white/45 group-hover:text-white/70">{hint} →</p>
            </Link>
          ))}
        </dl>
      </section>

      <QueueStatusCard hideWhenEmpty />

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-[15px] font-semibold">Waiting on the team</h2>
          <div className="flex flex-wrap gap-2">
            {waiting.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="cr-rise inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-[13px] ring-1 ring-line transition-shadow hover:shadow-[0_6px_18px_rgba(23,23,21,.08)]"
              >
                <span className="font-medium">{w.label}</span>
                <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", w.tone === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>
                  {w.note}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Top creators right now</h2>
            <p className="text-[13px] text-muted">Highest Creator Scores among creators with {formatNumber(TOP_CREATORS_MIN_FOLLOWERS)}+ followers.</p>
          </div>
          <Link href="/leaderboards" className={buttonClass.ghost}>
            Leaderboards <Icon name="back" size={14} className="rotate-180" />
          </Link>
        </div>
        {top.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {top.map((v, i) => (
              <CreatorCard
                key={v.id}
                v={v}
                i={i}
                inCompare={false}
                onOpen={() => setOpenId(v.id)}
                onLike={() => (window.location.href = `/creators?q=${encodeURIComponent(v.niche ?? "")}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={all.length ? `No creators with ${formatNumber(TOP_CREATORS_MIN_FOLLOWERS)}+ followers yet` : "No creators yet"}
            body={
              all.length
                ? "Smaller creators are on the Leaderboards, ranked against others of their size."
                : "Look someone up above, or paste a whole list of handles on Add creators."
            }
            action={
              <Link href={all.length ? "/leaderboards" : "/add"} className={buttonClass.primary}>
                {all.length ? "Leaderboards" : "Add creators"}
              </Link>
            }
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">Running now</h2>
          <Link href="/projects" className={buttonClass.ghost}>
            All projects <Icon name="back" size={14} className="rotate-180" />
          </Link>
        </div>
        {chorus.length + brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-[13px] text-ink-2">
            Nothing running.{" "}
            <Link href="/projects/new" className="font-medium text-ink underline">
              Start a project
            </Link>{" "}
            for your next Chorus campaign or Dialect brand.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {chorus.map((p) => {
              const t = projectTotals(p, today);
              const v = verdictText(t, p);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-[0_10px_28px_rgba(23,23,21,.08)]"
                >
                  <span className="text-xs font-medium text-muted">Chorus</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold">{p.name}</span>
                  <span className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className={cx("font-medium", TONE_TEXT[v.tone])}>{v.label}</span>
                    <span className="tabular-nums text-muted">
                      <b className="font-semibold text-ink">{formatNumber(t.views)}</b>
                      {p.guarantee ? ` / ${formatNumber(p.guarantee)}` : ""} views
                    </span>
                  </span>
                  <span className="mt-2 block">
                    <PaceBar p={p} t={t} size="sm" />
                  </span>
                </Link>
              );
            })}
            {brands.map((p) => {
              const s = monthStats(p, month, today);
              const target = p.monthTargets[month].views;
              const v = paceVerdict(s.views, target, s.day, s.days);
              return (
                <Link
                  key={p.id}
                  href={`/projects/dialect/${p.id}`}
                  className="rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-[0_10px_28px_rgba(23,23,21,.08)]"
                >
                  <span className="text-xs font-medium text-muted">Dialect · {monthName(month)}</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold">{p.brand}</span>
                  <span className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className={cx("font-medium", { good: "text-good", warn: "text-warn", bad: "text-bad" }[v.tone])}>{v.text}</span>
                    <span className="tabular-nums text-muted">
                      <b className="font-semibold text-ink">{formatNumber(s.views)}</b> / {formatNumber(target)} views
                    </span>
                  </span>
                  <span className="mt-3 block">
                    <TargetBar done={s.views} target={target} pace={s.day && s.day < s.days ? s.day / s.days : null} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SideDrawer open={!!open} onClose={() => setOpenId(null)} dark>
        {open && (
          <ProfileDrawer
            v={open}
            all={all}
            onClose={() => setOpenId(null)}
            onOpen={setOpenId}
            compare={{ on: false, toggle: () => undefined }}
            nav={
              index >= 0
                ? {
                    index,
                    total: top.length,
                    onPrev: () => index > 0 && setOpenId(top[index - 1].id),
                    onNext: () => index < top.length - 1 && setOpenId(top[index + 1].id),
                  }
                : undefined
            }
          />
        )}
      </SideDrawer>
    </div>
  );
}
