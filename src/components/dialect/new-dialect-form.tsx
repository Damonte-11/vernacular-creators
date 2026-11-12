"use client";
import { useMemo, useState } from "react";
import { formatFull } from "@/lib/format";
import { parseViews } from "@/lib/projects";
import { DIALECT_PLATFORMS, METRICS, monthName, splitTargets, type DialectPlatform, type Metric, type Totals } from "@/lib/dialect";
import type { NewDialect } from "@/lib/data/dialect-store";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass, labelClass } from "../ui";

/** Brand, pages, the agreement (start and length) and its total targets, shown split by month as you type. */
export function NewDialectForm({ startMonth, onCreate }: { startMonth: string; onCreate: (v: NewDialect) => Promise<string | null> }) {
  const [brand, setBrand] = useState("");
  const [client, setClient] = useState("");
  const [handles, setHandles] = useState<Record<DialectPlatform, string | null>>({ instagram: "", tiktok: "", x: "", youtube: null });
  const [start, setStart] = useState(startMonth);
  const [months, setMonths] = useState(4);
  const [totals, setTotals] = useState<Record<Metric, string>>({ views: "", followers: "", posts: "", engagements: "" });
  const [competitors, setCompetitors] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const out = {} as Totals;
    for (const m of METRICS) out[m.id as Metric] = totals[m.id as Metric].trim() ? (parseViews(totals[m.id as Metric]) ?? NaN) : 0;
    return out;
  }, [totals]);
  const split = useMemo(() => splitTargets(parsed, start, months), [parsed, start, months]);
  const anyTarget = METRICS.some((m) => parsed[m.id as Metric] > 0);

  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = DIALECT_PLATFORMS.filter((p) => handles[p.id] !== null);
    if (!brand.trim()) return setError("Give the brand's name.");
    if (chosen.length === 0) return setError("Tick at least one platform.");
    if (chosen.some((p) => !handles[p.id]?.trim())) return setError("Add the page's handle for each ticked platform.");
    if (METRICS.some((m) => Number.isNaN(parsed[m.id as Metric]))) return setError("Write targets as numbers, like 1600000, 1.6m or 400k.");
    if (!anyTarget) return setError("Add at least one target from the agreement.");
    setError(null);
    setBusy(true);
    const err = await onCreate({
      brand: brand.trim(),
      client: client.trim(),
      platforms: chosen.map((x) => ({ platform: x.id, handle: (handles[x.id] ?? "").trim() })),
      startMonth: start,
      months,
      totals: parsed,
      competitors: competitors
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <Card className="space-y-5 p-4 sm:p-5">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Brand</legend>
          <label>
            <span className={labelClass}>Brand name</span>
            <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Glide Rides" autoFocus />
          </label>
          <label>
            <span className={labelClass}>Client (on the report)</span>
            <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} placeholder="The company or agency" />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Pages we run</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIALECT_PLATFORMS.map((p) => {
              const on = handles[p.id] !== null;
              return (
                <div key={p.id} className={cx("flex items-center gap-2 rounded-lg border px-3 py-2", on ? "border-line-strong" : "border-line")}>
                  <input
                    id={`pl-${p.id}`}
                    type="checkbox"
                    className="accent-[var(--color-accent)]"
                    checked={on}
                    onChange={() => setHandles((h) => ({ ...h, [p.id]: on ? null : "" }))}
                  />
                  <label htmlFor={`pl-${p.id}`} className="flex w-24 items-center gap-1.5 text-[13px] font-medium">
                    <Icon name={p.id} size={14} className="text-muted" /> {p.label}
                  </label>
                  <input
                    className={cx(inputClass, "flex-1")}
                    disabled={!on}
                    value={handles[p.id] ?? ""}
                    onChange={(e) => setHandles((h) => ({ ...h, [p.id]: e.target.value.replace(/^@/, "") }))}
                    placeholder={on ? "@handle" : "Not used"}
                    aria-label={`${p.label} handle`}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
          <legend className="mb-2 text-sm font-semibold">Agreement</legend>
          <label>
            <span className={labelClass}>First month</span>
            <input type="month" className={inputClass} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Length</span>
            <select className={inputClass} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "month" : "months"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Competitors the AI watches (optional)</span>
            <input className={inputClass} value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="Separate with commas" />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Targets for the whole agreement</legend>
          <p className="mb-2 text-xs text-muted">
            As written in the agreement. They&apos;re split evenly by month below; change single months later in Targets and settings.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {METRICS.map((m) => (
              <label key={m.id}>
                <span className={labelClass}>{m.label}</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={totals[m.id as Metric]}
                  onChange={(e) => setTotals((t) => ({ ...t, [m.id]: e.target.value }))}
                  placeholder={{ views: "e.g. 1.6m", followers: "e.g. 12k", posts: "e.g. 240", engagements: "e.g. 60k" }[m.id]}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="overflow-hidden">
        <p className="p-4 pb-3 text-sm font-semibold sm:px-5">Each month&apos;s target</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-4 pr-3 font-medium sm:pl-5">Month</th>
                {METRICS.map((m) => (
                  <th key={m.id} className="px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {Object.entries(split).map(([m, t]) => (
                <tr key={m}>
                  <td className="py-2 pl-4 pr-3 sm:pl-5">
                    {monthName(m)} {m.slice(0, 4)}
                  </td>
                  {METRICS.map((k) => (
                    <td key={k.id} className="px-3 py-2 text-right text-ink-2">
                      {parsed[k.id as Metric] > 0 ? formatFull(t[k.id as Metric]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}
      <button className={buttonClass.primary} disabled={busy}>
        {busy ? "Creating…" : "Create Dialect project"}
      </button>
    </form>
  );
}
