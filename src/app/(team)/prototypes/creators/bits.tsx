"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";
import type { Post } from "@/lib/types";
import { applyFilters, coverOf, EMPTY_FILTERS, fmt, prototypeCreators, sortBy, understand, type Filters, type Pro, type SortKey } from "./data";

/* ---------- Search state shared by every direction ---------- */

export function useSearch() {
  const all = useMemo(() => prototypeCreators(), []);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("score");
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const results = useMemo(() => sortBy(applyFilters(all, filters), sort), [all, filters, sort]);
  function ask(q: string) {
    setQuery(q);
    const u = understand(q);
    setChips(u.chips);
    setFilters({ ...EMPTY_FILTERS, ...u.filters, text: u.chips.length ? "" : q });
  }
  function reset() {
    setQuery("");
    setChips([]);
    setFilters(EMPTY_FILTERS);
  }
  function toggleSave(id: string) {
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  return { all, filters, setFilters, sort, setSort, query, chips, ask, reset, results, saved, toggleSave };
}
export type Search = ReturnType<typeof useSearch>;

export function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ---------- Visual atoms ---------- */

const AVATAR_TONES = ["#f75115", "#171715", "#2f4f3e", "#7a2e1d", "#23365e", "#5b3a5e", "#c9a227", "#0f6e8c"];
export function Avatar({ p, size = 40, ring }: { p: Pro; size?: number; ring?: boolean }) {
  const tone = AVATAR_TONES[p.name.charCodeAt(0) % AVATAR_TONES.length];
  const initials = p.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", ring && "ring-2 ring-white")}
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
      <span
        className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white p-[2px] text-ink shadow-sm"
        style={{ width: size * 0.42, height: size * 0.42 }}
      >
        <Icon name={p.platform} size={Math.max(9, size * 0.28)} />
      </span>
    </span>
  );
}

