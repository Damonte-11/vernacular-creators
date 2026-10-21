"use client";
import Link from "next/link";
import { BRAND } from "@config/brand";
import { SampleBanner } from "./app-shell";
import { Icon } from "./icons";
import { Wordmark } from "./logo";
import { isLimited } from "./score-breakdown";
import { Avatar, buttonClass, EngagementChip, FlagList, PlatformBadge, ScoreBadge, TrendLine } from "./ui";
import { formatDate, formatNumber, formatPercent, formatRange } from "@/lib/format";
import { shortlistTotals } from "@/lib/report";
import { sizeBandLabel } from "@/lib/size-bands";
import type { CreatorAnalysis } from "@/lib/types";

/** The client report: used by the team view and by the public share link. */
export function ReportView({
  name,
  client,
  rows,
  date,
  backHref,
}: {
  name: string;
  client: string;
  rows: CreatorAnalysis[];
  date: number;
  /** Team view only: link back to the shortlist. */
  backHref?: string;
}) {
  const totals = shortlistTotals(rows);
  const isSample = rows.some((r) => r.creator.isSample);

  return (
    <div className="min-h-screen bg-canvas print:bg-white">
      {isSample && <SampleBanner />}
      <div className="no-print mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 pt-6">
        {backHref ? (
          <Link href={backHref} className={buttonClass.ghost}>
            <Icon name="back" size={16} /> Back to shortlist
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">Choose &quot;Save as PDF&quot; in the print window</span>
          <button className={buttonClass.primary} onClick={() => window.print()}>
            <Icon name="download" size={16} /> Download PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:p-0">
        <header className="rounded-xl bg-brand p-6 text-brand-ink print:rounded-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
          <div className="flex items-center justify-between gap-4">
            <Wordmark className="h-7 w-auto" title={BRAND.companyName} />
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Creator shortlist</p>
          </div>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
          <p className="mt-1 text-sm opacity-80">
            {client ? `Prepared for ${client} · ` : ""}
            {formatDate(new Date(date).toISOString())}
          </p>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print-avoid-break">
          <Total label="Creators" value={String(totals.creators)} />
          <Total label="Combined followers" value={formatNumber(totals.followers)} />
          <Total label="Expected engagements" value={formatRange(totals.engagements)} hint="If each creator posts once" />
          <Total label="Estimated reach" value={formatRange(totals.reach)} hint="One post each; audiences may overlap" estimate />
        </section>

        <section className="mt-6 space-y-4">
          {rows.length === 0 && <p className="text-center text-sm text-muted">This shortlist has no creators yet.</p>}
          {rows.map((a) => (
            <CreatorCard key={a.creator.id} a={a} />
          ))}
        </section>

        <footer className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted print-avoid-break">
          <p className="font-semibold text-ink-2">How to read this report</p>
          <p className="mt-1">
            Numbers come from each creator&apos;s public profile, using their recent posts (unusually high, possibly boosted posts are set aside). Engagement
            by followers is average likes plus comments per post divided by followers; engagement by views is likes plus comments divided by views, showing how
            much the people who watch react. Expected engagements and reach show the middle 50% of recent posts. Reach is an estimate: about 60% of public
            views where available (views include repeat plays), and typical reach for creators of the same size otherwise. The Creator Score (out of 100) compares each creator with others of a similar size. Warning flags are
            prompts to look closer, not proof of wrongdoing.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Total({ label, value, hint, estimate }: { label: string; value: string; hint?: string; estimate?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted">
        {label}
        {estimate && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">Estimate</span>}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

function CreatorCard({ a }: { a: CreatorAnalysis }) {
  const c = a.creator;
  const m = a.metrics;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_23_21/0.04)] sm:p-6 print-avoid-break">
      <div className="flex items-start gap-4">
        <Avatar name={c.name} photoUrl={c.photoUrl} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight">{c.name}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <PlatformBadge platform={c.platform} /> @{c.handle}
          </p>
          <p className="mt-1 text-xs text-muted">{[c.niche, c.city, `${sizeBandLabel(m.band)} creator`].filter(Boolean).join(" · ")}</p>
          {m.trend && (
            <p className="mt-1">
              <TrendLine trend={m.trend} />
            </p>
          )}
        </div>
        <div className="text-center">
          <ScoreBadge limited={isLimited(a.score)} score={a.score.total} />
          <p className="mt-1 text-[11px] font-medium text-muted">Score</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-line pt-4 text-sm sm:grid-cols-5">
        <Stat label="Followers" value={formatNumber(c.followers)} />
        <Stat
          label="Engagement by followers"
          value={
            <span className="flex items-center gap-1.5">
              {formatPercent(m.engagementRate)} <EngagementChip label={m.engagementLabel} />
            </span>
          }
        />
        <Stat
          label="Engagement by views"
          value={
            m.viewEngagementRate === null ? (
              "—"
            ) : (
              <span className="flex items-center gap-1.5">
                {formatPercent(m.viewEngagementRate)} <EngagementChip label={m.viewEngagementLabel} />
              </span>
            )
          }
        />
        <Stat label="Engagements / post" value={m.likesHidden ? "Likes hidden" : formatRange(m.expectedEngagements)} />
        <Stat label="Reach / post (est.)" value={formatRange(a.reach)} />
      </dl>
      {a.flags.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <FlagList flags={a.flags} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
