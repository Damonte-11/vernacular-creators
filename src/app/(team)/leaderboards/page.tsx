"use client";
import { useMemo, useState } from "react";
import { SIZE_BANDS, type SizeBandId } from "@config/size-bands";
import { Avatar, PostCover, ScoreRing, SideDrawer, Trend } from "@/components/creators/media";
import { ProfileDrawer } from "@/components/creators/profile-drawer";
import { cityOptions, nicheOptions } from "@/components/filters";
import { Icon } from "@/components/icons";
import { cx, EmptyState } from "@/components/ui";
import { creatorView, sortViews, type CreatorView } from "@/lib/creator-view";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { formatNumber, formatPercent } from "@/lib/format";
import { PLATFORMS, platformName } from "@/lib/platforms";
import type { Platform } from "@/lib/types";

const SELECT = "rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-accent [&>option]:text-ink";

/** The highest Creator Scores, ranked only against creators of the same size. */
export default function LeaderboardsPage() {
  const analyses = useAnalyses();
  const all = useMemo(() => analyses.map((a) => creatorView(a, NOW)), [analyses]);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [band, setBand] = useState<SizeBandId | "all" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const pool = useMemo(
    () => all.filter((v) => v.score !== null && (!platform || v.platform === platform) && (!niche || v.niche === niche) && (!city || v.city === city)),
    [all, platform, niche, city],
  );
  const counts = useMemo(() => {
    const m = new Map<SizeBandId, number>();
    for (const v of pool) m.set(v.band, (m.get(v.band) ?? 0) + 1);
    return m;
  }, [pool]);
  // Until someone picks a size, open on the size with the most creators.
  const busiest = SIZE_BANDS.reduce<SizeBandId>((best, b) => ((counts.get(b.id) ?? 0) > (counts.get(best) ?? 0) ? b.id : best), SIZE_BANDS[0].id);
  const activeBand = band ?? busiest;
  const rows = useMemo(() => sortViews(activeBand === "all" ? pool : pool.filter((v) => v.band === activeBand), "score"), [pool, activeBand]);
  const index = rows.findIndex((x) => x.id === openId);
  const open = openId ? (all.find((x) => x.id === openId) ?? null) : null;
  const bandLabel = activeBand === "all" ? "all sizes" : SIZE_BANDS.find((b) => b.id === activeBand)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-6 text-white sm:px-8 sm:py-7">
        <span className="pointer-events-none absolute right-0 top-0 hidden h-20 w-20 bg-accent sm:block" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Leaderboards</h1>
        <p className="mt-1 max-w-xl text-[13px] text-white/60">
          The highest Creator Scores, ranked only against creators of the same size, so a 9K creator is never up against a 1.4M one.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Creator size">
          {[
            ...SIZE_BANDS.map((b) => ({ id: b.id as SizeBandId | "all", label: b.label, n: counts.get(b.id) ?? 0 })),
            { id: "all" as const, label: "All sizes", n: pool.length },
          ].map((b) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={activeBand === b.id}
              onClick={() => setBand(b.id)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                activeBand === b.id ? "bg-accent text-white" : "bg-white/10 text-white/80 hover:bg-white/20",
              )}
            >
              {b.label} <span className={activeBand === b.id ? "text-white/80" : "text-white/50"}>{b.n}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/15" role="radiogroup" aria-label="Platform">
            {(["", ...PLATFORMS] as (Platform | "")[]).map((p) => (
              <button
                key={p || "all"}
                role="radio"
                aria-checked={platform === p}
                onClick={() => setPlatform(p)}
                className={cx(
                  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium",
                  platform === p ? "bg-white text-ink" : "text-white/70 hover:text-white",
                )}
              >
                {p ? <Icon name={p} size={14} /> : null}
                {p ? <span className="hidden sm:inline">{platformName(p)}</span> : "All"}
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
      </section>

      {rows.length === 0 ? (
        <EmptyState title="Nobody here yet" body="No scored creators match these choices. Try another size, platform or niche." />
      ) : (
        <>
          <ol className="grid gap-4 lg:grid-cols-3" aria-label={`Top 3, ${bandLabel}`}>
            {rows.slice(0, 3).map((v, i) => (
              <Podium key={v.id} v={v} rank={i + 1} onOpen={() => setOpenId(v.id)} />
            ))}
          </ol>
          {rows.length > 3 && (
            <ol className="space-y-2" start={4}>
              {rows.slice(3).map((v, i) => (
                <Row key={v.id} v={v} rank={i + 4} onOpen={() => setOpenId(v.id)} />
              ))}
            </ol>
          )}
        </>
      )}

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
                    total: rows.length,
                    onPrev: () => index > 0 && setOpenId(rows[index - 1].id),
                    onNext: () => index < rows.length - 1 && setOpenId(rows[index + 1].id),
                  }
                : undefined
            }
          />
        )}
      </SideDrawer>
    </div>
  );
}

