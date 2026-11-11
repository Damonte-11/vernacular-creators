"use client";
import { isLimited } from "@/components/score-breakdown";
import type { Creator, CreatorAnalysis } from "@/lib/types";
import { useCreators } from "@/lib/data/creators";
import { linkedAccounts } from "@/lib/people";
import { platformName } from "@/lib/platforms";
import { Icon } from "./icons";
import { formatNumber, formatPercent } from "@/lib/format";
import { sizeBandLabel } from "@/lib/size-bands";
import { AddToProject } from "./add-to-project";
import { Avatar, Card, CreatorLink, cx, EngagementChip, FlagCount, FoundBadge, PlatformBadge, ScoreBadge, VerifiedBadge } from "./ui";

const TH = "px-3 py-2 text-xs font-medium text-muted first:pl-4";

export type TableSort = "score" | "followers" | "engagement" | "name";

/** Column header that sorts the table when a sort handler is given; plain text otherwise. */
function SortTH({ label, k, sort, onSort, className }: { label: string; k: TableSort; sort?: TableSort; onSort?: (k: TableSort) => void; className?: string }) {
  if (!onSort) return <th className={cx(TH, className)}>{label}</th>;
  const active = sort === k;
  return (
    <th className={cx(TH, className)} aria-sort={active ? (k === "name" ? "ascending" : "descending") : undefined}>
      <button onClick={() => onSort(k)} className={cx("inline-flex items-center gap-1 rounded hover:text-ink", active && "text-ink")}>
        {label}
        <span aria-hidden className={cx("text-[9px]", active ? "text-accent" : "text-line-strong")}>
          {k === "name" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

/** Table on wide screens, stacked cards on phones. */
export function CreatorTable({ rows, ranked, sort, onSort }: { rows: CreatorAnalysis[]; ranked?: boolean; sort?: TableSort; onSort?: (k: TableSort) => void }) {
  const all = useCreators();
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-[13px]">
          <thead className="border-b border-line bg-surface-2 text-left">
            <tr>
              {ranked && (
                <th className={cx(TH, "w-12")}>
                  <span className="sr-only">Rank</span>#
                </th>
              )}
              <SortTH label="Creator" k="name" sort={sort} onSort={onSort} />
              <th className={cx(TH, "hidden lg:table-cell")}>Niche · City</th>
              <SortTH label="Followers" k="followers" sort={sort} onSort={onSort} className="text-right" />
              <SortTH label="Engagement" k="engagement" sort={sort} onSort={onSort} className="text-right" />
              <th className={cx(TH, "text-center")}>Flags</th>
              <SortTH label="Score" k="score" sort={sort} onSort={onSort} className="text-right" />
              <th className="w-10 px-1 py-2">
                <span className="sr-only">Add to project</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a, i) => (
              <tr key={a.creator.id} className="group transition-colors duration-100 hover:bg-surface-2">
                {ranked && <td className="py-2 pl-4 pr-3 font-medium tabular-nums text-muted">{i + 1}</td>}
                <td className="px-3 py-2 first:pl-4">
                  <CreatorLink id={a.creator.id} className="flex items-center gap-2.5 rounded-md">
                    <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} size={30} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium text-ink group-hover:underline">
                        <span className="truncate">{a.creator.name}</span>
                        <VerifiedBadge verified={a.creator.verified} />
                        <FoundBadge via={a.creator.discoveredVia} />
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <PlatformBadge platform={a.creator.platform} compact />@{a.creator.handle}
                        <AlsoOn creator={a.creator} all={all} />
                      </span>
                    </span>
                  </CreatorLink>
                </td>
                <td className="hidden px-3 py-2 text-ink-2 lg:table-cell">
                  {a.creator.niche ?? <span className="text-muted">No niche</span>}
                  <span className="block text-xs text-muted">{a.creator.city ?? "No city"}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="font-medium tabular-nums">{formatNumber(a.creator.followers)}</span>
                  <span className="block text-xs text-muted">{sizeBandLabel(a.metrics.band)}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-2">
                    {a.metrics.engagementLabel && <EngagementChip label={a.metrics.engagementLabel} />}
                    <span className="font-medium tabular-nums">{formatPercent(a.metrics.engagementRate)}</span>
                  </span>
                  {a.metrics.viewEngagementRate !== null && (
                    <span className="block text-xs text-muted">{formatPercent(a.metrics.viewEngagementRate)} by views</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <FlagCount flags={a.flags} />
                </td>
                <td className="px-3 py-2 text-right">
                  <ScoreBadge limited={isLimited(a.score)} score={a.score.total} size="sm" />
                </td>
                <td className="px-1 py-2">
                  <AddToProject creatorId={a.creator.id} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line md:hidden">
        {rows.map((a, i) => (
          <div key={a.creator.id} className="bg-surface p-3.5">
            <div className="flex items-center gap-3">
              {ranked && <span className="w-5 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>}
              <CreatorLink id={a.creator.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
                <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} size={36} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{a.creator.name}</span>
                    <VerifiedBadge verified={a.creator.verified} />
                        <FoundBadge via={a.creator.discoveredVia} />
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <PlatformBadge platform={a.creator.platform} compact />
                    <span className="truncate">@{a.creator.handle}</span>
                    <AlsoOn creator={a.creator} all={all} />
                  </span>
                </span>
              </CreatorLink>
              <ScoreBadge limited={isLimited(a.score)} score={a.score.total} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted">Followers</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{formatNumber(a.creator.followers)}</dd>
              </div>
              <div>
                <dt className="text-muted">Engagement</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{formatPercent(a.metrics.engagementRate)}</dd>
                {a.metrics.engagementLabel && (
                  <dd>
                    <EngagementChip label={a.metrics.engagementLabel} />
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted">Flags</dt>
                <dd className="mt-0.5">
                  <FlagCount flags={a.flags} />
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span className="truncate">{[a.creator.niche ?? "No niche", a.creator.city ?? "No city", sizeBandLabel(a.metrics.band)].join(" · ")}</span>
              <AddToProject creatorId={a.creator.id} compact />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Small icons for the same person's other platforms (their numbers stay on their own profiles). */
export function AlsoOn({ creator, all }: { creator: Creator; all: Creator[] }) {
  const others = linkedAccounts(creator, all);
  if (others.length === 0) return null;
  const label = `Also on ${others.map((o) => platformName(o.platform)).join(", ")}`;
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 ring-1 ring-line" title={label}>
      <span className="text-[11px]">+</span>
      {others.map((o) => (
        <Icon key={o.id} name={o.platform} size={12} />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