/** A post as a designed cover: its caption set over a colour, with numbers on hover. */
export function Cover({ post, className, big, label }: { post: Post; className?: string; big?: boolean; label?: string }) {
  const c = coverOf(post);
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noreferrer"
      className={cx("group/cover relative block overflow-hidden rounded-lg", className)}
      style={{ background: c.bg, color: c.fg }}
      aria-label={`Post: ${c.text}`}
    >
      <span className={cx("absolute inset-x-2 top-2 line-clamp-4 font-bold leading-[1.05] tracking-tight", big ? "text-lg" : "text-[12px]")}>{c.text}</span>
      {label && <span className="absolute left-2 bottom-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">{label}</span>}
      {(post.type === "reel" || post.type === "video" || post.type === "short") && (
        <span className="absolute right-1.5 top-1.5 opacity-70" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-2 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/cover:opacity-100">
        <span className="flex gap-2 tabular-nums">
          {post.views !== null && (
            <span className="flex items-center gap-0.5">
              <Glyph d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /> {fmt(post.views)}
            </span>
          )}
          {post.likes !== null && (
            <span className="flex items-center gap-0.5">
              <Glyph d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 5.2 3 1.8-1.9 3.2-3 5.2-3 3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />{" "}
              {fmt(post.likes)}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Glyph d="M4 5h16v10H9l-5 4V5z" /> {fmt(post.comments)}
          </span>
        </span>
      </span>
    </a>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Creator Score as a ring: the number in the middle, the ring filled to it. */
export function ScoreRing({ score, size = 44, stroke = 4, dark }: { score: number | null; size?: number; stroke?: number; dark?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const s = score ?? 0;
  const tone = score === null ? "#b9b3a4" : s >= 75 ? "#068116" : s >= 55 ? "#c99a12" : "#b42318";
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={score === null ? "Not enough posts to score" : `Creator Score ${score} of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? "rgba(255,255,255,.15)" : "#ece7db"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - s / 100)}
          className="proto-ring"
        />
      </svg>
      <span className={cx("absolute font-semibold tabular-nums", dark ? "text-white" : "text-ink")} style={{ fontSize: size * 0.32 }}>
        {score ?? "–"}
      </span>
    </span>
  );
}

/** Views per post, oldest to newest; the last point is marked. */
export function Spark({ values, w = 96, h = 26, color = "#f75115" }: { values: (number | null)[]; w?: number; h?: number; color?: string }) {
  const v = values.map((x) => x ?? 0);
  if (!v.some(Boolean)) return <span className="text-xs text-muted">No views</span>;
  const max = Math.max(...v);
  const pts = v.map((y, i) => [(i / Math.max(1, v.length - 1)) * (w - 4) + 2, h - 3 - (y / max) * (h - 6)] as const);
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.5} fill={color} />
    </svg>
  );
}

export function Trend({ change, className }: { change: number | null; className?: string }) {
  if (change === null) return null;
  const up = change >= 0;
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", up ? "text-good" : "text-bad", className)}>
      {up ? "↗" : "↘"} {Math.abs(Math.round(change * 100))}%
    </span>
  );
}

export function CollabDots({ p, max = 4 }: { p: Pro; max?: number }) {
  if (!p.collabs.length) return <span className="text-xs text-muted">No brand posts found</span>;
  return (
    <span className="flex items-center">
      {p.collabs.slice(0, max).map((c, i) => (
        <span
          key={c.brand}
          title={`${c.brand}: ${c.posts} ${c.posts === 1 ? "post" : "posts"}${c.paid ? ", paid" : ""}`}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white"
          style={{ background: c.tone, marginLeft: i ? -6 : 0 }}
        >
          {c.initials}
        </span>
      ))}
      {p.collabs.length > max && <span className="ml-1 text-xs text-muted">+{p.collabs.length - max}</span>}
    </span>
  );
}

/** Horizontal share bars (audience signals, sentiment). */
export function ShareBars({ items, color = "#171715", suffix = "%" }: { items: { label: string; share: number }[]; color?: string; suffix?: string }) {
  const max = Math.max(...items.map((x) => x.share), 1);
  return (
    <ul className="space-y-2">
      {items.map((x) => (
        <li key={x.label} className="grid grid-cols-[96px_1fr_40px] items-center gap-2 text-[13px]">
          <span className="truncate text-ink-2">{x.label}</span>
          <span className="h-2 rounded-full bg-line">
            <span className="proto-grow block h-full rounded-full" style={{ width: `${(x.share / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums">
            {x.share}
            {suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Slides in from the right over the page; Esc or the backdrop closes it. */
export function Drawer({
  open,
  onClose,
  children,
  width = 720,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  dark?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button className="proto-fade absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div
        className={cx(
          "proto-drawer absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden shadow-[-24px_0_48px_rgba(23,23,21,.18)]",
          dark ? "bg-[#171715] text-white" : "bg-surface",
        )}
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A range filter drawn as a small bar chart of how creators are spread.
 * Click a bar to pick that range; click another to stretch the range to it;
 * click the only picked bar again to clear. From/To boxes take typed numbers.
 */
export function RangeHistogram({
  values,
  edges,
  min,
  max,
  onChange,
  format,
  parse,
  unit,
}: {
  values: number[];
  edges: number[];
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  format: (n: number) => string;
  parse: (s: string) => number | null;
  unit: string;
}) {
  const buckets = edges.slice(0, -1).map((lo, i) => ({ lo, hi: edges[i + 1], n: values.filter((v) => v >= lo && v < edges[i + 1]).length }));
  const top = Math.max(...buckets.map((b) => b.n), 1);
  const lo = min ?? -Infinity;
  const hi = max ?? Infinity;
  const picked = (b: { lo: number; hi: number }) => (min !== null || max !== null) && b.lo >= lo && b.hi <= hi;
  function click(i: number) {
    const b = buckets[i];
    const sel = buckets.map((x, j) => (picked(x) ? j : -1)).filter((j) => j >= 0);
    if (sel.length === 1 && sel[0] === i) return onChange(null, null);
    if (!sel.length) return onChange(b.lo, Number.isFinite(b.hi) ? b.hi : null);
    const first = Math.min(sel[0], i);
    const last = Math.max(sel.at(-1)!, i);
    onChange(buckets[first].lo || null, Number.isFinite(buckets[last].hi) ? buckets[last].hi : null);
  }
  return (
    <div className="px-1.5">
      <div className="flex h-12 items-end gap-[3px]" role="group" aria-label={`Spread of ${unit}`}>
        {buckets.map((b, i) => (
          <button
            key={i}
            onClick={() => click(i)}
            title={`${format(b.lo)}–${Number.isFinite(b.hi) ? format(b.hi) : "more"} ${unit}: ${b.n} creators`}
            className={cx("flex-1 rounded-t-[3px] transition-colors duration-150", picked(b) ? "bg-[#f75115]" : "bg-[#d6d0c1] hover:bg-[#b9b3a4]")}
            style={{ height: `${Math.max(8, (b.n / top) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
        <span>{format(edges[0])}</span>
        <span>{format(edges[edges.length - 2])}+</span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <input
          key={`min-${min}`}
          defaultValue={min !== null ? format(min) : ""}
          onBlur={(e) => onChange(parse(e.target.value), max)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="From"
          className="w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] tabular-nums outline-none focus:border-[#f75115]"
          aria-label={`Lowest ${unit}`}
        />
        <span className="text-xs text-muted">–</span>
        <input
          key={`max-${max}`}
          defaultValue={max !== null ? format(max) : ""}
          onBlur={(e) => onChange(min, parse(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="To"
          className="w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] tabular-nums outline-none focus:border-[#f75115]"
          aria-label={`Highest ${unit}`}
        />
      </div>
    </div>
  );
}
