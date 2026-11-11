"use client";
import { PLATFORMS, platformName } from "@/lib/platforms";
import { useState } from "react";
import { CITIES, NICHES } from "@config/app";
import { SIZE_BANDS } from "@config/size-bands";
import { countActive, EMPTY_FILTERS, type CreatorFilters } from "@/lib/filter";
import { buttonClass, cx, inputClass, labelClass } from "./ui";
import { Icon } from "./icons";

type Field = keyof CreatorFilters;

export function Select({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeInputs({
  label,
  min,
  max,
  onMin,
  onMax,
  placeholder,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  placeholder: [string, string];
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2">
        <input className={inputClass} inputMode="decimal" value={min} onChange={(e) => onMin(e.target.value)} placeholder={placeholder[0]} aria-label={`${label} minimum`} />
        <span className="text-muted">–</span>
        <input className={inputClass} inputMode="decimal" value={max} onChange={(e) => onMax(e.target.value)} placeholder={placeholder[1]} aria-label={`${label} maximum`} />
      </div>
    </div>
  );
}

export const nicheOptions = NICHES.map((n) => ({ value: n, label: n }));
export const cityOptions = CITIES.map((c) => ({ value: c, label: c }));
export const bandOptions = SIZE_BANDS.map((b) => ({
  value: b.id,
  label: `${b.label} (${short(b.min)}${b.max === Infinity ? "+" : `–${short(b.max)}`})`,
}));
export const platformOptions = PLATFORMS.map((p) => ({ value: p, label: platformName(p) }));

function short(n: number): string {
  return n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1_000 ? `${n / 1_000}K` : `${n}`;
}

/** The filter fields, shared by the side rail (laptops) and the drop-down sheet (phones). */
function FilterFields({ filters, onChange, countries }: { filters: CreatorFilters; onChange: (f: CreatorFilters) => void; countries: string[] }) {
  const set = (k: Field) => (v: string) => onChange({ ...filters, [k]: v });
  return (
    <>
      <Select label="Platform" value={filters.platform} onChange={set("platform")} options={platformOptions} />
      <Select label="Size" value={filters.band} onChange={set("band")} options={bandOptions} />
      <RangeInputs label="Followers" min={filters.followersMin} max={filters.followersMax} onMin={set("followersMin")} onMax={set("followersMax")} placeholder={["10k", "500k"]} />
      <Select label="Niche" value={filters.niche} onChange={set("niche")} options={nicheOptions} />
      <Select label="City" value={filters.city} onChange={set("city")} options={cityOptions} />
      <Select label="Country" value={filters.country} onChange={set("country")} options={countries.map((c) => ({ value: c, label: c }))} />
      <RangeInputs label="Engagement by followers (%)" min={filters.erMin} max={filters.erMax} onMin={set("erMin")} onMax={set("erMax")} placeholder={["2", "8"]} />
      <RangeInputs label="Engagement by views (%)" min={filters.verMin} max={filters.verMax} onMin={set("verMin")} onMax={set("verMax")} placeholder={["4", "15"]} />
      <RangeInputs label="Score" min={filters.scoreMin} max={filters.scoreMax} onMin={set("scoreMin")} onMax={set("scoreMax")} placeholder={["0", "100"]} />
      <Select
        label="Verified"
        value={filters.verified}
        onChange={set("verified")}
        options={[
          { value: "yes", label: "Verified only" },
          { value: "no", label: "Not verified" },
        ]}
        allLabel="Any"
      />
      <Select
        label="Added"
        value={filters.found}
        onChange={set("found")}
        options={[
          { value: "auto", label: "Found automatically" },
          { value: "manual", label: "Added by the team" },
        ]}
        allLabel="Any way"
      />
    </>
  );
}

/** Always-visible filter column for laptops, like the search rail in Modash. */
export function FilterRail(props: { filters: CreatorFilters; onChange: (f: CreatorFilters) => void; countries: string[] }) {
  const active = countActive(props.filters);
  return (
    <aside className="hidden w-[232px] shrink-0 lg:block" aria-label="Filters">
      <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col rounded-xl border border-line">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3.5">
          <p className="text-[13px] font-semibold">
            Filters {active > 0 && <span className="ml-1 rounded bg-brand px-1.5 py-px text-[11px] font-medium text-brand-ink">{active}</span>}
          </p>
          <button className="text-xs font-medium text-ink-2 hover:text-ink hover:underline disabled:opacity-40 disabled:hover:no-underline" onClick={() => props.onChange({ ...EMPTY_FILTERS, q: props.filters.q })} disabled={active === 0}>
            Clear
          </button>
        </div>
        <div className="flex flex-col gap-3.5 overflow-y-auto p-3.5">
          <FilterFields {...props} />
        </div>
      </div>
    </aside>
  );
}

/** Search box, plus (on phones and tablets) a button that opens the filters. `trailing` adds controls to the row. */
export function FilterBar({
  filters,
  onChange,
  countries,
  trailing,
}: {
  filters: CreatorFilters;
  onChange: (f: CreatorFilters) => void;
  countries: string[];
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = countActive(filters);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Icon name="search" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className={cx(inputClass, "pl-8")} placeholder="Search by name or handle" value={filters.q} onChange={(e) => onChange({ ...filters, q: e.target.value })} aria-label="Search by name or handle" />
        </div>
        <button className={cx(buttonClass.secondary, "lg:hidden", open && "bg-surface-2")} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="creator-filters">
          <Icon name="settings" size={15} className="text-muted" />
          Filters
          {active > 0 && <span className="rounded bg-brand px-1.5 text-[11px] leading-[18px] text-brand-ink">{active}</span>}
        </button>
        {trailing}
      </div>
      {open && (
        <div id="creator-filters" className="fade-enter grid gap-3.5 rounded-xl border border-line bg-surface p-3.5 sm:grid-cols-2 lg:hidden">
          <FilterFields filters={filters} onChange={onChange} countries={countries} />
          <div className="flex items-end">
            <button className={buttonClass.ghost} onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })} disabled={active === 0}>
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CHIP_LABEL: Partial<Record<Field, string>> = {
  platform: "Platform",
  niche: "Niche",
  city: "City",
  country: "Country",
  band: "Size",
  followersMin: "Followers from",
  followersMax: "Followers up to",
  erMin: "Engagement from %",
  erMax: "Engagement up to %",
  verMin: "By views from %",
  verMax: "By views up to %",
  scoreMin: "Score from",
  scoreMax: "Score up to",
  verified: "Verified",
  found: "Added",
};

/** The filters in use, each removable with one click. */
export function ActiveFilterChips({ filters, onChange }: { filters: CreatorFilters; onChange: (f: CreatorFilters) => void }) {
  const entries = (Object.entries(filters) as [Field, string][]).filter(([k, v]) => k !== "q" && v !== "");
  if (entries.length === 0) return null;
  const text = (k: Field, v: string) =>
    k === "platform" ? platformName(v as never) : k === "band" ? (SIZE_BANDS.find((b) => b.id === v)?.label ?? v) : k === "found" ? (v === "auto" ? "Found automatically" : "By the team") : k === "verified" ? (v === "yes" ? "Yes" : "No") : v;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Filters in use">
      {entries.map(([k, v]) => (
        <li key={k}>
          <button
            onClick={() => onChange({ ...filters, [k]: "" })}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-line-strong bg-surface-2 pl-2 pr-1 text-xs text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
            aria-label={`Remove filter: ${CHIP_LABEL[k]} ${text(k, v)}`}
          >
            <span className="text-muted">{CHIP_LABEL[k]}:</span> <span className="font-medium">{text(k, v)}</span>
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}
