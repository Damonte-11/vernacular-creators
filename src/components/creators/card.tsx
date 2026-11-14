"use client";
import { formatNumber, formatPercent } from "@/lib/format";
import type { CreatorView } from "@/lib/creator-view";
import { buttonClass, cx } from "../ui";
import { Avatar, PostCover, ScoreRing, Trend } from "./media";

/** A creator led by their latest posts, with the numbers that matter for booking underneath. */
export function CreatorCard({
  v,
  i,
  inCompare,
  onCompare,
  onOpen,
  onLike,
}: {
  v: CreatorView;
  i: number;
  inCompare: boolean;
  onCompare?: () => void;
  onOpen: () => void;
  onLike: () => void;
}) {
  const posts = v.recent.slice(0, 4);
  return (
    <article
      className="cr-rise group flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(23,23,21,.10)]"
      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar v={v} size={44} />
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-semibold group-hover:underline">{v.name}</span>
          <span className="block truncate text-xs text-muted">
            @{v.handle}
            {v.niche ? ` · ${v.niche}` : ""}
            {v.city ? ` · ${v.city}` : ""}
          </span>
        </button>
        <ScoreRing score={v.score} />
      </div>
      <button onClick={onOpen} className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Open ${v.name}`}>
        {posts.length ? (
          posts.map((p, k) => (
            <span key={p.id} className="pointer-events-none">
              <PostCover post={p} className="aspect-[3/4]" label={k === 0 ? "Latest" : undefined} />
            </span>
          ))
        ) : (
          <span className="col-span-4 rounded-lg bg-surface-2 py-8 text-center text-xs text-muted">No posts read yet</span>
        )}
      </button>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <dt className="text-xs text-muted">Followers</dt>
          <dd className="font-semibold tabular-nums">{formatNumber(v.followers)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Engagement</dt>
          <dd className="font-semibold tabular-nums">{v.er === null ? "—" : formatPercent(v.er)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Expected views</dt>
          <dd className="flex items-baseline gap-1 font-semibold tabular-nums">
            {v.views === null ? "—" : formatNumber(v.views)} <Trend change={v.trend} />
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="min-w-0 truncate text-xs text-muted">
          {v.a.flags.length ? <span className="font-medium text-bad">{v.a.flags.length === 1 ? "1 warning" : `${v.a.flags.length} warnings`}</span> : v.why[0]}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button onClick={onLike} className={buttonClass.ghost} title="Creators like this one">
            Lookalikes
          </button>
          {onCompare && (
            <label
              className={cx(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium ring-1 transition-colors",
                inCompare ? "bg-brand text-white ring-brand" : "text-ink-2 ring-line-strong hover:bg-surface-2",
              )}
            >
              <input type="checkbox" className="sr-only" checked={inCompare} onChange={onCompare} />
              {inCompare ? "Comparing" : "Compare"}
            </label>
          )}
        </span>
      </div>
    </article>
  );
}
