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

export function FilterPanel({
  filters,
  onChange,
  countries,
}: {
  filters: CreatorFilters;
  onChange: (f: CreatorFilters) => void;
  countries: string[];
}) {
  const [open, setOpen] = useState(false);
  const set = (k: Field) => (v: string) => onChange({ ...filters, [k]: v });
  const active = countActive(filters);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={cx(inputClass, "pl-10")}
            placeholder="Search by name or handle"
            value={filters.q}
            onChange={(e) => set("q")(e.target.value)}
            aria-label="Search by name or handle"
          />
        </div>
        <button className={buttonClass.secondary} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Filters{active > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-brand-ink">{active}</span>}
        </button>
      </div>

      {open && (
        <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Platform" value={filters.platform} onChange={set("platform")} options={platformOptions} />
          <Select label="Niche" value={filters.niche} onChange={set("niche")} options={nicheOptions} />
          <Select label="City" value={filters.city} onChange={set("city")} options={cityOptions} />
          <Select label="Country" value={filters.country} onChange={set("country")} options={countries.map((c) => ({ value: c, label: c }))} />
          <Select label="Size" value={filters.band} onChange={set("band")} options={bandOptions} />
          <RangeInputs label="Followers" min={filters.followersMin} max={filters.followersMax} onMin={set("followersMin")} onMax={set("followersMax")} placeholder={["e.g. 10k", "e.g. 500k"]} />
          <RangeInputs label="Engagement by followers (%)" min={filters.erMin} max={filters.erMax} onMin={set("erMin")} onMax={set("erMax")} placeholder={["e.g. 2", "e.g. 8"]} />
          <RangeInputs label="Engagement by views (%)" min={filters.verMin} max={filters.verMax} onMin={set("verMin")} onMax={set("verMax")} placeholder={["e.g. 4", "e.g. 15"]} />
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
          <div className="flex items-end">
            <button className={buttonClass.ghost} onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })}>
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
