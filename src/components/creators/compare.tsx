"use client";
import { formatNumber, formatPercent } from "@/lib/format";
import type { CreatorView } from "@/lib/creator-view";
import { Icon } from "../icons";
import { buttonClass, cx } from "../ui";
import { Avatar, Spark } from "./media";

/** Two to four creators side by side; the best value in each row is marked. */
export function CompareView({ list, onClose, onOpen }: { list: CreatorView[]; onClose: () => void; onOpen: (id: string) => void }) {
  const rows: [string, (v: CreatorView) => number | null, (v: CreatorView) => string][] = [
    ["Creator Score", (v) => v.score, (v) => (v.score === null ? "—" : String(v.score))],
    ["Expected views", (v) => v.views, (v) => (v.views === null ? "—" : formatNumber(v.views))],
    ["Engagement", (v) => v.er, (v) => (v.er === null ? "—" : formatPercent(v.er))],
    ["Followers", (v) => v.followers, (v) => formatNumber(v.followers)],
    ["Reach of followers", (v) => v.reach, (v) => (v.reach === null ? "—" : `${Math.round(v.reach * 100)}%`)],
    ["Latest posts vs usual", (v) => v.trend, (v) => (v.trend === null ? "—" : `${v.trend >= 0 ? "+" : ""}${Math.round(v.trend * 100)}%`)],
    ["Posts a week", (v) => v.postsPerWeek, (v) => (v.postsPerWeek === null ? "—" : v.postsPerWeek.toFixed(1))],
    ["Warnings", (v) => -v.a.flags.length, (v) => String(v.a.flags.length)],
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
              {list.map((v) => (
                <th key={v.id} className="px-3 pb-3 text-left font-normal">
                  <button onClick={() => onOpen(v.id)} className="flex items-center gap-2 text-left hover:underline">
                    <Avatar v={v} size={36} />
                    <span>
                      <b className="block font-semibold">{v.name}</b>
                      <span className="text-xs text-muted">
                        {v.niche ?? "—"} · {v.city ?? v.country}
                      </span>
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, val, show]) => {
              const nums = list.map((v) => val(v)).filter((x): x is number => x !== null);
              const best = nums.length > 1 ? Math.max(...nums) : null;
              return (
                <tr key={label}>
                  <td className="py-2.5 pr-3 text-xs text-muted">{label}</td>
                  {list.map((v) => {
                    const isBest = best !== null && val(v) === best;
                    return (
                      <td key={v.id} className={cx("px-3 py-2.5 tabular-nums", isBest && "font-semibold text-accent-ink")}>
                        {show(v)}
                        {isBest && <span className="ml-1 text-[10px] uppercase tracking-wide">best</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <td className="py-2.5 pr-3 text-xs text-muted">Last 12 posts</td>
              {list.map((v) => (
                <td key={v.id} className="px-3 py-2.5">
                  <Spark values={v.viewSeries} w={120} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
