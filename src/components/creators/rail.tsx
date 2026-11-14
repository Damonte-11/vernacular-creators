"use client";
import { useState, type ReactNode } from "react";
import { SIZE_BANDS } from "@config/size-bands";
import { formatNumber } from "@/lib/format";
import type { CreatorView, ViewFilters } from "@/lib/creator-view";
import type { Platform } from "@/lib/types";
import { Icon } from "../icons";
import { cx } from "../ui";
import { parseCount, RangeBars } from "./media";

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const PLATFORM_NAME: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };

function Group({ title, children, open: start = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(start);
  return (
    <div className="border-b border-line py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-2"
        aria-expanded={open}
      >
        {title} <span className={cx("transition-transform duration-150", open && "rotate-90")}>›</span>
      </button>
      {open && <div className="mt-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function Check({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: ReactNode; count: number }) {
  return (
    <label className={cx("flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-2", count === 0 && !on && "opacity-40")}>
      <input type="checkbox" checked={on} onChange={onClick} className="accent-[var(--color-accent)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums text-muted">{count}</span>
    </label>
  );
}

/** Every filter in one column, each option with how many creators it has. */
export function FilterColumn({ all, f, set, onReset }: { all: CreatorView[]; f: ViewFilters; set: (f: ViewFilters) => void; onReset: () => void }) {
  const n = (pred: (x: CreatorView) => boolean) => all.filter(pred).length;
  const values = (key: "niche" | "city") =>
    [...new Map(all.filter((x) => x[key]).map((x) => [x[key]!, 0])).keys()].sort((a, b) => n((x) => x[key] === b) - n((x) => x[key] === a));
  const [moreCities, setMoreCities] = useState(false);
  const cities = values("city");
  return (
    <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 [scrollbar-width:thin]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        <button className="text-xs text-muted underline" onClick={onReset}>
          Reset
        </button>
      </div>
      <Group title="Platform">
        {(["instagram", "tiktok", "youtube"] as const).map((p) => (
          <Check
            key={p}
            on={f.platforms.includes(p)}
            onClick={() => set({ ...f, platforms: toggle(f.platforms, p) })}
            label={
              <span className="flex items-center gap-1.5">
                <Icon name={p} size={13} /> {PLATFORM_NAME[p]}
              </span>
            }
            count={n((x) => x.platform === p)}
          />
        ))}
      </Group>
      <Group title="Expected views">
        <p className="px-1.5 pb-1 text-xs text-muted">Typical views per post</p>
        <RangeBars
          values={all.flatMap((x) => (x.views === null ? [] : [x.views]))}
          edges={[0, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, Infinity]}
          min={f.minViews}
          max={f.maxViews}
          onChange={(minViews, maxViews) => set({ ...f, minViews, maxViews })}
          format={(v) => formatNumber(v)}
          parse={parseCount}
          unit="expected views"
        />
      </Group>
      <Group title="Engagement">
        <p className="px-1.5 pb-1 text-xs text-muted">Likes and comments ÷ followers</p>
        <RangeBars
          values={all.flatMap((x) => (x.er === null ? [] : [x.er]))}
          edges={[0, 0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, Infinity]}
          min={f.minEr}
          max={f.maxEr}
          onChange={(minEr, maxEr) => set({ ...f, minEr, maxEr })}
          format={(v) => `${+(v * 100).toFixed(1)}%`}
          parse={(t) => {
            const v = parseFloat(t.replace("%", ""));
            return Number.isFinite(v) ? v / 100 : null;
          }}
          unit="engagement"
        />
      </Group>
      <Group title="Size">
        {SIZE_BANDS.map((b) => (
          <Check
            key={b.id}
            on={f.bands.includes(b.id)}
            onClick={() => set({ ...f, bands: toggle(f.bands, b.id) })}
            label={`${b.label} · ${formatNumber(b.min)}${Number.isFinite(b.max) ? `–${formatNumber(b.max)}` : "+"}`}
            count={n((x) => x.band === b.id)}
          />
        ))}
      </Group>
      <Group title="Niche">
        {values("niche").map((v) => (
          <Check key={v} on={f.niches.includes(v)} onClick={() => set({ ...f, niches: toggle(f.niches, v) })} label={v} count={n((x) => x.niche === v)} />
        ))}
        {!values("niche").length && <p className="px-1.5 text-xs text-muted">Set niches on creator profiles to filter by them.</p>}
      </Group>
      <Group title="City">
        {(moreCities ? cities : cities.slice(0, 8)).map((v) => (
          <Check key={v} on={f.cities.includes(v)} onClick={() => set({ ...f, cities: toggle(f.cities, v) })} label={v} count={n((x) => x.city === v)} />
        ))}
        {cities.length > 8 && (
          <button className="px-1.5 text-xs font-medium text-accent-ink" onClick={() => setMoreCities(!moreCities)}>
            {moreCities ? "Fewer" : `All ${cities.length} cities`}
          </button>
        )}
      </Group>
      <Group title="Quality">
        <label className="block px-1.5 py-1 text-[13px]">
          <span className="flex justify-between text-xs text-muted">
            Score at least <b className="text-ink">{f.minScore ?? 0}</b>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={f.minScore ?? 0}
            onChange={(e) => set({ ...f, minScore: Number(e.target.value) || null })}
            className="w-full accent-[var(--color-accent)]"
          />
        </label>
        <Check on={f.noFlags} onClick={() => set({ ...f, noFlags: !f.noFlags })} label="No warning flags" count={n((x) => !x.a.flags.length)} />
      </Group>
      <Group title="Contact and activity" open={false}>
        <Check on={f.emailOnly} onClick={() => set({ ...f, emailOnly: !f.emailOnly })} label="Has email" count={n((x) => !!x.email)} />
        <Check
          on={f.activeOnly}
          onClick={() => set({ ...f, activeOnly: !f.activeOnly })}
          label="Posted this fortnight"
          count={n((x) => x.lastPostDays !== null && x.lastPostDays <= 14)}
        />
        <Check
          on={f.found === "auto"}
          onClick={() => set({ ...f, found: f.found === "auto" ? "" : "auto" })}
          label="Found by discovery"
          count={n((x) => x.found === "auto")}
        />
        <Check
          on={f.found === "manual"}
          onClick={() => set({ ...f, found: f.found === "manual" ? "" : "manual" })}
          label="Added by the team"
          count={n((x) => x.found === "manual")}
        />
      </Group>
    </aside>
  );
}
