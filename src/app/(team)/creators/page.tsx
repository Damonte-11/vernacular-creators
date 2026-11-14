"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreatorCard } from "@/components/creators/card";
import { CompareView } from "@/components/creators/compare";
import { Avatar, SideDrawer } from "@/components/creators/media";
import { ProfileDrawer } from "@/components/creators/profile-drawer";
import { FilterColumn } from "@/components/creators/rail";
import { Icon } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { SIZE_BANDS } from "@config/size-bands";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { creatorView, filterViews, NO_FILTERS, readQuery, similar, sortViews, type ViewFilters, type ViewSort } from "@/lib/creator-view";
import { formatFull, formatNumber } from "@/lib/format";

const STEP = 24;
const EXAMPLES = ["Food creators in Lagos with high engagement", "Comedy on TikTok over 100k", "Safe fashion creators in Abuja with email"];
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** All creators: describe who you need or filter, see them by their content, open a quick look, compare. */
export default function CreatorsPage() {
  const analyses = useAnalyses();
  const all = useMemo(() => analyses.map((a) => creatorView(a, NOW)), [analyses]);
  const [f, setF] = useState<ViewFilters>(NO_FILTERS);
  const [sort, setSort] = useState<ViewSort>("score");
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [shown, setShown] = useState(STEP);
  const [likeOf, setLikeOf] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const niches = useMemo(() => [...new Set(all.flatMap((x) => (x.niche ? [x.niche] : [])))], [all]);
  const cities = useMemo(() => [...new Set(all.flatMap((x) => (x.city ? [x.city] : [])))], [all]);
  const like = likeOf ? all.find((x) => x.id === likeOf) : null;
  const list = useMemo(() => (like ? similar(like, all, 12) : sortViews(filterViews(all, f), sort)), [like, all, f, sort]);
  const visible = list.slice(0, shown);
  const index = list.findIndex((x) => x.id === openId);
  const open = openId ? (all.find((x) => x.id === openId) ?? null) : null;
  const chosen = all.filter((x) => compare.includes(x.id));

  function set(next: ViewFilters) {
    setF(next);
    setShown(STEP);
    setLikeOf(null);
  }
  function ask(q: string) {
    setQuery(q);
    const r = readQuery(q, niches, cities);
    setChips(q.trim() ? r.chips : []);
    set({ ...NO_FILTERS, ...r.filters });
  }
  function reset() {
    setQuery("");
    setChips([]);
    set(NO_FILTERS);
  }

  // The search box in the side menu sends people here with ?q=… or, when already here, an event.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) set({ ...NO_FILTERS, text: q });
    const onSearch = (e: Event) => set({ ...NO_FILTERS, text: (e as CustomEvent<string>).detail });
    window.addEventListener("creator-search", onSearch);
    return () => window.removeEventListener("creator-search", onSearch);
  }, []);

  return (
    <div className="space-y-5">
      <SearchBand query={query} chips={chips} total={all.length} onAsk={ask} onClear={reset} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div>
          <button onClick={() => setShowFilters((s) => !s)} className={cx(buttonClass.secondary, "w-full lg:hidden")} aria-expanded={showFilters}>
            {showFilters ? "Hide filters" : "Filters"}
          </button>
          <div className={cx(showFilters ? "mt-3 block" : "hidden", "lg:mt-0 lg:block")}>
            <FilterColumn all={all} f={f} set={set} onReset={reset} />
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-2" aria-live="polite">
              {like ? (
                <>
                  Creators like <b className="font-semibold text-ink">{like.name}</b> ·{" "}
                  <button className="font-medium text-accent-ink underline underline-offset-2" onClick={() => setLikeOf(null)}>
                    back to results
                  </button>
                </>
              ) : (
                <>
                  <b className="font-semibold tabular-nums text-ink">{formatFull(list.length)}</b> of {formatFull(all.length)} creators
                </>
              )}
            </p>
            <span className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted">
                Sort by
                <select
                  className="rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] text-ink"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ViewSort)}
                >
                  <option value="score">Creator Score</option>
                  <option value="views">Expected views</option>
                  <option value="er">Engagement</option>
                  <option value="followers">Followers</option>
                  <option value="trend">Rising</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </label>
              <Link href="/add" className={buttonClass.primary}>
                <Icon name="plus" size={15} /> Add creators
              </Link>
            </span>
          </div>
          <ActiveChips f={f} set={set} onClear={reset} />

          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
              <p className="font-semibold">{all.length ? "No creators match all of that" : "No creators saved yet"}</p>
              <p className="mt-1 text-[13px] text-muted">
                {all.length ? "Remove a filter, widen a range, or ask in different words." : "Look creators up by handle to start the database."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {all.length > 0 && (
                  <button className={buttonClass.secondary} onClick={reset}>
                    Clear everything
                  </button>
                )}
                <Link href="/add" className={buttonClass.primary}>
                  Add creators
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {visible.map((v, i) => (
                  <CreatorCard
                    key={v.id}
                    v={v}
                    i={i % STEP}
                    inCompare={compare.includes(v.id)}
                    onCompare={() => setCompare((c) => toggle(c, v.id).slice(-4))}
                    onOpen={() => setOpenId(v.id)}
                    onLike={() => {
                      setLikeOf(v.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
              {list.length > shown && (
                <button className={cx(buttonClass.secondary, "mx-auto flex")} onClick={() => setShown((s) => s + STEP)}>
                  Show {Math.min(STEP, list.length - shown)} more of {formatFull(list.length - shown)}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {compare.length > 0 && !open && !comparing && (
        <div className="cr-rise fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl bg-brand px-4 py-2.5 text-white shadow-[0_12px_40px_rgba(0,0,0,.3)]">
          <span className="flex">
            {chosen.map((v, i) => (
              <span key={v.id} style={{ marginLeft: i ? -8 : 0 }}>
                <Avatar v={v} size={30} ring />
              </span>
            ))}
          </span>
          <span className="text-[13px]">{compare.length < 2 ? "Pick one more to compare" : `${compare.length} to compare`}</span>
          <button
            onClick={() => setComparing(true)}
            disabled={compare.length < 2}
            className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40"
          >
            Compare
          </button>
          <button onClick={() => setCompare([])} className="text-[13px] text-white/60 hover:text-white">
            Clear
          </button>
        </div>
      )}
      <SideDrawer open={comparing} onClose={() => setComparing(false)} width={980}>
        <CompareView
          list={chosen}
          onClose={() => setComparing(false)}
          onOpen={(id) => {
            setComparing(false);
            setOpenId(id);
          }}
        />
      </SideDrawer>
      <SideDrawer open={!!open} onClose={() => setOpenId(null)} dark>
        {open && (
          <ProfileDrawer
            v={open}
            all={all}
            onClose={() => setOpenId(null)}
            onOpen={setOpenId}
            compare={{ on: compare.includes(open.id), toggle: () => setCompare((c) => toggle(c, open.id).slice(-4)) }}
            nav={
              index >= 0
                ? {
                    index,
                    total: list.length,
                    onPrev: () => index > 0 && setOpenId(list[index - 1].id),
                    onNext: () => index < list.length - 1 && setOpenId(list[index + 1].id),
                  }
                : undefined
            }
          />
        )}
      </SideDrawer>
    </div>
  );
}

function SearchBand({
  query,
  chips,
  total,
  onAsk,
  onClear,
}: {
  query: string;
  chips: string[];
  total: number;
  onAsk: (q: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState(query);
  useEffect(() => setQ(query), [query]);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-6 text-white sm:px-8 sm:py-7">
      <span className="pointer-events-none absolute right-0 top-0 hidden h-20 w-20 bg-accent sm:block" aria-hidden />
      <span className="pointer-events-none absolute right-20 top-20 hidden h-20 w-20 bg-rail sm:block" aria-hidden />
      <h1 className="relative max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">Who are you looking for?</h1>
      <p className="relative mt-1 text-[13px] text-white/60">
        {formatFull(total)} creators saved. Describe who you need: niche, city, platform, size, engagement, email.
      </p>
      <form
        className="relative mt-4 flex max-w-2xl items-center gap-2 rounded-xl bg-surface p-1.5 pl-4 text-ink shadow-[0_8px_30px_rgba(0,0,0,.25)] ring-2 ring-transparent focus-within:ring-accent"
        onSubmit={(e) => {
          e.preventDefault();
          onAsk(q);
        }}
      >
        <Icon name="search" size={17} className="text-muted" />
        <input
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. food creators in Lagos with high engagement"
          aria-label="Describe the creators you need"
        />
        <button className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[.97]">Find creators</button>
      </form>
      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
        {chips.length ? (
          <>
            <span className="text-white/60">Understood as</span>
            {chips.map((c) => (
              <span key={c} className="cr-rise rounded-full bg-white/10 px-2.5 py-1 font-medium text-white ring-1 ring-white/15">
                {c}
              </span>
            ))}
            <button className="text-white/60 underline underline-offset-2 hover:text-white" onClick={onClear}>
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="text-white/60">Try</span>
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setQ(e);
                  onAsk(e);
                }}
                className="rounded-full bg-white/10 px-2.5 py-1 text-white/85 ring-1 ring-white/10 transition-colors hover:bg-white/20"
              >
                {e}
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

/** Every filter that's on as a removable chip. */
function ActiveChips({ f, set, onClear }: { f: ViewFilters; set: (f: ViewFilters) => void; onClear: () => void }) {
  const pct = (v: number) => `${+(v * 100).toFixed(1)}%`;
  const chips: { label: string; off: Partial<ViewFilters> }[] = [
    ...(f.text ? [{ label: `“${f.text}”`, off: { text: "" } }] : []),
    ...f.platforms.map((p) => ({ label: { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" }[p], off: { platforms: toggle(f.platforms, p) } })),
    ...f.bands.map((b) => ({ label: SIZE_BANDS.find((x) => x.id === b)!.label, off: { bands: toggle(f.bands, b) } })),
    ...f.niches.map((n) => ({ label: n, off: { niches: toggle(f.niches, n) } })),
    ...f.cities.map((c) => ({ label: c, off: { cities: toggle(f.cities, c) } })),
    ...(f.minViews !== null || f.maxViews !== null
      ? [
          {
            label: `Expected views ${formatNumber(f.minViews ?? 0)}–${f.maxViews !== null ? formatNumber(f.maxViews) : "any"}`,
            off: { minViews: null, maxViews: null },
          },
        ]
      : []),
    ...(f.minEr !== null || f.maxEr !== null
      ? [{ label: `Engagement ${pct(f.minEr ?? 0)}–${f.maxEr !== null ? pct(f.maxEr) : "any"}`, off: { minEr: null, maxEr: null } }]
      : []),
    ...(f.minScore ? [{ label: `Score ${f.minScore}+`, off: { minScore: null } }] : []),
    ...(f.noFlags ? [{ label: "No warning flags", off: { noFlags: false } }] : []),
    ...(f.emailOnly ? [{ label: "Has email", off: { emailOnly: false } }] : []),
    ...(f.activeOnly ? [{ label: "Posted this fortnight", off: { activeOnly: false } }] : []),
    ...(f.found ? [{ label: f.found === "auto" ? "Found by discovery" : "Added by the team", off: { found: "" as const } }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={() => set({ ...f, ...c.off })}
          className="cr-rise inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand/80"
        >
          {c.label} <span aria-hidden>×</span>
          <span className="sr-only">remove filter</span>
        </button>
      ))}
      <button onClick={onClear} className="text-xs text-muted underline">
        Clear all
      </button>
    </div>
  );
}
