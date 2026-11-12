"use client";
import { selectClass } from "./bits";
import { useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  countedEngagements,
  countedViews,
  counts,
  DIALECT_PLATFORMS,
  FORMAT_LABEL,
  missingNumbers,
  monthName,
  monthOf,
  purposeLabel,
  PURPOSES,
  type DialectPlatform,
  type DialectProject,
  type Purpose,
} from "@/lib/dialect";
import { cx } from "../ui";
import type { UpdatePost } from "./attention-list";
import { PlatformTag, Tag } from "./bits";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" });

/** Every post for a month, filterable; type and purpose can be changed in the row. */
export function PostsTable({ p, months, update, limit }: { p: DialectProject; months: string[]; update?: UpdatePost; limit?: number }) {
  const [month, setMonth] = useState(months.at(-1)!);
  const [platform, setPlatform] = useState<DialectPlatform | "all">("all");
  const [type, setType] = useState("all");
  const [purpose, setPurpose] = useState<Purpose | "all">("all");
  const rows = useMemo(
    () =>
      p.posts
        .filter((x) => (limit ? monthOf(x.postedAt) === months.at(-1) : monthOf(x.postedAt) === month))
        .filter((x) => platform === "all" || x.platform === platform)
        .filter((x) => type === "all" || x.contentType === type)
        .filter((x) => purpose === "all" || x.purpose === purpose)
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
        .slice(0, limit ?? Infinity),
    [p.posts, month, platform, type, purpose, limit, months],
  );
  const filters = !limit;

  return (
    <div>
      {filters && (
        <div className="flex flex-wrap items-center gap-2 p-4 pb-3 sm:px-5">
          <select className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
            {months.map((m) => (
              <option key={m} value={m}>
                {monthName(m)} {m.slice(0, 4)}
              </option>
            ))}
          </select>
          <select className={selectClass} value={platform} onChange={(e) => setPlatform(e.target.value as DialectPlatform | "all")} aria-label="Platform">
            <option value="all">All platforms</option>
            {DIALECT_PLATFORMS.filter((x) => p.platforms.some((y) => y.platform === x.id)).map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)} aria-label="Content type">
            <option value="all">All content types</option>
            {p.contentTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className={selectClass} value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose | "all")} aria-label="Purpose">
            <option value="all">All purposes</option>
            {PURPOSES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs tabular-nums text-muted">{rows.length} posts</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="py-2 pl-4 pr-3 font-medium sm:pl-5">Post</th>
              <th className="px-3 py-2 font-medium">Went up</th>
              <th className="px-3 py-2 font-medium">Type · purpose</th>
              <th className="px-3 py-2 text-right font-medium">Views</th>
              <th className="px-3 py-2 text-right font-medium">Engagements</th>
              <th className="py-2 pl-3 pr-4 text-right font-medium sm:pr-5">ER by views</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((x) => {
              const v = countedViews(x);
              const e = countedEngagements(x);
              return (
                <tr key={x.id} className={cx(!counts(x) && "text-muted")}>
                  <td className="py-2 pl-4 pr-3 sm:pl-5">
                    <a href={x.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                      {x.title}
                    </a>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <PlatformTag platform={x.platform} /> · {FORMAT_LABEL[x.format]}
                      {x.manual && " · numbers typed in"}
                      {x.decision === "manual" && " · organic numbers only"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-2">{when(x.postedAt)}</td>
                  <td className="px-3 py-2">
                    {update ? (
                      <span className="flex gap-1.5">
                        <select
                          className={cx(selectClass, "w-36 py-1", !x.contentType && "border-warn")}
                          value={x.contentType ?? ""}
                          onChange={(ev) => update(x.id, { contentType: ev.target.value || null })}
                          aria-label="Content type"
                        >
                          <option value="">Type…</option>
                          {p.contentTypes.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <select
                          className={cx(selectClass, "w-36 py-1", !x.purpose && "border-warn")}
                          value={x.purpose ?? ""}
                          onChange={(ev) => update(x.id, { purpose: (ev.target.value || null) as Purpose | null })}
                          aria-label="Purpose"
                        >
                          <option value="">Purpose…</option>
                          {PURPOSES.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </span>
                    ) : (
                      <span className="text-ink-2">
                        {x.contentType ?? <Tag tone="warn">No type</Tag>} · {x.purpose ? purposeLabel(x.purpose) : <Tag tone="warn">No purpose</Tag>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {x.possibleAd && !x.decision ? (
                      <Tag tone="bad">Possible ad · {formatNumber(x.views)}</Tag>
                    ) : x.decision === "excluded" ? (
                      <Tag>Left out</Tag>
                    ) : missingNumbers(x) ? (
                      x.views === null && x.likes === null ? (
                        <span className="text-xs text-muted">Reading…</span>
                      ) : (
                        <Tag tone="warn">Add views</Tag>
                      )
                    ) : (
                      formatNumber(v)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{(x.likes === null && !x.organic) || !counts(x) ? "—" : formatNumber(e)}</td>
                  <td className="py-2 pl-3 pr-4 text-right tabular-nums sm:pr-5">{v > 0 ? formatPercent(e / v) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
