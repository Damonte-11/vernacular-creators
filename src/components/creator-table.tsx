"use client";
import { isLimited } from "@/components/score-breakdown";
import type { Creator, CreatorAnalysis } from "@/lib/types";
import { useCreators } from "@/lib/data/creators";
import { linkedAccounts } from "@/lib/people";
import { platformName } from "@/lib/platforms";
import { Icon } from "./icons";
import { formatNumber, formatPercent } from "@/lib/format";
import { sizeBandLabel } from "@/lib/size-bands";
import { AddToShortlist } from "./add-to-shortlist";
import { Avatar, Card, CreatorLink, cx, EngagementChip, FlagCount, PlatformBadge, ScoreBadge, VerifiedBadge } from "./ui";

const TH = "px-4 py-2.5 text-xs font-medium text-muted";

/** Table on wide screens, stacked cards on phones. */
export function CreatorTable({ rows, ranked }: { rows: CreatorAnalysis[]; ranked?: boolean }) {
  const all = useCreators();
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-left">
            <tr>
              {ranked && (
                <th className={cx(TH, "w-12")}>
                  <span className="sr-only">Rank</span>#
                </th>
              )}
              <th className={TH}>Creator</th>
              <th className={cx(TH, "hidden lg:table-cell")}>Niche · City</th>
              <th className={cx(TH, "text-right")}>Followers</th>
              <th className={cx(TH, "text-right")}>Engagement</th>
              <th className={cx(TH, "text-center")}>Flags</th>
              <th className={cx(TH, "text-center")}>Score</th>
              <th className="w-12 px-2 py-2.5">
                <span className="sr-only">Add to list</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a, i) => (
              <tr key={a.creator.id} className="group transition-colors hover:bg-surface-2">
                {ranked && <td className="px-4 py-3 font-semibold tabular-nums text-muted">{i + 1}</td>}
                <td className="px-4 py-3">
                  <CreatorLink id={a.creator.id} className="flex items-center gap-3 rounded-md">
                    <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold group-hover:underline">
                        <span className="truncate">{a.creator.name}</span>
                        <VerifiedBadge verified={a.creator.verified} />
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <PlatformBadge platform={a.creator.platform} compact />@{a.creator.handle}
                        <AlsoOn creator={a.creator} all={all} />
                      </span>
                    </span>
                  </CreatorLink>
                </td>
                <td className="hidden px-4 py-3 text-ink-2 lg:table-cell">
                  {a.creator.niche ?? <span className="text-muted">No niche</span>}
                  <span className="block text-xs text-muted">{a.creator.city ?? "No city"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold tabular-nums">{formatNumber(a.creator.followers)}</span>
                  <span className="block text-xs text-muted">{sizeBandLabel(a.metrics.band)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-2">
                    {a.metrics.engagementLabel && <EngagementChip label={a.metrics.engagementLabel} />}
                    <span className="font-semibold tabular-nums">{formatPercent(a.metrics.engagementRate)}</span>
                  </span>
                  {a.metrics.viewEngagementRate !== null && (
                    <span className="block text-xs text-muted">{formatPercent(a.metrics.viewEngagementRate)} by views</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <FlagCount flags={a.flags} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge limited={isLimited(a.score)} score={a.score.total} size="sm" />
                </td>
                <td className="px-2 py-3">
                  <AddToShortlist creatorId={a.creator.id} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="space-y-3 md:hidden">
        {rows.map((a, i) => (
          <Card key={a.creator.id} className="p-4">
            <div className="flex items-center gap-3">
              {ranked && <span className="w-5 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>}
              <CreatorLink id={a.creator.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
                <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} size={44} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{a.creator.name}</span>
                    <VerifiedBadge verified={a.creator.verified} />
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
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-xs">
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
              <AddToShortlist creatorId={a.creator.id} compact />
            </div>
          </Card>
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
