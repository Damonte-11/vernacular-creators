"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { FilterPanel } from "@/components/filters";
import { buttonClass, cx, EmptyState, inputClass, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
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
            <Icon name="plus" size={16} /> Add creators
          </Link>
        }
      />
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        countries={countries}
        trailing={
          <select
            className={cx(inputClass, "w-auto min-w-44 flex-none")}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
          >
            <option value="score">Sort: Score (high to low)</option>
            <option value="followers">Sort: Followers</option>
            <option value="engagement">Sort: Engagement rate</option>
            <option value="name">Sort: Name (A–Z)</option>
          </select>
        }
      />
      <p className="mb-3 mt-5 text-sm text-muted" aria-live="polite">
        {rows.length === all.length ? `Showing all ${rows.length} creators` : `${rows.length} of ${all.length} creators match`}
      </p>
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
