"use client";
import { useMemo, useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { bandOptions, cityOptions, nicheOptions, platformOptions, Select } from "@/components/filters";
import { EmptyState, PageHeader } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { applyFilters, EMPTY_FILTERS, sortAnalyses } from "@/lib/filter";

export default function LeaderboardsPage() {
  const all = useAnalyses();
  const [f, setF] = useState(EMPTY_FILTERS);
  const rows = useMemo(
    () => sortAnalyses(applyFilters(all, f), "score").filter((a) => a.score.total !== null),
    [all, f],
  );
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  return (
    <>
      <PageHeader title="Leaderboards" subtitle="Top creators by Creator Score. Pick a size to compare like with like." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Select label="Platform" value={f.platform} onChange={set("platform")} options={platformOptions} />
        <Select label="Niche" value={f.niche} onChange={set("niche")} options={nicheOptions} />
        <Select label="City" value={f.city} onChange={set("city")} options={cityOptions} />
        <Select label="Size" value={f.band} onChange={set("band")} options={bandOptions} allLabel="All sizes" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nobody here yet" body="No scored creators match these choices. Try a wider filter." />
      ) : (
        <CreatorTable rows={rows} ranked />
      )}
    </>
  );
}
