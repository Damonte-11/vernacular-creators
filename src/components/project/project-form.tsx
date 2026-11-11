"use client";
import { useState } from "react";
import { addDays, CHORUS_TYPES, DEFAULT_COMMENT_CAP, OBJECTIVES, parseViews, todayLagos } from "@/lib/projects";
import type { CampaignObjective, ChorusType, Project, ProjectFields } from "@/lib/types";
import { buttonClass, cx, inputClass, labelClass } from "../ui";

export type ProjectFormValues = Required<
  Pick<ProjectFields, "name" | "client" | "chorusType" | "vertical" | "startDate" | "endDate" | "guarantee" | "objective" | "sheetUrl" | "commentCap">
>;

/** Name, client, window, views guarantee and objective: used to create and edit a project. */
export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Project;
  submitLabel: string;
  onSubmit: (v: ProjectFormValues) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const today = todayLagos();
  const [name, setName] = useState(initial?.name ?? "");
  const [client, setClient] = useState(initial?.client ?? "");
  const [chorusType, setChorusType] = useState<ChorusType>(initial?.chorusType ?? "seedlings");
  const [vertical, setVertical] = useState(initial?.vertical ?? "");
  const [startDate, setStart] = useState(initial?.startDate ?? today);
  const [endDate, setEnd] = useState(initial?.endDate ?? addDays(today, 20));
  const [guarantee, setGuarantee] = useState(initial?.guarantee ? String(initial.guarantee) : "");
  const [objective, setObjective] = useState<CampaignObjective>(initial?.objective ?? "awareness");
  const [sheetUrl, setSheetUrl] = useState(initial?.sheetUrl ?? "");
  const [commentCap, setCap] = useState(String(initial?.commentCap ?? DEFAULT_COMMENT_CAP));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const g = guarantee.trim() ? parseViews(guarantee) : null;
    const cap = Number(commentCap);
    if (!name.trim()) return setError("Give the project a name.");
    if (endDate < startDate) return setError("The campaign has to end on or after the day it starts.");
    if (guarantee.trim() && g === null) return setError("Write the views guarantee as a number, like 750000, 750k or 1.2m.");
    if (!Number.isInteger(cap) || cap < 0 || cap > 20000) return setError("Comments per post should be a whole number from 0 to 20,000.");
    if (sheetUrl.trim() && !/docs\.google\.com\/spreadsheets/.test(sheetUrl))
      return setError("The sheet link should be a Google Sheets link (docs.google.com/spreadsheets/…).");
    setError(null);
    setBusy(true);
    await onSubmit({
      name: name.trim(),
      client: client.trim(),
      chorusType,
      vertical: vertical.trim(),
      startDate,
      endDate,
      guarantee: g,
      objective,
      sheetUrl: sheetUrl.trim() || null,
      commentCap: cap,
    });
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Campaign</legend>
        <label>
          <span className={labelClass}>Project name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Malt can launch" autoFocus={!initial} />
        </label>
        <label>
          <span className={labelClass}>Client</span>
          <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} placeholder="The brand or agency" />
        </label>
        <label>
          <span className={labelClass}>Vertical</span>
          <input className={inputClass} value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="e.g. Food & drink, Fintech" />
        </label>
        <div>
          <span className={labelClass}>Chorus type</span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-0.5 ring-1 ring-line" role="radiogroup" aria-label="Chorus type">
            {CHORUS_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={chorusType === t.id}
                title={t.hint}
                onClick={() => setChorusType(t.id)}
                className={cx(
                  "h-7 rounded-md text-[13px] font-medium transition-colors",
                  chorusType === t.id ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Window and guarantee</legend>
        <label>
          <span className={labelClass}>Starts</span>
          <input type="date" className={inputClass} value={startDate} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Ends</span>
          <input type="date" className={inputClass} value={endDate} min={startDate} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Views guarantee</span>
          <input className={inputClass} inputMode="decimal" value={guarantee} onChange={(e) => setGuarantee(e.target.value)} placeholder="e.g. 750k" />
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Objective</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Objective">
          {OBJECTIVES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={objective === o.id}
              onClick={() => setObjective(o.id)}
              className={cx(
                "rounded-lg border p-3 text-left transition-colors",
                objective === o.id ? "border-accent bg-accent-soft/40" : "border-line-strong hover:bg-surface-2",
              )}
            >
              <span className="block text-[13px] font-semibold">{o.label}</span>
              <span className="block text-xs text-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <legend className="mb-2 text-sm font-semibold">Links and comments</legend>
        <label>
          <span className={labelClass}>Google Sheet the team logs links in (optional)</span>
          <input className={inputClass} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/…" />
        </label>
        <label>
          <span className={labelClass}>Comments read per post</span>
          <input className={inputClass} inputMode="numeric" value={commentCap} onChange={(e) => setCap(e.target.value)} />
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className={buttonClass.primary} disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={buttonClass.ghost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
