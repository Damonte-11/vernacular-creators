"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CreatorTable } from "@/components/creator-table";
import { LookupForm } from "@/components/lookup-form";
import { buttonClass, Card, EmptyState, PageHeader, SectionHeader, StatTile } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { useAppState } from "@/lib/data/store";
import { sortAnalyses } from "@/lib/filter";

export default function HomePage() {
  const all = useAnalyses();
  const { shortlists } = useAppState();
  const top = useMemo(() => sortAnalyses(all, "score").slice(0, 5), [all]);
  const flagged = all.filter((a) => a.flags.some((f) => f.severity !== "low")).length;
  const scored = all.filter((a) => a.score.total !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score.total ?? 0), 0) / scored.length) : null;

  return (
    <>
      <PageHeader title="Find and vet creators" subtitle="Look up any Instagram, YouTube or TikTok creator and see how they really perform." />
      <Card className="mb-6 p-5 sm:p-6">
        <SectionHeader title="Look up a creator" description="Pick the platform, then paste a handle or profile link." className="mb-4" />
        <LookupForm />
      </Card>

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Creators saved" value={all.length} hint="Instagram, YouTube and TikTok" />
        <StatTile label="Average score" value={avgScore ?? "—"} hint="Across all scored creators" />
        <StatTile label="With warning signs" value={flagged} hint="Medium or high flags" />
        <StatTile label="Shortlists" value={shortlists.length} hint={shortlists.length ? "Ready to share with clients" : "Group creators for a campaign"} />
      </div>

      <SectionHeader
        title="Top creators right now"
        description="Highest Creator Scores across everyone saved."
        className="mb-4"
        action={
          <Link href="/leaderboards" className={buttonClass.ghost}>
            See leaderboards <span aria-hidden>→</span>
          </Link>
        }
      />
      {top.length === 0 ? (
        <EmptyState title="No creators yet" body="Look up a creator above, or paste a list on the Add creators page. Everyone you look up is saved here." />
      ) : (
        <CreatorTable rows={top} ranked />
      )}
    </>
  );
}
