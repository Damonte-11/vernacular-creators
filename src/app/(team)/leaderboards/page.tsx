"use client";
import { useMemo, useState } from "react";
import { SCORE_FACTOR_LABELS, type ScoreFactor } from "@config/scoring";
import { SIZE_BANDS, type SizeBandId } from "@config/size-bands";
import { AddToShortlist } from "@/components/add-to-shortlist";
import { AlsoOn } from "@/components/creator-table";
import { cityOptions, nicheOptions } from "@/components/filters";
import { Icon } from "@/components/icons";
import { isLimited } from "@/components/score-breakdown";
import { Avatar, Card, CreatorLink, cx, EmptyState, EngagementChip, inputClass, PageHeader, PlatformBadge, ScoreBadge, scoreTone, VerifiedBadge } from "@/components/ui";
import { useAnalyses, useCreators } from "@/lib/data/creators";
import { applyFilters, EMPTY_FILTERS, sortAnalyses } from "@/lib/filter";
import { formatNumber, formatPercent } from "@/lib/format";
import { PLATFORMS, platformName } from "@/lib/platforms";
import type { CreatorAnalysis, Platform } from "@/lib/types";

/** Ranks within one size band, so a 9K creator is never ranked against a 1.4M one. */
export default function LeaderboardsPage() {
  const all = useAnalyses();
  const creators = useCreators();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [band, setBand] = useState<SizeBandId | "all" | null>(null);

  const pool = useMemo(
    () => applyFilters(all, { ...EMPTY_FILTERS, platform, niche, city }).filter((a) => a.score.total !== null),
    [all, platform, niche, city],
  );
  const counts = useMemo(() => {
    const m = new Map<SizeBandId, number>();
    for (const a of pool) m.set(a.metrics.band, (m.get(a.metrics.band) ?? 0) + 1);
    return m;
  }, [pool]);
  // Until someone picks a size, open on the size with the most creators.
  const busiest = SIZE_BANDS.reduce<SizeBandId>((best, b) => ((counts.get(b.id) ?? 0) > (counts.get(best) ?? 0) ? b.id : best), SIZE_BANDS[0].id);
  const activeBand = band ?? busiest;
  const rows = useMemo(() => sortAnalyses(activeBand === "all" ? pool : pool.filter((a) => a.metrics.band === activeBand), "score"), [pool, activeBand]);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <>
      <PageHeader title="Leaderboards" subtitle="The highest Creator Scores, ranked against creators of the same size." />

      <div className="mb-6 space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex min-w-full gap-1 rounded-xl bg-surface p-1 ring-1 ring-line sm:min-w-0" role="tablist" aria-label="Creator size">
            {SIZE_BANDS.map((b) => (
              <BandTab key={b.id} active={activeBand === b.id} onClick={() => setBand(b.id)} label={b.label} count={counts.get(b.id) ?? 0} />
            ))}
            <BandTab active={activeBand === "all"} onClick={() => setBand("all")} label="All sizes" count={pool.length} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-surface-2 p-1 ring-1 ring-line" role="radiogroup" aria-label="Platform">
            {(["", ...PLATFORMS] as (Platform | "")[]).map((p) => (
              <button
                key={p || "all"}
                type="button"
                role="radio"
                aria-checked={platform === p}
                onClick={() => setPlatform(p)}
                className={cx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  platform === p ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
                )}
              >
                {p ? <Icon name={p} size={14} /> : null}
                {p ? <span className="hidden sm:inline">{platformName(p)}</span> : "All"}
                {p && <span className="sr-only sm:hidden">{platformName(p)}</span>}
              </button>
            ))}
          </div>
          <select className={SELECT} value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Niche">
            <option value="">All niches</option>
            {nicheOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className={SELECT} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            <option value="">All cities</option>
            {cityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nobody here yet" body="No scored creators match these choices. Try another size, platform or niche." />
      ) : (
        <>
          <ol className="grid gap-3 md:grid-cols-3" aria-label="Top 3">
            {podium.map((a, i) => (
              <PodiumCard key={a.creator.id} a={a} rank={i + 1} creators={creators} />
            ))}
          </ol>

          {rest.length > 0 && (
            <Card className="mt-6 overflow-hidden">
              <ol className="divide-y divide-line" start={4}>
                {rest.map((a, i) => (
                  <li key={a.creator.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:gap-4">
                    <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">{i + 4}</span>
                    <CreatorLink id={a.creator.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
                      <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} size={36} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{a.creator.name}</span>
                          <VerifiedBadge verified={a.creator.verified} />
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <PlatformBadge platform={a.creator.platform} compact />
                          <span className="truncate">@{a.creator.handle}</span>
                          <AlsoOn creator={a.creator} all={creators} />
                        </span>
                      </span>
                    </CreatorLink>
                    <span className="hidden w-28 text-xs text-muted lg:block">
                      <span className="block font-medium text-ink-2">{strongest(a)}</span>
                      strongest
                    </span>
                    <span className="hidden w-20 text-right text-sm sm:block">
                      <span className="block font-semibold tabular-nums">{formatNumber(a.creator.followers)}</span>
                      <span className="text-xs text-muted">followers</span>
                    </span>
                    <ScoreBar score={a.score.total ?? 0} />
                    <ScoreBadge limited={isLimited(a.score)} score={a.score.total} size="sm" />
                    <AddToShortlist creatorId={a.creator.id} compact />
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function BandTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {label}
      <span className={cx("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-white/15" : "bg-surface-2 text-muted")}>{count}</span>
    </button>
  );
}

/** Compact select for the filter row (the shared input style is full-width). */
const SELECT = cx(inputClass.replace("w-full ", ""), "w-auto py-2");

const RANK_STYLE = ["bg-accent text-white", "bg-ink text-white", "bg-ink-2 text-white"];

function PodiumCard({ a, rank, creators }: { a: CreatorAnalysis; rank: number; creators: ReturnType<typeof useCreators> }) {
  const c = a.creator;
  const m = a.metrics;
  return (
    <li className={cx("relative", rank === 1 && "md:-mt-2")}>
      <Card className={cx("flex h-full flex-col p-5", rank === 1 && "ring-2 ring-accent/60")}>
        <div className="flex items-start justify-between gap-3">
          <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", RANK_STYLE[rank - 1])} aria-label={`Rank ${rank}`}>
            {rank}
          </span>
          <AddToShortlist creatorId={c.id} compact />
        </div>
        <CreatorLink id={c.id} className="group mt-3 flex items-center gap-3 rounded-md">
          <Avatar name={c.name} photoUrl={c.photoUrl} size={52} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold group-hover:underline">{c.name}</span>
              <VerifiedBadge verified={c.verified} />
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <PlatformBadge platform={c.platform} compact />
              <span className="truncate">@{c.handle}</span>
              <AlsoOn creator={c} all={creators} />
            </span>
          </span>
        </CreatorLink>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm">
            <dt className="text-xs text-muted">Followers</dt>
            <dt className="text-xs text-muted">Engagement</dt>
            <dd className="font-semibold tabular-nums">{formatNumber(c.followers)}</dd>
            <dd className="flex items-center gap-1.5 font-semibold tabular-nums">
              {formatPercent(m.engagementRate)}
              {m.engagementLabel && <EngagementChip label={m.engagementLabel} />}
            </dd>
          </dl>
          <ScoreBadge limited={isLimited(a.score)} score={a.score.total} size={rank === 1 ? "lg" : "md"} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Strongest: <span className="font-medium text-ink-2">{strongest(a)}</span>
        </p>
      </Card>
    </li>
  );
}

function ScoreBar({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <span className="hidden w-32 md:block" aria-hidden>
      <span className="block h-1.5 rounded-full bg-line">
        <span className={cx("block h-1.5 rounded-full", tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad")} style={{ width: `${score}%` }} />
      </span>
    </span>
  );
}

/**
 * The score factor this creator does best on, e.g. "Engagement 90". Authenticity
 * is left out: it starts at 100 for everyone, so it never sets anyone apart.
 */
function strongest(a: CreatorAnalysis): string {
  const entries = (Object.entries(a.score.breakdown) as [ScoreFactor, number][]).filter(([f]) => f !== "authenticity");
  if (!entries.length) return "—";
  const [f, v] = entries.sort((x, y) => y[1] - x[1])[0];
  return `${SCORE_FACTOR_LABELS[f].label} ${v}`;
}
