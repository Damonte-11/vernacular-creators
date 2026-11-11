"use client";
import { useEffect, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatDate } from "@/lib/format";
import { COLUMN_ROLES, AGENT_COLUMNS, type ColumnRole, type SheetLayout } from "@/lib/sheet-sync";
import { IS_LIVE } from "@/lib/supabase/config";
import type { Project } from "@/lib/types";
import { columnLetterOf } from "./sheet-letters";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass, labelClass, SectionHeader } from "../ui";

/**
 * Connect a project's Google Sheet: share it with the app, confirm which
 * column is which once, then the agent keeps the project and the sheet in step.
 */
export function SheetView({ p }: { p: Project }) {
  const [info, setInfo] = useState<{ serviceEmail: string | null; ai: boolean } | null>(null);
  const [url, setUrl] = useState(p.sheetUrl ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const state = p.sheetState ?? {};
  const draftFrom = state.proposed ?? state.layout ?? null;
  const [draft, setDraft] = useState<SheetLayout | null>(draftFrom);
  useEffect(() => setDraft(state.proposed ?? state.layout ?? null), [state.proposed, state.layout]);

  useEffect(() => {
    if (!IS_LIVE) return setInfo({ serviceEmail: null, ai: false });
    fetch(`/api/projects/${p.id}/sheet`)
      .then((r) => r.json())
      .then((b) => setInfo({ serviceEmail: b.serviceEmail ?? null, ai: !!b.ai }))
      .catch(() => setInfo({ serviceEmail: null, ai: false }));
  }, [p.id]);

  async function run(label: string, req: Parameters<typeof actions.sheetAgent>[1]) {
    setBusy(label);
    setNote(null);
    const r = await actions.sheetAgent(p.id, req);
    setBusy(null);
    setNote(r.message);
  }

  const headers = state.headers ?? [];
  const width = Math.max(headers.length, ...Object.values(draft?.columns ?? {}).map((c) => (c ?? -1) + 1), 1);
  const colOptions = Array.from({ length: Math.max(width, 6) }, (_, i) => ({ i, label: `${columnLetterOf(i)}${headers[i] ? `: ${headers[i]}` : ""}` }));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {/* 1. The sheet */}
        <Card className="p-4 sm:p-5">
          <SectionHeader title="1. The sheet" description="The Google Sheet your team logs post links in." />
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (url.trim() && !/docs\.google\.com\/spreadsheets/.test(url))
                return setNote("That isn't a Google Sheets link (docs.google.com/spreadsheets/…).");
              await actions.updateProject(p.id, { sheetUrl: url.trim() || null });
              setNote(url.trim() ? "Sheet link saved." : "Sheet disconnected.");
            }}
          >
            <input
              className={inputClass}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              aria-label="Google Sheet link"
            />
            <button className={buttonClass.secondary} disabled={url.trim() === (p.sheetUrl ?? "")}>
              Save link
            </button>
          </form>
          {IS_LIVE && (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
              {info?.serviceEmail ? (
                <>
                  In Google Sheets, click <b>Share</b> and add <b className="select-all break-all font-semibold text-ink">{info.serviceEmail}</b> as{" "}
                  <b>Editor</b>. Editor lets the agent write the numbers back into its own columns.
                </>
              ) : info ? (
                <>Google Sheets isn&apos;t connected to the app yet. It needs GOOGLE_SERVICE_ACCOUNT_JSON in Vercel (see docs/SETUP.md).</>
              ) : (
                "Checking the connection…"
              )}
            </p>
          )}
          {!IS_LIVE && (
            <p className="mt-3 text-xs text-muted">Demo: the steps below use a made-up messy sheet, so you can see how the agent reads and matches it.</p>
          )}
        </Card>

        {/* 2. Layout */}
        <Card className={cx("p-4 sm:p-5", !p.sheetUrl && IS_LIVE && "opacity-60")}>
          <SectionHeader
            title="2. Which column is which"
            description="The agent reads the top of the sheet and suggests this. Check it once; it's remembered."
            action={
              <button
                className={buttonClass.secondary}
                disabled={!!busy || (IS_LIVE && !p.sheetUrl)}
                onClick={() => run("read", { action: "read-layout", tab: draft?.tab ?? null })}
              >
                {busy === "read" ? "Reading…" : draft ? "Read again" : "Read the sheet"}
              </button>
            }
          />
          {draft ? (
            <div className="mt-4 space-y-3">
              {state.proposed && <p className="text-[13px] font-medium text-warn">Suggested layout: check it and confirm.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {(state.tabs?.length ?? 0) > 1 && (
                  <label>
                    <span className={labelClass}>Tab</span>
                    <select className={inputClass} value={draft.tab} onChange={(e) => run("read", { action: "read-layout", tab: e.target.value })}>
                      {state.tabs!.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span className={labelClass}>Headings are on row</span>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={draft.headerRow + 1}
                    onChange={(e) => setDraft({ ...draft, headerRow: Math.max(0, (Number(e.target.value) || 1) - 1) })}
                  />
                </label>
                {COLUMN_ROLES.map((r) => (
                  <label key={r.id}>
                    <span className={labelClass}>{r.label}</span>
                    <select
                      className={cx(inputClass, r.id === "link" && draft.columns.link === null && "border-bad")}
                      value={draft.columns[r.id] ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, columns: { ...draft.columns, [r.id as ColumnRole]: e.target.value === "" ? null : Number(e.target.value) } })
                      }
                    >
                      <option value="">{r.id === "link" ? "Pick the column…" : "Not in this sheet"}</option>
                      {colOptions.map((o) => (
                        <option key={o.i} value={o.i}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className={buttonClass.primary}
                disabled={!!busy || draft.columns.link === null}
                onClick={() => run("confirm", { action: "confirm-layout", layout: draft })}
              >
                {busy === "confirm" ? "Saving and syncing…" : state.layout && !state.proposed ? "Save changes and sync" : "Confirm and sync"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Not read yet.</p>
          )}
        </Card>

        {/* 3. Syncing */}
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="3. Keeping in step"
            description="Every hour: new links in the sheet are added here, and the latest numbers are written into the sheet."
            action={
              <button className={buttonClass.primary} disabled={!!busy || !state.layout} onClick={() => run("sync", { action: "sync" })}>
                {busy === "sync" ? "Syncing…" : "Sync now"}
              </button>
            }
          />
          {note && (
            <p role="status" className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
              {note}
            </p>
          )}
          {state.lastSyncAt && (
            <p className="mt-3 text-xs text-muted">
              Last synced {formatDate(state.lastSyncAt)}: {state.lastResult}
            </p>
          )}
          {(state.log?.length ?? 0) > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] font-medium text-ink-2">What the agent did ({state.log!.length})</summary>
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-xs">
                {state.log!.map((l, i) => (
                  <li key={i} className="flex gap-3 px-3 py-1.5">
                    <span className="shrink-0 tabular-nums text-muted">
                      {new Date(l.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-ink-2">{l.text}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>

      <Card className="p-4 text-[13px] text-ink-2">
        <p className="text-sm font-semibold text-ink">How the agent works</p>
        <ul className="mt-2 space-y-2">
          <li className="flex gap-2">
            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-good" /> Sure matches (handle, name or the link itself) are added straight away.
          </li>
          <li className="flex gap-2">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-muted" />
            {info?.ai || !IS_LIVE
              ? "Messy rows are matched by AI. Anything it isn't sure of shows in Needs attention as a guess to confirm."
              : "Messy rows show in Needs attention for you to match (AI matching switches on with ANTHROPIC_API_KEY)."}
          </li>
          <li className="flex gap-2">
            <Icon name="star" size={14} className="mt-0.5 shrink-0 text-accent" /> When you confirm a spelling, it&apos;s remembered for next time.
          </li>
          <li className="flex gap-2">
            <Icon name="clipboard" size={14} className="mt-0.5 shrink-0 text-muted" /> It only writes into its own columns: {AGENT_COLUMNS.join(", ")}. Anything
            typed over them by hand is left alone.
          </li>
        </ul>
      </Card>
    </div>
  );
}
