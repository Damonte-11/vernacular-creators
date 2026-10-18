"use client";
import { isLimited } from "@/components/score-breakdown";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BRAND } from "@config/brand";
import { SampleBanner } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Avatar, buttonClass, EngagementChip, FlagList, PlatformBadge, ScoreBadge } from "@/components/ui";
import { Loading } from "@/components/ui";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { useAppState, useHydrated } from "@/lib/data/store";
import { formatDate, formatNumber, formatPercent, formatRange } from "@/lib/format";
import { shortlistTotals } from "@/lib/report";
import { sizeBandLabel } from "@/lib/size-bands";
import type { CreatorAnalysis } from "@/lib/types";

/** View-only client report. Clean enough to send as a link or save as a PDF. */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { shortlists } = useAppState();
  const all = useAnalyses();
  const list = shortlists.find((l) => l.id === id);

  const hydrated = useHydrated();

  if (!list && !hydrated) return <Loading />;
  if (!list) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-bold">Report not available</p>
        <p className="mt-2 text-sm text-ink-2">
          In this demo, report links only open in the browser where the shortlist was made. Public share links arrive in Stage 2.
        </p>
      </div>
    );
  }

  const rows = list.items
    .map((i) => all.find((a) => a.creator.id === i.creatorId))
    .filter((a): a is CreatorAnalysis => !!a);
  const totals = shortlistTotals(rows);
  const isSample = rows.some((r) => r.creator.isSample);

  return (
    <div className="min-h-screen bg-canvas print:bg-white">
      {isSample && <SampleBanner />}
      <div className="no-print mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 pt-6">
        <Link href={`/shortlists/${list.id}`} className={buttonClass.ghost}>
          <Icon name="back" size={16} /> Back to shortlist
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">Choose &quot;Save as PDF&quot; in the print window</span>
          <button className={buttonClass.primary} onClick={() => window.print()}>
            <Icon name="download" size={16} /> Download PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:p-0">
        <header className="rounded-xl bg-brand p-6 text-brand-ink print:rounded-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{BRAND.companyName} · Creator shortlist</p>
          <h1 className="mt-2 text-3xl font-bold">{list.name}</h1>
          <p className="mt-1 text-sm opacity-80">
            {list.client ? `Prepared for ${list.client} · ` : ""}
            {formatDate(new Date(NOW).toISOString())}
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
            Numbers come from each creator&apos;s public profile, using their recent posts. Engagement rate is average likes plus comments divided by followers.
            Expected engagements and reach show the middle 50% of recent posts. Reach is an estimate: it uses public view counts where available, and typical
            reach for creators of the same size otherwise. The Creator Score (out of 100) compares each creator with others of a similar size. Warning flags are
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
        {estimate && <span className="ml-1 text-accent">(estimate)</span>}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function CreatorCard({ a }: { a: CreatorAnalysis }) {
  const c = a.creator;
  const m = a.metrics;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 print-avoid-break">
      <div className="flex items-start gap-4">
        <Avatar name={c.name} photoUrl={c.photoUrl} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{c.name}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <PlatformBadge platform={c.platform} /> @{c.handle}
          </p>
          <p className="mt-1 text-xs text-muted">{[c.niche, c.city, `${sizeBandLabel(m.band)} creator`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-center">
          <ScoreBadge limited={isLimited(a.score)} score={a.score.total} />
          <p className="mt-1 text-[10px] font-semibold uppercase text-muted">Score</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Followers" value={formatNumber(c.followers)} />
        <Stat
          label="Engagement rate"
          value={
            <span className="flex items-center gap-1.5">
              {formatPercent(m.engagementRate)} <EngagementChip label={m.engagementLabel} />
            </span>
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
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-bold">{value}</dd>
    </div>
  );
}
