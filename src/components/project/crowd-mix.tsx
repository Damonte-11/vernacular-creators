"use client";
import { useEffect, useMemo, useState } from "react";
import { viewsOf } from "@/lib/creator-view";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { formatNumber, formatPercent } from "@/lib/format";
import { CHORUS_TYPES } from "@/lib/projects";
import type { ChorusType } from "@/lib/types";
import { cx } from "../ui";

const SMALL = new Set(["nano", "micro"]);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const typeAt = (m: number): ChorusType => (m < 0.3 ? "seedlings" : m > 0.7 ? "headliners" : "salad");
const startAt: Record<ChorusType, number> = { seedlings: 0.15, salad: 0.5, headliners: 0.85 };

/**
 * Plan the Chorus mix: slide from many small voices (Seedlings) to a few big names (Headliners) and see,
 * from the expected views of creators saved in the app, how many of each it takes to meet the guarantee.
 * From the crowd slider on the Vernacular website.
 */
export function CrowdMix({ guarantee, type, onType }: { guarantee: number | null; type: ChorusType; onType: (t: ChorusType) => void }) {
  const analyses = useAnalyses();
  const [m, setM] = useState(startAt[type]);
  // Picking a Chorus type above moves the slider to it.
  useEffect(() => setM((x) => (typeAt(x) === type ? x : startAt[type])), [type]);
  const pools = useMemo(() => {
    const all = viewsOf(analyses, NOW).filter((v) => v.views !== null && v.views > 0);
    const pick = (small: boolean) => {
      const xs = all.filter((v) => SMALL.has(v.band) === small);
      return {
        n: xs.length,
        views: median(xs.map((v) => v.views!)),
        er: median(xs.map((v) => v.er).filter((x): x is number => x !== null)),
      };
    };
    return { small: pick(true), big: pick(false) };
  }, [analyses]);

  const target = guarantee ?? 1_000_000;
  const smallNeed = pools.small.views ? Math.ceil((target * (1 - m)) / pools.small.views) : null;
  const bigNeed = pools.big.views ? Math.ceil((target * m) / pools.big.views) : null;
  const er = pools.small.er !== null && pools.big.er !== null ? (1 - m) * pools.small.er + m * pools.big.er : (pools.small.er ?? pools.big.er ?? null);
  const kind = CHORUS_TYPES.find((t) => t.id === typeAt(m))!;
  // The picture: one small oval per small creator and one big oval per big name, capped so it stays readable.
  const dots = Math.min(smallNeed ?? 0, 70);
  const heads = Math.min(bigNeed ?? 0, 12);

  if (!pools.small.views && !pools.big.views) return null;
  return (
    <section className="grid gap-5 rounded-2xl bg-rail p-4 sm:p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center" aria-label="Plan the mix">
      <div className="flex min-h-[200px] flex-wrap content-center items-center justify-center gap-2 rounded-xl bg-[#e8e2d4] p-4 sm:min-h-[240px]" aria-hidden>
        {Array.from({ length: heads }, (_, i) => (
          <i
            key={`b${i}`}
            className="cr-fade block h-[62px] w-[50px] rounded-[50%] bg-accent ring-[2.5px] ring-brand"
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
        {Array.from({ length: dots }, (_, i) => (
          <i key={`s${i}`} className="cr-fade block h-5 w-4 rounded-[50%] bg-[#f2eee4] ring-2 ring-brand" style={{ animationDelay: `${i * 8}ms` }} />
        ))}
        {(smallNeed ?? 0) > dots && <span className="text-xs font-medium text-ink-2">+{formatNumber((smallNeed ?? 0) - dots)} more</span>}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{kind.label}</p>
          <p className="text-[13px] text-ink-2">{kind.hint}.</p>
        </div>
        <div>
          <input
            type="range"
            className="slider w-full"
            min={0}
            max={100}
            value={Math.round(m * 100)}
            style={{ "--fill": `${Math.round(m * 100)}%` } as React.CSSProperties}
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              setM(next);
              if (typeAt(next) !== type) onType(typeAt(next));
            }}
            aria-label="Mix of small creators and big names"
            aria-valuetext={`${Math.round((1 - m) * 100)}% of views from small creators`}
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Many small voices</span>
            <span>A few big names</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-xs text-muted">Creators to book</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatNumber((smallNeed ?? 0) + (bigNeed ?? 0))}
              <span className="ml-1 text-xs font-normal text-muted">
                {smallNeed ?? 0} small · {bigNeed ?? 0} big
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Engagement to expect</dt>
            <dd className="text-lg font-semibold tabular-nums">{er === null ? "—" : formatPercent(er)}</dd>
          </div>
        </dl>
        <p className={cx("text-xs", (smallNeed ?? 0) > pools.small.n || (bigNeed ?? 0) > pools.big.n ? "text-warn" : "text-muted")}>
          To reach {formatNumber(target)} views{guarantee ? "" : " (fill in the guarantee to plan for it)"}, from the usual views of creators saved here: a
          small creator brings about {pools.small.views ? formatNumber(pools.small.views) : "—"}, a big name about{" "}
          {pools.big.views ? formatNumber(pools.big.views) : "—"}. You have {formatNumber(pools.small.n)} small and {formatNumber(pools.big.n)} big creators
          saved.
        </p>
      </div>
    </section>
  );
}