function Podium({ v, rank, onOpen }: { v: CreatorView; rank: number; onOpen: () => void }) {
  return (
    <li
      onClick={onOpen}
      className={cx(
        "cr-rise group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(23,23,21,.14)]",
        rank === 1 ? "bg-brand text-white" : "bg-surface ring-1 ring-line",
      )}
      style={{ animationDelay: `${rank * 50}ms` }}
    >
      <span className={cx("absolute right-4 top-3 text-5xl font-bold tabular-nums", rank === 1 ? "text-accent" : "text-line-strong")}>{rank}</span>
      <div className="flex items-center gap-3">
        <Avatar v={v} size={52} ring={rank === 1} />
        <ScoreRing score={v.score} size={52} stroke={5} dark={rank === 1} />
      </div>
      <p className="mt-3 truncate text-lg font-semibold tracking-tight group-hover:underline">{v.name}</p>
      <p className={cx("truncate text-xs", rank === 1 ? "text-white/60" : "text-muted")}>
        @{v.handle} · {formatNumber(v.followers)} followers{v.niche ? ` · ${v.niche}` : ""}
      </p>
      <p className={cx("mt-2 line-clamp-2 text-[13px]", rank === 1 ? "text-white/85" : "text-ink-2")}>{v.verdict}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {v.best.slice(0, 3).map((p) => (
          <PostCover key={p.id} post={p} className="aspect-[3/4]" />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
        {[
          ["Engagement", v.er === null ? "—" : formatPercent(v.er)],
          ["Expected views", v.views === null ? "—" : formatNumber(v.views)],
          ["Posts a week", v.postsPerWeek === null ? "—" : v.postsPerWeek.toFixed(1)],
        ].map(([k, n]) => (
          <div key={k}>
            <dt className={cx("text-xs", rank === 1 ? "text-white/50" : "text-muted")}>{k}</dt>
            <dd className="font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function Row({ v, rank, onOpen }: { v: CreatorView; rank: number; onOpen: () => void }) {
  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-line transition-shadow duration-150 hover:shadow-[0_8px_24px_rgba(23,23,21,.08)] sm:gap-4"
      >
        <span className="w-7 shrink-0 text-right text-lg font-bold tabular-nums text-accent">{rank}</span>
        <Avatar v={v} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold group-hover:underline">{v.name}</span>
          <span className="block truncate text-xs text-muted">
            @{v.handle}
            {v.niche ? ` · ${v.niche}` : ""}
            {v.city ? ` · ${v.city}` : ""}
          </span>
        </span>
        <span className="hidden gap-1 md:flex">
          {v.best.slice(0, 2).map((p) => (
            <span key={p.id} className="pointer-events-none w-10">
              <PostCover post={p} className="aspect-[3/4]" />
            </span>
          ))}
        </span>
        <span className="hidden w-24 text-right sm:block">
          <span className="block text-[13px] font-semibold tabular-nums">{formatNumber(v.followers)}</span>
          <span className="text-xs text-muted">followers</span>
        </span>
        <span className="hidden w-28 text-right sm:block">
          <span className="block text-[13px] font-semibold tabular-nums">
            {v.views === null ? "—" : formatNumber(v.views)} <Trend change={v.trend} />
          </span>
          <span className="text-xs text-muted">expected views</span>
        </span>
        <ScoreRing score={v.score} size={40} stroke={4} />
      </button>
    </li>
  );
}
