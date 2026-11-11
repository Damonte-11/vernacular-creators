"use client";
import { useEffect, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatDate } from "@/lib/format";
import { COLUMN_ROLES, AGENT_COLUMNS, type ColumnRole, type SheetLayout } from "@/lib/sheet-sync";
import { IS_LIVE } from "@/lib/supabase/config";
import type { Project } from "@/lib/types";
import { sheetScript } from "@/lib/sheet-script";
import { columnLetterOf } from "./sheet-letters";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass, labelClass, SectionHeader } from "../ui";

/**
 * Connect a project's Google Sheet: share it with the app, confirm which
 * column is which once, then the agent keeps the project and the sheet in step.
 */
export function SheetView({ p }: { p: Project }) {
  const [info, setInfo] = useState<{ serviceEmail: string | null; ai: boolean; aiName?: string | null; aiProblem?: string | null } | null>(null);
  const [url, setUrl] = useState(p.sheetUrl ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const state = p.sheetState ?? {};
  // With the app's Google service account set up, sharing the sheet is the simplest way in.
  const shared = IS_LIVE && !!info?.serviceEmail;
  const draftFrom = state.proposed ?? state.layout ?? null;
  const [draft, setDraft] = useState<SheetLayout | null>(draftFrom);
  useEffect(() => setDraft(state.proposed ?? state.layout ?? null), [state.proposed, state.layout]);

  useEffect(() => {
    if (!IS_LIVE) return setInfo({ serviceEmail: null, ai: false });
    fetch(`/api/projects/${p.id}/sheet`)
      .then((r) => r.json())
      .then((b) => setInfo({ serviceEmail: b.serviceEmail ?? null, ai: !!b.ai, aiName: b.aiName ?? null, aiProblem: b.aiProblem ?? null }))
      .catch(() => setInfo({ serviceEmail: null, ai: false }));
  }, [p.id]);

  async function makeScript() {
    // Reuse the project's code when there is one, so a pasted script keeps working.
    let token = state.hookToken;
    if (!token) {
      setBusy("hook");
      token = (await actions.sheetAgent(p.id, { action: "hook" })).token;
      setBusy(null);
    }
    if (token) setScript(sheetScript(window.location.origin, token, p.name));
  }

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
        {/* 1. Connect */}
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="1. Connect the sheet"
            description={
              shared
                ? "The Google Sheet your team logs post links in. Share it with the app, and the agent reads it every hour."
                : "The Google Sheet your team logs post links in. A small script inside the sheet does the syncing: no Google Cloud setup needed."
            }
          />
          {state.lastHeardAt && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-good">
              <Icon name="check" size={14} /> Connected. The sheet last synced{" "}
              {new Date(state.lastHeardAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.
            </p>
          )}
          {shared ? (
            <div className="mt-3 space-y-3">
              <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-ink-2">
                <li>Paste the sheet&apos;s link below and save.</li>
                <li>
                  In Google Sheets, click <b>Share</b> and add <b className="select-all break-all font-semibold text-ink">{info!.serviceEmail}</b> as{" "}
                  <b>Editor</b>, so the agent can write numbers into its own columns.
                </li>
                <li>
                  Click <b>Read the sheet</b> in step 2.
                </li>
              </ol>
              <form
                className="mt-2 flex flex-col gap-2 sm:flex-row"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (url.trim() && !/docs\.google\.com\/spreadsheets/.test(url))
                    return setNote("That isn't a Google Sheets link (docs.google.com/spreadsheets/…).");
                  await actions.updateProject(p.id, { sheetUrl: url.trim() || null });
                  setNote(url.trim() ? "Sheet link saved." : "Sheet link removed.");
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
              {p.sheetUrl && (
                <a
                  href={p.sheetUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-2 underline"
                >
                  Open the sheet <Icon name="link" size={11} />
                </a>
              )}
              <details>
                <summary className="cursor-pointer text-xs font-medium text-ink-2">
                  Sharing outside your company isn&apos;t allowed? Connect with a script instead
                </summary>
                <div className="mt-2">
                  {script ? (
                    <div className="mt-3 space-y-3">
                      <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-ink-2">
                        <li>
                          Open the Google Sheet, then <b>Extensions → Apps Script</b>.
                        </li>
                        <li>Delete what&apos;s in the editor, then paste the script below (use Copy script).</li>
                        <li>
                          Click the save icon. In the box at the top next to <b>Debug</b>, pick <b>connect</b>, then click <b>Run</b>.
                        </li>
                        <li>
                          Google asks to allow it: <b>Review permissions</b> → pick your account → <b>Advanced</b> → <b>Go to … (unsafe)</b> → <b>Allow</b>.
                          Google shows that warning for any script that isn&apos;t published; this one is yours.
                        </li>
                        <li>Come back here: step 2 shows the sheet&apos;s columns to confirm.</li>
                      </ol>
                      <div className="relative">
                        <textarea
                          readOnly
                          rows={8}
                          value={script}
                          className={cx(inputClass, "font-mono text-[11px] leading-relaxed")}
                          aria-label="Sheet script"
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          className={cx(buttonClass.primary, "absolute right-2 top-2")}
                          onClick={async () => {
                            await navigator.clipboard.writeText(script).catch(() => undefined);
                            setCopied(true);
                          }}
                        >
                          {copied ? "Copied" : "Copy script"}
                        </button>
                      </div>
                      <p className="text-xs text-muted">
                        The script contains a private code for this project. Don&apos;t share it outside the team. Making a new script switches the old one off.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button className={buttonClass.primary} disabled={!!busy} onClick={makeScript}>
                        {busy === "hook" ? "Making the script…" : state.hookToken ? "Show the script again" : "Get the sheet script"}
                      </button>
                      {!IS_LIVE && <span className="text-xs text-muted">Demo: the live app makes a real script for your sheet.</span>}
                    </div>
                  )}
                </div>
              </details>
            </div>
          ) : (
            <>
              {script ? (
                <div className="mt-3 space-y-3">
                  <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-ink-2">
                    <li>
                      Open the Google Sheet, then <b>Extensions → Apps Script</b>.
                    </li>
                    <li>Delete what&apos;s in the editor, then paste the script below (use Copy script).</li>
                    <li>
                      Click the save icon. In the box at the top next to <b>Debug</b>, pick <b>connect</b>, then click <b>Run</b>.
                    </li>
                    <li>
                      Google asks to allow it: <b>Review permissions</b> → pick your account → <b>Advanced</b> → <b>Go to … (unsafe)</b> → <b>Allow</b>. Google
                      shows that warning for any script that isn&apos;t published; this one is yours.
                    </li>
                    <li>Come back here: step 2 shows the sheet&apos;s columns to confirm.</li>
                  </ol>
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={8}
                      value={script}
                      className={cx(inputClass, "font-mono text-[11px] leading-relaxed")}
                      aria-label="Sheet script"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      className={cx(buttonClass.primary, "absolute right-2 top-2")}
                      onClick={async () => {
                        await navigator.clipboard.writeText(script).catch(() => undefined);
                        setCopied(true);
                      }}
                    >
                      {copied ? "Copied" : "Copy script"}
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    The script contains a private code for this project. Don&apos;t share it outside the team. Making a new script switches the old one off.
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button className={buttonClass.primary} disabled={!!busy} onClick={makeScript}>
                    {busy === "hook" ? "Making the script…" : state.hookToken ? "Show the script again" : "Get the sheet script"}
                  </button>
                  {!IS_LIVE && <span className="text-xs text-muted">Demo: the live app makes a real script for your sheet.</span>}
                </div>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-ink-2">Sheet link (optional, for opening it from here)</summary>
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (url.trim() && !/docs\.google\.com\/spreadsheets/.test(url))
                      return setNote("That isn't a Google Sheets link (docs.google.com/spreadsheets/…).");
                    await actions.updateProject(p.id, { sheetUrl: url.trim() || null });
                    setNote(url.trim() ? "Sheet link saved." : "Sheet link removed.");
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
                {p.sheetUrl && (
                  <a
                    href={p.sheetUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-2 underline"
                  >
                    Open the sheet <Icon name="link" size={11} />
                  </a>
                )}
              </details>
            </>
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
            <p className="mt-3 text-[13px] text-muted">{IS_LIVE ? "Waiting for the sheet: run connect in the sheet's script (step 1)." : "Not read yet."}</p>
          )}
        </Card>

        {/* 3. Syncing */}
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="3. Keeping in step"
            description={
              IS_LIVE && !info?.serviceEmail
                ? "Every hour the sheet sends its new links here and gets the latest numbers back. To sync straight away, in the sheet click Vernacular → Sync now."
                : "Every hour: new links in the sheet are added here, and the latest numbers are written into the sheet."
            }
            action={
              (!IS_LIVE || info?.serviceEmail) && (
                <button className={buttonClass.primary} disabled={!!busy || !state.layout} onClick={() => run("sync", { action: "sync" })}>
                  {busy === "sync" ? "Syncing…" : "Sync now"}
                </button>
              )
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
              ? `Messy rows are matched by AI${info?.aiName ? ` (${info.aiName})` : ""}. Anything it isn't sure of shows in Needs attention as a guess to confirm.`
              : "Messy rows show in Needs attention for you to match. AI matching switches on with a free GEMINI_API_KEY in Vercel."}
            {info?.aiProblem && <span className="mt-1 block text-xs text-warn">{info.aiProblem}</span>}
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
