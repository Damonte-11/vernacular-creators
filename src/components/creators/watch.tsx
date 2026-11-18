import { formatNumber } from "@/lib/format";
import type { CreatorView } from "@/lib/creator-view";
import { formatWatch } from "@/lib/watch-time";
import { cx } from "../ui";

/**
 * Expected watch time per view: the creator's estimate on a bar from typical to strong content
 * for their usual video length, with how it was worked out.
 */
export function WatchPanel({ v, dark }: { v: CreatorView; dark?: boolean }) {
  const w = v.watch;
  if (!w) return null;
  const span = Math.max(1, w.strong - w.typical);
  const at = Math.min(100, Math.max(0, ((w.perView - w.typical) / span) * 100));
  const quiet = dark ? "text-white/55" : "text-muted";
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">≈ {formatWatch(w.perView)}</span>
        <span className={cx("text-[13px]", dark ? "text-white/75" : "text-ink-2")}>
          watched per view, of a usual {formatWatch(w.length)} {w.longForm ? "video" : "clip"}
        </span>
      </p>
      <div className="relative mt-4 h-2 rounded-full" style={{ background: dark ? "rgb(255 255 255 / .12)" : "var(--color-line)" }}>
        <span className="cr-grow absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${at}%` }} />
        <span
          className={cx(
            "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-accent",
            dark ? "border-[#171715]" : "border-surface",
          )}
          style={{ left: `${at}%` }}
          aria-hidden
        />
      </div>
      <div className={cx("mt-1.5 flex justify-between text-xs tabular-nums", quiet)}>
        <span>Typical content {formatWatch(w.typical)}</span>
        <span>Strong content {formatWatch(w.strong)}</span>
      </div>
      {w.hoursPerPost !== null && v.views !== null && (
        <p className={cx("mt-3 text-[13px]", dark ? "text-white/80" : "text-ink-2")}>
          About <b className={dark ? "text-white" : "text-ink"}>{formatNumber(Math.round(w.hoursPerPost))} hours</b> watched per post, at{" "}
          {formatNumber(v.views)} expected views.
        </p>
      )}
      <p className={cx("mt-2 text-xs leading-relaxed", quiet)}>
        An estimate, not platform data: worked out from{" "}
        {w.lengthFrom === "posts" ? "their own video lengths" : `a usual ${formatWatch(w.length)} length (Instagram doesn't share it)`} and public watch-time
        studies, placed between typical and strong by their Creator Score.
      </p>
    </div>
  );
}
