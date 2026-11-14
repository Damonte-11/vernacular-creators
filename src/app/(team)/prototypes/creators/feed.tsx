"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { CITIES, fmt, lookalikes, NICHES, pct, SIZE_BANDS, type Pro, type SortKey } from "./data";
import { Avatar, CollabDots, Cover, Drawer, ScoreRing, toggleIn, Trend, useSearch, type Search } from "./bits";
import { CrmPanel } from "./crm";
import { AudienceSignals, ChorusHistory, Collabs, GrowthChart, LookalikeList, ViewsBars } from "./report-parts";

const EXAMPLES = ["Food creators in Lagos with high engagement", "Comedy skits on TikTok over 100k", "Safe fashion creators in Abuja with email"];

/** Direction 1, Feed: creators shown by their content first. */
export default function Feed() {
  const s = useSearch();
  const [open, setOpen] = useState<Pro | null>(null);
  const [report, setReport] = useState<Pro | null>(null);
  const [likeOf, setLikeOf] = useState<Pro | null>(null);
  const list = useMemo(() => (likeOf ? lookalikes(likeOf, s.all, 9) : s.results), [likeOf, s.all, s.results]);

  if (report) return <FeedReport p={report} all={s.all} onBack={() => setReport(null)} onOpen={(x) => setReport(x)} />;
  return (
    <div className="space-y-5">
      <SearchHero s={s} onAsk={() => setLikeOf(null)} />
      <FilterChips s={s} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
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
              <b className="font-semibold tabular-nums text-ink">{list.length}</b> creators
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
            <option value="followers">Followers</option>
            <option value="er">Engagement</option>
            <option value="views">Typical views</option>
            <option value="trend">Rising</option>
          </select>
        </label>
      </div>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-semibold">No creators match all of that</p>
          <p className="mt-1 text-[13px] text-muted">Remove a filter, or ask in different words.</p>
          <button className={cx(buttonClass.secondary, "mt-4")} onClick={s.reset}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p, i) => (
            <CreatorCard
              key={p.id}
              p={p}
              i={i}
              saved={s.saved.has(p.id)}
              onSave={() => s.toggleSave(p.id)}
              onOpen={() => setOpen(p)}
              onLike={() => {
                setLikeOf(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      )}
      <Drawer open={!!open} onClose={() => setOpen(null)} width={760}>
        {open && (
          <FeedDrawer
            key={open.id}
            p={open}
            all={s.all}
            saved={s.saved.has(open.id)}
            onSave={() => s.toggleSave(open.id)}
            onClose={() => setOpen(null)}
            onOpen={(x) => setOpen(x)}
            onReport={() => {
              setReport(open);
              setOpen(null);
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

export function SearchHero({ s, onAsk }: { s: Search; onAsk: () => void }) {
  const [q, setQ] = useState(s.query);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#171715] px-5 py-6 text-white sm:px-8 sm:py-8">
      <span className="pointer-events-none absolute right-0 top-0 hidden h-24 w-24 bg-[#f75115] sm:block" aria-hidden />
      <span className="pointer-events-none absolute right-24 top-24 hidden h-24 w-24 bg-[#f2eee3] sm:block" aria-hidden />
      <h1 className="relative max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">Who are you looking for?</h1>
      <p className="relative mt-1 text-[13px] text-white/60">Describe them the way you would to a colleague. Niche, city, platform, size, engagement, email.</p>
      <form
        className="relative mt-4 flex max-w-2xl items-center gap-2 rounded-xl bg-white p-1.5 pl-4 text-ink shadow-[0_8px_30px_rgba(0,0,0,.25)] ring-2 ring-transparent focus-within:ring-[#f75115]"
        onSubmit={(e) => {
          e.preventDefault();
          s.ask(q);
          onAsk();
        }}
      >
        <Icon name="search" size={17} className="text-muted" />
        <input
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. food creators in Lagos with high engagement"
        />
        <button className="rounded-lg bg-[#f75115] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[.97]">
          Find creators
        </button>
      </form>
      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
        {s.chips.length ? (
          <>
            <span className="text-white/60">Understood as</span>
            {s.chips.map((c) => (
              <span key={c} className="proto-rise rounded-full bg-white/10 px-2.5 py-1 font-medium text-white ring-1 ring-white/15">
                {c}
              </span>
            ))}
            <button
              className="text-white/60 underline underline-offset-2 hover:text-white"
              onClick={() => {
                setQ("");
                s.reset();
              }}
            >
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
                  s.ask(e);
                  onAsk();
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

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
        on ? "bg-[#171715] text-white" : "bg-surface-2 text-ink-2 ring-1 ring-line hover:bg-[#ece7db] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function FilterChips({ s }: { s: Search }) {
  const f = s.filters;
  const set = s.setFilters;
  return (
    <div className="space-y-2">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0">
        {(["instagram", "tiktok", "youtube"] as const).map((p) => (
          <Chip key={p} on={f.platforms.includes(p)} onClick={() => set({ ...f, platforms: toggleIn(f.platforms, p) })}>
            <Icon name={p} size={14} /> {p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Instagram"}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        {SIZE_BANDS.map((b) => (
          <Chip key={b.id} on={f.sizes.includes(b.id)} onClick={() => set({ ...f, sizes: toggleIn(f.sizes, b.id) })}>
            {b.label.split(" · ")[0]}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        <Chip on={f.minEr !== null} onClick={() => set({ ...f, minEr: f.minEr === null ? 0.03 : null })}>
          Engagement 3%+
        </Chip>
        <Chip on={f.noFlags} onClick={() => set({ ...f, noFlags: !f.noFlags })}>
          No warning flags
        </Chip>
        <Chip on={f.emailOnly} onClick={() => set({ ...f, emailOnly: !f.emailOnly })}>
          Has email
        </Chip>
        <Chip on={f.activeOnly} onClick={() => set({ ...f, activeOnly: !f.activeOnly })}>
          Posted this fortnight
        </Chip>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0">
        {NICHES.map((n) => (
          <Chip key={n} on={f.niches.includes(n)} onClick={() => set({ ...f, niches: toggleIn(f.niches, n) })}>
            {n}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        {CITIES.map((c) => (
          <Chip key={c} on={f.cities.includes(c)} onClick={() => set({ ...f, cities: toggleIn(f.cities, c) })}>
            {c}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function CreatorCard({
  p,
  i,
  saved,
  onSave,
  onOpen,
  onLike,
}: {
  p: Pro;
  i: number;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  onLike: () => void;
}) {
  return (
    <article
      className="proto-rise group flex flex-col rounded-2xl border border-line bg-surface p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(23,23,21,.10)]"
      style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar p={p} size={44} />
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-semibold group-hover:underline">{p.name}</span>
          <span className="block truncate text-xs text-muted">
            @{p.handle} · {p.niche} · {p.city}
          </span>
        </button>
        <ScoreRing score={p.score} />
      </div>
      <button onClick={onOpen} className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Open ${p.name}`}>
        {p.recent.slice(0, 4).map((post, k) => (
          <span key={post.id} className="pointer-events-none">
            <Cover post={post} className="aspect-[3/4]" label={k === 0 ? "Latest" : undefined} />
          </span>
        ))}
      </button>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <dt className="text-xs text-muted">Followers</dt>
          <dd className="font-semibold tabular-nums">{fmt(p.followers)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Engagement</dt>
          <dd className="font-semibold tabular-nums">{pct(p.er)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Typical views</dt>
          <dd className="flex items-baseline gap-1 font-semibold tabular-nums">
            {fmt(p.avgViews)} <Trend change={p.trend} />
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <CollabDots p={p} />
        <div className="flex gap-1">
          <button onClick={onLike} className={buttonClass.ghost} title="Find creators like this one">
            Lookalikes
          </button>
          <button onClick={onSave} className={cx(buttonClass.secondary, saved && "border-[#171715] bg-[#171715] text-white hover:bg-[#171715]/85")}>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      {p.flags.length > 0 && (
        <p className="mt-2 text-xs text-bad">{p.flags.length === 1 ? p.flags[0].message : `${p.flags.length} warnings: ${p.flags[0].message.toLowerCase()}`}</p>
      )}
    </article>
  );
}

type Tab = "content" | "brands" | "audience" | "us" | "like";

function FeedDrawer({
  p,
  all,
  saved,
  onSave,
  onClose,
  onOpen,
  onReport,
}: {
  p: Pro;
  all: Pro[];
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onOpen: (p: Pro) => void;
  onReport: () => void;
}) {
  const [tab, setTab] = useState<Tab>("content");
  const tabs: { id: Tab; label: string }[] = [
    { id: "content", label: "Content" },
    { id: "brands", label: `Brands · ${p.collabs.length}` },
    { id: "audience", label: "Audience" },
    { id: "us", label: "With us" },
    { id: "like", label: "Lookalikes" },
  ];
  return (
    <>
      <div className="relative shrink-0">
        <div className="grid h-36 grid-cols-3 gap-0.5">
          {p.best.slice(0, 3).map((x) => (
            <Cover key={x.id} post={x} className="h-full rounded-none" />
          ))}
        </div>
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60" aria-label="Close">
          <Icon name="close" size={16} />
        </button>
        <div className="absolute inset-x-5 bottom-3 flex items-end gap-3 text-white">
          <Avatar p={p} size={56} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold tracking-tight">{p.name}</p>
            <p className="truncate text-xs text-white/75">
              @{p.handle} · {p.niche} · {p.city}
            </p>
          </div>
          <span className="rounded-xl bg-white p-1">
            <ScoreRing score={p.score} size={48} />
          </span>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-4 divide-x divide-line border-b border-line text-center">
        {[
          ["Followers", fmt(p.followers)],
          ["Engagement", pct(p.er)],
          ["Typical views", fmt(p.avgViews)],
          ["Posts a week", p.postsPerWeek.toFixed(1)],
        ].map(([k, v]) => (
          <div key={k} className="px-2 py-3">
            <p className="text-lg font-semibold tabular-nums tracking-tight">{v}</p>
            <p className="text-xs text-muted">{k}</p>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 gap-4 overflow-x-auto border-b border-line px-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px shrink-0 border-b-2 py-2.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "border-[#f75115] text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div key={tab} className="proto-rise min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "content" && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Views on the last 12 posts · orange beat their usual by 30%+</p>
              <ViewsBars p={p} height={130} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Best posts</p>
              <div className="grid grid-cols-4 gap-1.5">
                {p.best.slice(0, 8).map((x) => (
                  <Cover key={x.id} post={x} className="aspect-[3/4]" />
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "brands" && (
          <div className="space-y-3">
            {p.collabs.length > 0 && <p className="text-[13px] text-ink-2">{p.paidShare}% of their engagement comes from paid or brand posts.</p>}
            <Collabs p={p} />
          </div>
        )}
        {tab === "audience" && (
          <div className="space-y-3">
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2 ring-1 ring-line">
              Estimated from the people who comment on their posts, not from the platform.
            </p>
            <AudienceSignals p={p} compact />
          </div>
        )}
        {tab === "us" && (
          <div className="space-y-5">
            <ChorusHistory p={p} />
            <CrmPanel p={p} />
          </div>
        )}
        {tab === "like" && <LookalikeList list={lookalikes(p, all)} onOpen={onOpen} />}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-5 py-3">
        <button onClick={onSave} className={cx(buttonClass.secondary, saved && "border-[#171715]")}>
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button onClick={onReport} className="rounded-lg bg-[#f75115] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[.97]">
          Open full report →
        </button>
      </div>
    </>
  );
}

function FeedReport({ p, all, onBack, onOpen }: { p: Pro; all: Pro[]; onBack: () => void; onOpen: (p: Pro) => void }) {
  return (
    <article className="proto-rise space-y-6">
      <div className="no-print flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <Icon name="back" size={14} /> Back to search
        </button>
        <button onClick={() => window.print()} className={buttonClass.secondary}>
          <Icon name="download" size={14} /> Download PDF
        </button>
      </div>
      <header className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-end">
          <div className="flex items-center gap-3">
            <Avatar p={p} size={64} />
            <ScoreRing score={p.score} size={64} stroke={5} />
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">{p.name}</h1>
          <p className="mt-1 text-[15px] text-muted">
            @{p.handle} · {p.niche} · {p.city}
          </p>
          <p className="mt-4 max-w-lg text-lg leading-snug">{p.verdict}</p>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px]">
            {[
              ["Followers", fmt(p.followers)],
              ["Engagement", pct(p.er)],
              ["Typical views", fmt(p.avgViews)],
              ["Reach of followers", p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}%` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{v}</p>
                <p className="text-xs text-muted">{k}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          {p.best.slice(0, 5).map((x, i) => (
            <Cover key={x.id} post={x} big={i === 0} className={cx(i === 0 ? "col-span-2 row-span-2" : "", "min-h-[120px]")} />
          ))}
        </div>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Followers over the last year" note="Dotted: where the trend is heading">
          <GrowthChart p={p} />
        </Panel>
        <Panel title="Views on the last 12 posts" note={`Usual: ${fmt(p.avgViews)}`}>
          <ViewsBars p={p} height={200} />
        </Panel>
      </section>
      <Panel title="Their audience, from the comments" note="Estimates from commenters, not platform data">
        <AudienceSignals p={p} />
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Brands they've worked with">
          <Collabs p={p} />
        </Panel>
        <Panel title="With Vernacular">
          <ChorusHistory p={p} />
        </Panel>
      </section>
      <Panel title="Creators like them">
        <LookalikeList list={lookalikes(p, all)} onOpen={onOpen} />
      </Panel>
    </article>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}
