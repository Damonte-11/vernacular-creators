"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { ActiveFilterChips, FilterBar, FilterRail } from "@/components/filters";
import { buttonClass, cx, EmptyState, inputClass, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useAnalyses } from "@/lib/data/creators";
import { applyFilters, EMPTY_FILTERS, sortAnalyses, type SortKey } from "@/lib/filter";
import { formatFull } from "@/lib/format";

const PAGE_SIZE = 50;

export default function CreatorsPage() {
  const all = useAnalyses();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("score");
  const [page, setPage] = useState(1);
  const countries = useMemo(() => [...new Set(all.map((a) => a.creator.country))].sort(), [all]);
  const rows = useMemo(() => sortAnalyses(applyFilters(all, filters), sort), [all, filters, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // The search box in the side menu sends people here with ?q=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setFilters((f) => ({ ...f, q }));
    const onSearch = (e: Event) => {
      setFilters((f) => ({ ...f, q: (e as CustomEvent<string>).detail }));
      setPage(1);
    };
    window.addEventListener("creator-search", onSearch);
    return () => window.removeEventListener("creator-search", onSearch);
  }, []);
  const change = (f: typeof filters) => {
    setFilters(f);
    setPage(1);
  };
  const changeSort = (k: SortKey) => {
    setSort(k);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Creators"
        subtitle={`${formatFull(all.length)} saved across Instagram, YouTube and TikTok`}
        actions={
          <Link href="/add" className={buttonClass.primary}>
            <Icon name="plus" size={15} /> Add creators
          </Link>
        }
      />
      <div className="flex items-start gap-6">
        <FilterRail filters={filters} onChange={change} countries={countries} />
        <div className="min-w-0 flex-1">
          <FilterBar
            filters={filters}
            onChange={change}
            countries={countries}
            trailing={
              <select className={cx(inputClass, "w-auto min-w-40 flex-none md:hidden")} value={sort} onChange={(e) => changeSort(e.target.value as SortKey)} aria-label="Sort by">
                <option value="score">Sort: Score</option>
                <option value="followers">Sort: Followers</option>
                <option value="engagement">Sort: Engagement rate</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>
            }
          />
          <div className="my-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[13px] text-muted" aria-live="polite">
              {rows.length === all.length ? `${formatFull(rows.length)} creators` : `${formatFull(rows.length)} of ${formatFull(all.length)} match`}
            </p>
            <ActiveFilterChips filters={filters} onChange={change} />
          </div>
          {rows.length === 0 ? (
            <EmptyState
              title="No creators match"
              body="Remove a filter or change the search. To bring in someone new, look them up by handle."
              action={
                <div className="flex gap-2">
                  <button className={buttonClass.secondary} onClick={() => change(EMPTY_FILTERS)}>
                    Clear search and filters
                  </button>
                  <Link href="/add" className={buttonClass.primary}>
                    Add creators
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <CreatorTable rows={visible} sort={sort} onSort={changeSort} />
              {pages > 1 && (
                <nav className="mt-3 flex items-center justify-between text-[13px] text-muted" aria-label="Pages">
                  <span>
                    {formatFull((current - 1) * PAGE_SIZE + 1)}–{formatFull(Math.min(current * PAGE_SIZE, rows.length))} of {formatFull(rows.length)}
                  </span>
                  <span className="flex gap-2">
                    <button className={buttonClass.secondary} onClick={() => setPage(current - 1)} disabled={current === 1}>
                      Previous
                    </button>
                    <button className={buttonClass.secondary} onClick={() => setPage(current + 1)} disabled={current === pages}>
                      Next
                    </button>
                  </span>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
