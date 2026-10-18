"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { FilterPanel, Select } from "@/components/filters";
import { buttonClass, EmptyState, PageHeader } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { applyFilters, EMPTY_FILTERS, sortAnalyses, type SortKey } from "@/lib/filter";

export default function CreatorsPage() {
  const all = useAnalyses();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("score");
  const countries = useMemo(() => [...new Set(all.map((a) => a.creator.country))].sort(), [all]);
  const rows = useMemo(() => sortAnalyses(applyFilters(all, filters), sort), [all, filters, sort]);

  return (
    <>
      <PageHeader
        title="Creators"
        subtitle={`${all.length} creators in the database`}
        actions={
          <Link href="/add" className={buttonClass.primary}>
            Add creators
          </Link>
        }
      />
      <FilterPanel filters={filters} onChange={setFilters} countries={countries} />
      <div className="my-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {rows.length} {rows.length === 1 ? "result" : "results"}
        </p>
        <div className="w-48">
          <Select
            label="Sort by"
            value={sort}
            onChange={(v) => setSort((v || "score") as SortKey)}
            allLabel="Score (high to low)"
            options={[
              { value: "followers", label: "Followers" },
              { value: "engagement", label: "Engagement rate" },
              { value: "name", label: "Name (A–Z)" },
            ]}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No creators match these filters"
          body="Try removing a filter, or look up a new creator by handle."
          action={
            <button className={buttonClass.secondary} onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all filters
            </button>
          }
        />
      ) : (
        <CreatorTable rows={rows} />
      )}
    </>
  );
}
