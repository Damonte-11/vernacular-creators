"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Icon } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { CITIES, fmt, lookalikes, NICHES, pct, SIZE_BANDS, type Pro, type SortKey } from "./data";
import { Avatar, Cover, Drawer, RangeHistogram, ScoreRing, Spark, toggleIn, Trend, useSearch, type Search } from "./bits";
import { CrmPanel } from "./crm";
import { AudienceSignals, ChorusHistory, Collabs, GrowthChart, LookalikeList, ViewsBars } from "./report-parts";

/** Direction 2, Signal: a dense ranked table with mini charts, keyboard moves and side-by-side compare. */
export default function Signal() {
  const s = useSearch();
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState<Pro | null>(null);
  const [report, setReport] = useState<Pro | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const cmd = useRef<HTMLInputElement>(null);
  const rows = s.results;

  // j / k move, Enter opens, x adds to compare, / or ⌘K jumps to the command bar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        cmd.current?.focus();
        return;
      }
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || open || report) return;
      if (e.key === "/") {
        e.preventDefault();
        cmd.current?.focus();
      } else if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(rows.length - 1, c + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter" && rows[cursor]) setOpen(rows[cursor]);
      else if (e.key === "x" && rows[cursor]) setCompare((c) => toggleIn(c, rows[cursor].id).slice(-4));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cursor, open, report]);

  const bandAvg = useMemo(() => {
    const m = new Map<string, { er: number; views: number }>();
    for (const b of SIZE_BANDS) {
      const xs = s.all.filter((x) => x.followers >= b.min && x.followers < b.max);
      m.set(b.id, { er: avg(xs.map((x) => x.er ?? 0)), views: avg(xs.map((x) => x.viewsRatio ?? 0)) });
    }
    return (p: Pro) => m.get(SIZE_BANDS.find((b) => p.followers >= b.min && p.followers < b.max)!.id)!;
  }, [s.all]);

  if (report) return <SignalReport p={report} all={s.all} band={bandAvg(report)} onBack={() => setReport(null)} onOpen={setReport} />;
  const chosen = s.all.filter((x) => compare.includes(x.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
      <FilterRail s={s} />
      <div className="min-w-0 space-y-3">
        <form
          className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-1.5 focus-within:border-[#171715] focus-within:ring-2 focus-within:ring-[#171715]/10"
          onSubmit={(e) => {
            e.preventDefault();
            s.ask(cmd.current?.value ?? "");
            setCursor(0);
          }}
        >
          <Icon name="search" size={16} className="text-muted" />
          <input
            ref={cmd}
            defaultValue={s.query}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-muted"
            placeholder="Ask: comedy skits in Lagos over 100k with email…"
          />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 text-[11px] text-muted">⌘K</kbd>
        </form>
        {s.chips.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted">Understood as</span>
            {s.chips.map((c) => (
              <span key={c} className="rounded-md bg-[#171715] px-2 py-0.5 font-medium text-white">
                {c}
              </span>
            ))}
            <button className="text-muted underline" onClick={s.reset}>
              clear
            </button>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            <b className="text-[13px] font-semibold tabular-nums text-ink">{rows.length}</b> creators · <kbd className="font-mono">j</kbd>/
            <kbd className="font-mono">k</kbd> move · <kbd className="font-mono">Enter</kbd> open · <kbd className="font-mono">x</kbd> compare
          </span>
          <span className="flex rounded-lg bg-surface-2 p-0.5 ring-1 ring-line">
            {(
              [
                ["score", "Score"],
                ["followers", "Followers"],
                ["er", "Engagement"],
                ["views", "Views"],
                ["trend", "Rising"],
              ] as [SortKey, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => s.setSort(k)}
                className={cx(
                  "rounded-md px-2 py-1 font-medium",
                  s.sort === k ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
                )}
              >
                {l}
              </button>
            ))}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="w-8 py-2 pl-3" />
                <th className="py-2 pr-3 font-medium">Creator</th>
                <th className="px-3 py-2 text-right font-medium">Followers</th>
                <th className="px-3 py-2 font-medium">Engagement vs size</th>
                <th className="px-3 py-2 text-right font-medium">Typical views</th>
                <th className="px-3 py-2 font-medium">Last 12 posts</th>
                <th className="px-3 py-2 text-right font-medium">Posts/wk</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p, i) => {
                const b = bandAvg(p);
                const active = i === cursor;
                const inCompare = compare.includes(p.id);
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => setOpen(p)}
                    className={cx("cursor-pointer transition-colors duration-100", active ? "bg-[#fff4ee]" : "hover:bg-surface-2")}
                    style={active ? { boxShadow: "inset 2px 0 0 #f75115" } : undefined}
                  >
                    <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={inCompare}
                        onChange={() => setCompare((c) => toggleIn(c, p.id).slice(-4))}
                        className="accent-[#f75115]"
                        aria-label={`Compare ${p.name}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar p={p} size={32} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            {p.name}
                            {p.flags.length > 0 && (
                              <span title={p.flags.map((f) => f.message).join("\n")} className="rounded bg-bad-soft px-1 text-[10px] font-semibold text-bad">
                                {p.flags.length} flag{p.flags.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted">
                            {p.niche} · {p.city}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(p.followers)}</td>
                    <td className="px-3 py-2">
                      <Versus value={p.er ?? 0} mean={b.er} label={pct(p.er)} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="font-medium">{fmt(p.avgViews)}</span> <Trend change={p.trend} />
                      <span className="block text-xs text-muted">{p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}% of followers` : "no views"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Spark values={p.viewSeries} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.postsPerWeek.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">
                      <ScoreRing score={p.score} size={34} stroke={3} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      <Drawer open={!!open} onClose={() => setOpen(null)} width={860}>
        {open && (
          <SignalDrawer
            key={open.id}
            p={open}
            all={s.all}
            band={bandAvg(open)}
            onClose={() => setOpen(null)}
            onOpen={setOpen}
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

/** "20k", "1.5m" or "20000" → a number. */
const parseCount = (t: string) => {
  const m = t
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^([\d.]+)\s*(k|m)?$/);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1));
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** A bar for this creator with a tick at the average for creators their size. */
function Versus({ value, mean, label }: { value: number; mean: number; label: string }) {
  const max = Math.max(value, mean) * 1.25 || 1;
  const above = value >= mean;
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-1.5 w-24 rounded-full bg-line">
        <span
          className={cx("proto-grow absolute inset-y-0 left-0 rounded-full", above ? "bg-[#f75115]" : "bg-[#b9b3a4]")}
          style={{ width: `${(value / max) * 100}%` }}
        />
        <span
          className="absolute -top-1 h-3.5 w-0.5 rounded bg-[#171715]"
          style={{ left: `${(mean / max) * 100}%` }}
          title={`Average for this size: ${(mean * 100).toFixed(1)}%`}
        />
      </span>
      <span className="w-12 font-medium tabular-nums">{label}</span>
    </span>
  );
}

export function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return (
    <div className="border-b border-line py-3">
      <button onClick={() => setO(!o)} className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-2">
        {title} <span className={cx("transition-transform", o && "rotate-90")}>›</span>
      </button>
      {o && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  );
}

export function Check({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: React.ReactNode; count: number }) {
  return (
    <label className={cx("flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-2", count === 0 && !on && "opacity-40")}>
      <input type="checkbox" checked={on} onChange={onClick} className="accent-[#f75115]" />
      <span className="flex-1">{label}</span>
      <span className="text-xs tabular-nums text-muted">{count}</span>
    </label>
  );
}

export function FilterRail({ s }: { s: Search }) {
  const f = s.filters;
  const set = s.setFilters;
  const n = (pred: (p: Pro) => boolean) => s.all.filter(pred).length;
  return (
    <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 [scrollbar-width:thin]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        <button className="text-xs text-muted underline" onClick={s.reset}>
          Reset
        </button>
      </div>
      <Group title="Platform">
        {(["instagram", "tiktok", "youtube"] as const).map((p) => (
          <Check
            key={p}
            on={f.platforms.includes(p)}
            onClick={() => set({ ...f, platforms: toggleIn(f.platforms, p) })}
            label={
              <span className="flex items-center gap-1.5">
                <Icon name={p} size={13} /> {p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Instagram"}
              </span>
            }
            count={n((x) => x.platform === p)}
          />
        ))}
      </Group>
      <Group title="Size">
        {SIZE_BANDS.map((b) => (
          <Check
            key={b.id}
            on={f.sizes.includes(b.id)}
            onClick={() => set({ ...f, sizes: toggleIn(f.sizes, b.id) })}
            label={b.label}
            count={n((x) => x.followers >= b.min && x.followers < b.max)}
          />
        ))}
      </Group>
      <Group title="Niche">
        {NICHES.map((v) => (
          <Check key={v} on={f.niches.includes(v)} onClick={() => set({ ...f, niches: toggleIn(f.niches, v) })} label={v} count={n((x) => x.niche === v)} />
        ))}
      </Group>
      <Group title="City">
        {CITIES.map((v) => (
          <Check key={v} on={f.cities.includes(v)} onClick={() => set({ ...f, cities: toggleIn(f.cities, v) })} label={v} count={n((x) => x.city === v)} />
        ))}
      </Group>
      <Group title="Expected views">
        <p className="px-1.5 pb-1 text-xs text-muted">Typical views per post</p>
        <RangeHistogram
          values={s.all.map((x) => x.avgViews ?? -1).filter((v) => v >= 0)}
          edges={[0, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, Infinity]}
          min={f.minViews}
          max={f.maxViews}
          onChange={(minViews, maxViews) => set({ ...f, minViews, maxViews })}
          format={(v) => fmt(v)}
          parse={parseCount}
          unit="views"
        />
      </Group>
      <Group title="Engagement">
        <p className="px-1.5 pb-1 text-xs text-muted">Likes and comments ÷ followers</p>
        <RangeHistogram
          values={s.all.map((x) => x.er ?? -1).filter((v) => v >= 0)}
          edges={[0, 0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, Infinity]}
          min={f.minEr}
          max={f.maxEr}
          onChange={(minEr, maxEr) => set({ ...f, minEr, maxEr })}
          format={(v) => `${+(v * 100).toFixed(1)}%`}
          parse={(t) => {
            const n = parseFloat(t.replace("%", ""));
            return Number.isFinite(n) ? n / 100 : null;
          }}
          unit="engagement"
        />
      </Group>
      <Group title="Quality">
        <label className="block px-1.5 text-[13px]">
          <span className="flex justify-between text-xs text-muted">
            Score at least <b className="text-ink">{f.minScore ?? 0}</b>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={f.minScore ?? 0}
            onChange={(e) => set({ ...f, minScore: Number(e.target.value) || null })}
            className="w-full accent-[#f75115]"
          />
        </label>
        <Check on={f.noFlags} onClick={() => set({ ...f, noFlags: !f.noFlags })} label="No warning flags" count={n((x) => !x.flags.length)} />
      </Group>
      <Group title="Contact and activity" open={false}>
        <Check on={f.emailOnly} onClick={() => set({ ...f, emailOnly: !f.emailOnly })} label="Has email" count={n((x) => x.email)} />
        <Check
          on={f.activeOnly}
          onClick={() => set({ ...f, activeOnly: !f.activeOnly })}
          label="Posted this fortnight"
          count={n((x) => x.lastPostDays <= 14)}
        />
      </Group>
    </aside>
  );
}

type STab = "performance" | "content" | "audience" | "brands" | "like";

function SignalDrawer({
  p,
  all,
  band,
  onClose,
  onOpen,
  onReport,
}: {
  p: Pro;
  all: Pro[];
  band: { er: number; views: number };
  onClose: () => void;
  onOpen: (p: Pro) => void;
  onReport: () => void;
}) {
  const [tab, setTab] = useState<STab>("performance");
  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
        <Avatar p={p} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{p.name}</p>
          <p className="truncate text-xs text-muted">
            @{p.handle} · {p.niche} · {p.city}
          </p>
        </div>
        <button onClick={onReport} className={buttonClass.primary}>
          Full report
        </button>
        <button onClick={onClose} className={buttonClass.icon} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-r border-line bg-surface-2/60 p-4">
          <CrmPanel p={p} compact />
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className="grid shrink-0 grid-cols-4 border-b border-line">
            <Kpi label="Score" value={<ScoreRing score={p.score} size={38} stroke={3} />} />
            <Kpi label="Engagement" value={pct(p.er)} delta={p.er !== null && band.er ? p.er / band.er - 1 : null} note="vs same size" />
            <Kpi
              label="Reach of followers"
              value={p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}%` : "—"}
              delta={p.viewsRatio && band.views ? p.viewsRatio / band.views - 1 : null}
              note="vs same size"
            />
            <Kpi
              label="Followers"
              value={fmt(p.followers)}
              delta={(p.growth.at(-1)!.followers - p.growth[8].followers) / p.growth[8].followers}
              note="3 months"
            />
          </div>
          <div className="flex shrink-0 gap-1 border-b border-line px-4 py-2">
            {(
              [
                ["performance", "Performance"],
                ["content", "Content"],
                ["audience", "Audience"],
                ["brands", "Brands"],
                ["like", "Lookalikes"],
              ] as [STab, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cx("rounded-md px-2.5 py-1 text-[13px] font-medium", tab === k ? "bg-[#171715] text-white" : "text-ink-2 hover:bg-surface-2")}
              >
                {l}
              </button>
            ))}
          </div>
          <div key={tab} className="proto-rise min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {tab === "performance" && (
              <>
                <MiniTitle>Views per post · dashed line is their usual</MiniTitle>
                <ViewsBars p={p} height={150} />
                <MiniTitle>Followers over the last year</MiniTitle>
                <GrowthChart p={p} height={150} color="#171715" />
                <PostingDays p={p} />
              </>
            )}
            {tab === "content" && (
              <div className="grid grid-cols-4 gap-1.5">
                {p.recent.slice(0, 12).map((x) => (
                  <Cover key={x.id} post={x} className="aspect-[3/4]" />
                ))}
              </div>
            )}
            {tab === "audience" && <AudienceSignals p={p} compact />}
            {tab === "brands" && (
              <>
                <Collabs p={p} />
                <MiniTitle>With Vernacular</MiniTitle>
                <ChorusHistory p={p} />
              </>
            )}
            {tab === "like" && <LookalikeList list={lookalikes(p, all)} onOpen={onOpen} />}
          </div>
        </div>
      </div>
    </>
  );
}

function MiniTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-muted">{children}</p>;
}

function Kpi({ label, value, delta, note }: { label: string; value: React.ReactNode; delta?: number | null; note?: string }) {
  return (
    <div className="border-r border-line px-3 py-2.5 last:border-r-0">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</div>
      {delta !== undefined && delta !== null && (
        <p className={cx("text-[11px] font-medium", delta >= 0 ? "text-good" : "text-bad")}>
          {delta >= 0 ? "+" : ""}
          {Math.round(delta * 100)}% {note}
        </p>
      )}
    </div>
  );
}

/** Which days of the week they post, from their recent posts. */
function PostingDays({ p }: { p: Pro }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = days.map((d, i) => ({ d, n: p.recent.slice(0, 30).filter((x) => (new Date(x.postedAt).getUTCDay() + 6) % 7 === i).length }));
  return (
    <div>
      <MiniTitle>When they post</MiniTitle>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6c6a62" }} />
            <YAxis hide />
            <Tooltip formatter={(v) => `${v} posts`} cursor={{ fill: "#f8f6f1" }} />
            <Bar dataKey="n" fill="#171715" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Compare({ list, onClose }: { list: Pro[]; onClose: () => void }) {
  const rows: [string, (p: Pro) => number | null, (p: Pro) => string][] = [
    ["Creator Score", (p) => p.score, (p) => String(p.score ?? "—")],
    ["Followers", (p) => p.followers, (p) => fmt(p.followers)],
    ["Engagement", (p) => p.er, (p) => pct(p.er)],
    ["Typical views", (p) => p.avgViews, (p) => fmt(p.avgViews)],
    ["Reach of followers", (p) => p.viewsRatio, (p) => (p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}%` : "—")],
    ["Rising", (p) => p.trend, (p) => (p.trend === null ? "—" : `${Math.round(p.trend * 100)}%`)],
    ["Posts a week", (p) => p.postsPerWeek, (p) => p.postsPerWeek.toFixed(1)],
    ["Bot-like comments", (p) => -p.spamShare, (p) => `${p.spamShare}%`],
    ["Warning flags", (p) => -p.flags.length, (p) => String(p.flags.length)],
  ];
  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
        <p className="text-[15px] font-semibold">Side by side</p>
        <button onClick={onClose} className={buttonClass.icon} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="overflow-auto p-5">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th />
              {list.map((p) => (
                <th key={p.id} className="px-3 pb-3 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <Avatar p={p} size={36} />
                    <span>
                      <b className="block font-semibold">{p.name}</b>
                      <span className="text-xs text-muted">
                        {p.niche} · {p.city}
                      </span>
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, val, show]) => {
              const best = Math.max(...list.map((p) => val(p) ?? -Infinity));
              return (
                <tr key={label}>
                  <td className="py-2.5 pr-3 text-xs text-muted">{label}</td>
                  {list.map((p) => (
                    <td key={p.id} className={cx("px-3 py-2.5 tabular-nums", val(p) === best && "font-semibold text-[#c64111]")}>
                      {show(p)}
                      {val(p) === best && <span className="ml-1 text-[10px] uppercase tracking-wide">best</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td className="py-2.5 pr-3 text-xs text-muted">Last 12 posts</td>
              {list.map((p) => (
                <td key={p.id} className="px-3 py-2.5">
                  <Spark values={p.viewSeries} w={120} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function SignalReport({
  p,
  all,
  band,
  onBack,
  onOpen,
}: {
  p: Pro;
  all: Pro[];
  band: { er: number; views: number };
  onBack: () => void;
  onOpen: (p: Pro) => void;
}) {
  return (
    <article className="proto-rise space-y-4">
      <div className="no-print flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <Icon name="back" size={14} /> Back to results
        </button>
        <button onClick={() => window.print()} className={buttonClass.secondary}>
          <Icon name="download" size={14} /> Download PDF
        </button>
      </div>
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <Avatar p={p} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="text-[13px] text-muted">
            @{p.handle} · {p.niche} · {p.city} · {p.platform}
          </p>
        </div>
        <ScoreRing score={p.score} size={60} stroke={5} />
      </header>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line md:grid-cols-5">
        <Kpi label="Followers" value={fmt(p.followers)} delta={(p.growth.at(-1)!.followers - p.growth[0].followers) / p.growth[0].followers} note="in a year" />
        <Kpi label="Engagement" value={pct(p.er)} delta={p.er !== null && band.er ? p.er / band.er - 1 : null} note="vs same size" />
        <Kpi label="Typical views" value={fmt(p.avgViews)} delta={p.trend} note="latest posts" />
        <Kpi
          label="Reach of followers"
          value={p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}%` : "—"}
          delta={p.viewsRatio && band.views ? p.viewsRatio / band.views - 1 : null}
          note="vs same size"
        />
        <Kpi label="Watch time" value={p.watchSeconds ? `${p.watchSeconds}s` : "—"} note={p.watchSeconds ? "from their insights" : ""} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Views per post" className="lg:col-span-2">
          <ViewsBars p={p} height={200} />
        </Box>
        <Box title="When they post">
          <PostingDays p={p} />
        </Box>
        <Box title="Followers over the last year" className="lg:col-span-2">
          <GrowthChart p={p} height={200} color="#171715" />
        </Box>
        <Box title="Warnings">
          {p.flags.length ? (
            <ul className="space-y-2 text-[13px]">
              {p.flags.map((f) => (
                <li key={f.type} className="rounded-lg bg-bad-soft px-3 py-2 text-bad">
                  {f.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-good">No warning flags. Numbers look natural.</p>
          )}
        </Box>
      </div>
      <Box title="Audience, from the comments (estimates)">
        <AudienceSignals p={p} />
      </Box>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Brands">
          <Collabs p={p} />
        </Box>
        <Box title="With Vernacular">
          <ChorusHistory p={p} />
        </Box>
      </div>
      <Box title="Recent posts">
        <div className="grid grid-cols-4 gap-1.5 md:grid-cols-8">
          {p.recent.slice(0, 16).map((x) => (
            <Cover key={x.id} post={x} className="aspect-[3/4]" />
          ))}
        </div>
      </Box>
      <Box title="Lookalikes">
        <LookalikeList list={lookalikes(p, all)} onOpen={onOpen} />
      </Box>
    </article>
  );
}

function Box({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface p-4", className)}>
      <h2 className="mb-2 text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}
