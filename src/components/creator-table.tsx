"use client";
import { isLimited } from "@/components/score-breakdown";
import type { CreatorAnalysis } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { sizeBandLabel } from "@/lib/size-bands";
import { AddToShortlist } from "./add-to-shortlist";
import { Avatar, Card, CreatorLink, EngagementChip, FlagCount, PlatformBadge, ScoreBadge, VerifiedBadge } from "./ui";

/** Table on wide screens, stacked cards on phones. */
export function CreatorTable({ rows, ranked }: { rows: CreatorAnalysis[]; ranked?: boolean }) {
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              {ranked && <th className="w-12 px-4 py-3">#</th>}
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Niche · City</th>
              <th className="px-4 py-3 text-right">Followers</th>
              <th className="px-4 py-3 text-right">Engagement</th>
              <th className="px-4 py-3 text-center">Flags</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a, i) => (
              <tr key={a.creator.id} className="hover:bg-canvas/60">
                {ranked && <td className="px-4 py-3 font-bold text-muted">{i + 1}</td>}
                <td className="px-4 py-3">
                  <CreatorLink id={a.creator.id} className="flex items-center gap-3">
                    <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{a.creator.name}</span>
                        <VerifiedBadge verified={a.creator.verified} />
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <PlatformBadge platform={a.creator.platform} compact />@{a.creator.handle}
                      </span>
                    </span>
                  </CreatorLink>
                </td>
                <td className="px-4 py-3 text-ink-2">
                  {a.creator.niche ?? <span className="text-muted">No niche</span>}
                  <span className="block text-xs text-muted">{a.creator.city ?? "No city"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold">{formatNumber(a.creator.followers)}</span>
                  <span className="block text-xs text-muted">{sizeBandLabel(a.metrics.band)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold">{formatPercent(a.metrics.engagementRate)}</span>
                  <span className="block">
                    <EngagementChip label={a.metrics.engagementLabel} />
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
            <div className="flex items-start gap-3">
              {ranked && <span className="w-6 pt-2 font-bold text-muted">{i + 1}</span>}
              <CreatorLink id={a.creator.id} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.creator.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <PlatformBadge platform={a.creator.platform} compact />
                    <span className="truncate">@{a.creator.handle}</span>
                  </span>
                </span>
              </CreatorLink>
              <ScoreBadge limited={isLimited(a.score)} score={a.score.total} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted">Followers</p>
                <p className="font-semibold">{formatNumber(a.creator.followers)}</p>
              </div>
              <div>
                <p className="text-muted">Engagement</p>
                <p className="font-semibold">{formatPercent(a.metrics.engagementRate)}</p>
                {a.metrics.viewEngagementRate !== null && <p className="text-muted">{formatPercent(a.metrics.viewEngagementRate)} views</p>}
              </div>
              <div>
                <p className="text-muted">Flags</p>
                <FlagCount flags={a.flags} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs text-ink-2">
              <span>
                {a.creator.niche ?? "No niche"} · {a.creator.city ?? "No city"}
              </span>
              <AddToShortlist creatorId={a.creator.id} compact />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
