"use client";
import { useMemo, useState } from "react";
import { buttonClass, cx } from "@/components/ui";
import { CITIES, fmt, lookalikes, SIZE_BANDS, type Filters, type Pro, type SortKey } from "./data";
import { Avatar, Drawer, toggleIn, useSearch, type Search } from "./bits";
import { CreatorCard, SearchHero } from "./feed";
import { Compare, FilterRail } from "./signal";
import { VerdictDrawer, VerdictReport } from "./verdict";

/** The mix: Feed's search and creator cards, Signal's filter column, Verdict's profile and report. */
export default function Mix() {
  const s = useSearch();
  const [openId, setOpenId] = useState<string | null>(null);
  const [report, setReport] = useState<Pro | null>(null);
  const [likeOf, setLikeOf] = useState<Pro | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const list = useMemo(() => (likeOf ? lookalikes(likeOf, s.all, 9) : s.results), [likeOf, s.all, s.results]);
  const index = list.findIndex((x) => x.id === openId);
  const open = index >= 0 ? list[index] : (s.all.find((x) => x.id === openId) ?? null);

  if (report)
    return (
      <VerdictReport
        p={report}
        all={s.all}
        onBack={() => setReport(null)}
        onOpen={(x) => {
          setReport(x);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  const chosen = s.all.filter((x) => compare.includes(x.id));

  return (
    <div className="space-y-5">
      <SearchHero s={s} onAsk={() => setLikeOf(null)} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <button onClick={() => setShowFilters((v) => !v)} className={cx(buttonClass.secondary, "w-full lg:hidden")} aria-expanded={showFilters}>
            {showFilters ? "Hide filters" : "Filters"}
          </button>
          <div className={cx(showFilters ? "mt-3 block" : "hidden", "lg:mt-0 lg:block")}>
            <FilterRail s={s} />
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-2">
              {likeOf ? (
                <>
                  Creators like <b className="font-semibold text-ink">{likeOf.name}</b> ·{" "}
                  <button className="font-medium text-accent-ink underline underline-offset-2" onClick={() => setLikeOf(null)}>
                    back to results
                  </button>
                </>
              ) : (
                <>
                  <b className="font-semibold tabular-nums text-ink">{list.length}</b> of {s.all.length} creators
                </>
              )}
            </p>
            <label className="flex items-center gap-2 text-xs text-muted">
              Sort by
              <select
                className="rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] text-ink"
                value={s.sort}
                onChange={(e) => s.setSort(e.target.value as SortKey)}
              >
                <option value="score">Creator Score</option>
                <option value="views">Expected views</option>
                <option value="er">Engagement</option>
                <option value="followers">Followers</option>
                <option value="trend">Rising</option>
              </select>
            </label>
          </div>
          <ActiveFilters s={s} />
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
              <p className="font-semibold">No creators match all of that</p>
              <p className="mt-1 text-[13px] text-muted">Remove a filter on the left, or widen a range.</p>
              <button className={cx(buttonClass.secondary, "mt-4")} onClick={s.reset}>
                Clear everything
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {list.map((p, i) => (
                <div key={p.id} className="relative min-w-0">
                  <CreatorCard
                    p={p}
                    i={i}
                    saved={s.saved.has(p.id)}
                    onSave={() => s.toggleSave(p.id)}
                    onOpen={() => setOpenId(p.id)}
                    onLike={() => {
                      setLikeOf(p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  <label className="absolute right-[68px] top-5 flex cursor-pointer items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-line hover:text-ink">
                    <input
                      type="checkbox"
                      className="accent-[#f75115]"
                      checked={compare.includes(p.id)}
                      onChange={() => setCompare((c) => toggleIn(c, p.id).slice(-4))}
                    />
                    Compare
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {compare.length > 0 && !open && (
        <div className="proto-rise fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl bg-[#171715] px-4 py-2.5 text-white shadow-[0_12px_40px_rgba(0,0,0,.3)]">
          <span className="flex">
            {chosen.map((p, i) => (
              <span key={p.id} style={{ marginLeft: i ? -8 : 0 }}>
                <Avatar p={p} size={30} ring />
              </span>
            ))}
          </span>
          <span className="text-[13px]">{compare.length} to compare</span>
          <button
            onClick={() => setComparing(true)}
            disabled={compare.length < 2}
            className="rounded-lg bg-[#f75115] px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40"
          >
            Compare
          </button>
          <button onClick={() => setCompare([])} className="text-[13px] text-white/60 hover:text-white">
            Clear
          </button>
        </div>
      )}
      <Drawer open={comparing} onClose={() => setComparing(false)} width={980}>
        <Compare list={chosen} onClose={() => setComparing(false)} />
      </Drawer>

      <Drawer open={!!open} onClose={() => setOpenId(null)} width={660} dark>
        {open && (
          <VerdictDrawer
            p={open}
            all={s.all}
            onClose={() => setOpenId(null)}
            onOpen={(x) => setOpenId(x.id)}
            onReport={() => {
              setReport(open);
              setOpenId(null);
              window.scrollTo({ top: 0 });
            }}
            extras={{
              nav:
                index >= 0
                  ? {
                      index,
                      total: list.length,
                      onPrev: () => index > 0 && setOpenId(list[index - 1].id),
                      onNext: () => index < list.length - 1 && setOpenId(list[index + 1].id),
                    }
                  : undefined,
              compare: { on: compare.includes(open.id), toggle: () => setCompare((c) => toggleIn(c, open.id).slice(-4)) },
              saved: { on: s.saved.has(open.id), toggle: () => s.toggleSave(open.id) },
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

/** Every filter that's on, as a removable chip, so nothing hides in a collapsed group. */
function ActiveFilters({ s }: { s: Search }) {
  const f = s.filters;
  const set = (patch: Partial<Filters>) => s.setFilters({ ...f, ...patch });
  const chips: { label: string; off: () => void }[] = [
    ...f.platforms.map((p) => ({
      label: p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Instagram",
      off: () => set({ platforms: toggleIn(f.platforms, p) }),
    })),
    ...f.sizes.map((b) => ({ label: SIZE_BANDS.find((x) => x.id === b)!.label.split(" · ")[0], off: () => set({ sizes: toggleIn(f.sizes, b) }) })),
    ...f.niches.map((n) => ({ label: n, off: () => set({ niches: toggleIn(f.niches, n) }) })),
    ...f.cities.filter((c) => CITIES.includes(c)).map((c) => ({ label: c, off: () => set({ cities: toggleIn(f.cities, c) }) })),
    ...(f.minViews !== null || f.maxViews !== null
      ? [
          {
            label: `Views ${f.minViews !== null ? fmt(f.minViews) : "0"}–${f.maxViews !== null ? fmt(f.maxViews) : "any"}`,
            off: () => set({ minViews: null, maxViews: null }),
          },
        ]
      : []),
    ...(f.minEr !== null || f.maxEr !== null
      ? [
          {
            label: `Engagement ${f.minEr !== null ? `${+(f.minEr * 100).toFixed(1)}%` : "0%"}–${f.maxEr !== null ? `${+(f.maxEr * 100).toFixed(1)}%` : "any"}`,
            off: () => set({ minEr: null, maxEr: null }),
          },
        ]
      : []),
    ...(f.minScore ? [{ label: `Score ${f.minScore}+`, off: () => set({ minScore: null }) }] : []),
    ...(f.noFlags ? [{ label: "No warning flags", off: () => set({ noFlags: false }) }] : []),
    ...(f.emailOnly ? [{ label: "Has email", off: () => set({ emailOnly: false }) }] : []),
    ...(f.activeOnly ? [{ label: "Posted this fortnight", off: () => set({ activeOnly: false }) }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={c.off}
          className="proto-rise inline-flex items-center gap-1 rounded-full bg-[#171715] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#171715]/80"
        >
          {c.label} <span aria-hidden>×</span>
          <span className="sr-only">remove</span>
        </button>
      ))}
      <button onClick={s.reset} className="text-xs text-muted underline">
        Clear all
      </button>
    </div>
  );
}
