"use client";
/* Visual building blocks for the creator pages: photos, post covers, score ring, small charts, range filter, drawer. */
import { useState, type ReactNode } from "react";
import { formatNumber } from "@/lib/format";
import type { CreatorView } from "@/lib/creator-view";
import type { Post } from "@/lib/types";
import { youtubeVideoId } from "@/lib/post-links";
import { Icon } from "../icons";
import { cx } from "../ui";

const TONES = ["#f75115", "#171715", "#2f4f3e", "#7a2e1d", "#23365e", "#5b3a5e", "#a8841c", "#0f6e8c"];
const tone = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

/** Profile photo, or initials when there isn't one (or it no longer loads), with the platform in the corner. */
export function Avatar({ v, size = 40, ring }: { v: Pick<CreatorView, "name" | "photoUrl" | "platform">; size?: number; ring?: boolean }) {
  const [broken, setBroken] = useState(false);
  const initials = v.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cx("relative inline-flex shrink-0 rounded-full", ring && "ring-2 ring-white")} style={{ width: size, height: size }} aria-hidden>
      {v.photoUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={v.photoUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ background: tone(v.name), fontSize: size * 0.36 }}
        >
          {initials || "?"}
        </span>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white text-ink shadow-sm"
        style={{ width: Math.max(14, size * 0.42), height: Math.max(14, size * 0.42) }}
      >
        <Icon name={v.platform} size={Math.max(9, size * 0.26)} />
      </span>
    </span>
  );
}

function coverImage(p: Post): string | null {
  if (p.thumbnailUrl) return p.thumbnailUrl;
  const yt = youtubeVideoId(p.url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}

/** A post: its real cover image, or its caption set over a colour when there's no image; numbers on hover. */
export function PostCover({ post, className, label, big }: { post: Post; className?: string; label?: string; big?: boolean }) {
  const [broken, setBroken] = useState(false);
  const img = broken ? null : coverImage(post);
  const words =
    post.caption
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#@][\w.]+/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join(" ") || "Post";
  const bg = tone(post.platformPostId);
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cx("group/cover relative block overflow-hidden rounded-lg bg-surface-2", post.excluded && "opacity-50", className)}
      style={img ? undefined : { background: bg }}
      aria-label={`Open post: ${words}`}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={cx("absolute inset-x-2 top-2 line-clamp-4 font-bold leading-[1.08] tracking-tight text-white", big ? "text-lg" : "text-[12px]")}>
          {words}
        </span>
      )}
      {label && <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{label}</span>}
      {(post.type === "reel" || post.type === "video" || post.type === "short") && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/5 to-transparent p-2 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover/cover:opacity-100">
        <span className="flex flex-wrap gap-x-2 tabular-nums">
          {post.views !== null && <span>{formatNumber(post.views)} views</span>}
          {post.likes !== null && <span>{formatNumber(post.likes)} likes</span>}
          <span>{formatNumber(post.comments)} comments</span>
        </span>
      </span>
    </a>
  );
}

/** Creator Score as a ring, coloured by band, with the number inside. */
export function ScoreRing({ score, size = 44, stroke = 4, dark }: { score: number | null; size?: number; stroke?: number; dark?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const s = score ?? 0;
  const color = score === null ? "#b9b3a4" : s >= 75 ? "#068116" : s >= 55 ? "#c99a12" : "#b42318";
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={score === null ? "Not enough posts to score yet" : `Creator Score: ${score} of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? "rgba(255,255,255,.15)" : "#ece7db"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - s / 100)}
        />
      </svg>
      <span className={cx("absolute font-semibold tabular-nums", dark ? "text-white" : "text-ink")} style={{ fontSize: size * 0.32 }}>
        {score ?? "–"}
      </span>
    </span>
  );
}

export function Trend({ change }: { change: number | null }) {
  if (change === null) return null;
  return (
    <span className={cx("text-xs font-medium tabular-nums", change >= 0 ? "text-good" : "text-bad")}>
      {change >= 0 ? "↗" : "↘"} {Math.abs(Math.round(change * 100))}%
    </span>
  );
}

/** Views of the last posts as a line; the newest point is marked. */
export function Spark({ values, w = 96, h = 26 }: { values: (number | null)[]; w?: number; h?: number }) {
  const v = values.map((x) => x ?? 0);
  if (!v.some(Boolean)) return <span className="text-xs text-muted">No views</span>;
  const max = Math.max(...v);
  const pts = v.map((y, i) => [(i / Math.max(1, v.length - 1)) * (w - 4) + 2, h - 3 - (y / max) * (h - 6)] as const);
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#f75115" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.5} fill="#f75115" />
    </svg>
  );
}

/**
 * A range filter drawn as a bar chart of how creators are spread. Click a bar
 * to pick it, click another to stretch the range, click the only picked bar to
 * clear; or type From/To.
 */
export function RangeBars({
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
  const on = min !== null || max !== null;
  const picked = (b: { lo: number; hi: number }) => on && b.lo >= (min ?? -Infinity) && b.hi <= (max ?? Infinity);
  function click(i: number) {
    const sel = buckets.flatMap((x, j) => (picked(x) ? [j] : []));
    if (sel.length === 1 && sel[0] === i) return onChange(null, null);
    const first = sel.length ? Math.min(sel[0], i) : i;
    const last = sel.length ? Math.max(sel.at(-1)!, i) : i;
    onChange(buckets[first].lo || null, Number.isFinite(buckets[last].hi) ? buckets[last].hi : null);
  }
  const box = "w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] tabular-nums outline-none focus:border-accent";
  return (
    <div className="px-1.5">
      <div className="flex h-12 items-end gap-[3px]" role="group" aria-label={`Spread of ${unit}`}>
        {buckets.map((b, i) => (
          <button
            key={i}
            onClick={() => click(i)}
            title={`${format(b.lo)}–${Number.isFinite(b.hi) ? format(b.hi) : "more"}: ${b.n} creators`}
            className={cx("flex-1 rounded-t-[3px] transition-colors duration-150", picked(b) ? "bg-accent" : "bg-line-strong hover:bg-[#b9b3a4]")}
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
          key={`a${min}`}
          defaultValue={min !== null ? format(min) : ""}
          onBlur={(e) => onChange(parse(e.target.value), max)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="From"
          className={box}
          aria-label={`Lowest ${unit}`}
        />
        <span className="text-xs text-muted">–</span>
        <input
          key={`b${max}`}
          defaultValue={max !== null ? format(max) : ""}
          onBlur={(e) => onChange(min, parse(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="To"
          className={box}
          aria-label={`Highest ${unit}`}
        />
      </div>
    </div>
  );
}

/** Slides in from the right over the page. Esc or the backdrop closes it. */
export function SideDrawer({
  open,
  onClose,
  children,
  width = 660,
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
      <button className="cr-fade absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div
        className={cx(
          "cr-drawer absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden shadow-[-24px_0_48px_rgba(23,23,21,.18)]",
          dark ? "bg-brand text-white" : "bg-surface",
        )}
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

/** "20k", "1.5m" or "20000" → a number. */
export function parseCount(t: string): number | null {
  const m = t
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^([\d.]+)\s*(k|m)?$/);
  return m ? Math.round(Number(m[1]) * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1)) : null;
}
