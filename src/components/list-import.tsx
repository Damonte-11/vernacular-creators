"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { findByHandle, useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import { actions } from "@/lib/data/store";
import { COLUMN_LABELS, detectColumns, parseCsv, readRows, type ColumnKind, type ImportRow } from "@/lib/import";
import { formatNaira, statusLabel, toCsv } from "@/lib/lists";
import { PLATFORMS, platformName } from "@/lib/platforms";
import type { Creator, ListItemFields, Platform, Shortlist } from "@/lib/types";
import { Icon } from "./icons";
import { buttonClass, cx, inputClass, SectionHeader } from "./ui";

/** Largest spreadsheet we read in one go. */
const MAX_ROWS = 500;

type Sheet = { fileName: string; header: string[]; rows: string[][] };
type Outcome = { line: number; label: string; status: "added" | "updated" | "skipped"; detail?: string; creatorId?: string };

async function readFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = await readSheet(file);
    return data
      .map((r) => r.map((v) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v))))
      .filter((r) => r.some((c) => c.trim() !== ""));
  }
  return parseCsv(await file.text());
}

/**
 * Import a CSV or Excel sheet into a list. Columns are detected automatically
 * (and can be changed); creators already saved are matched straight from the
 * database, and only new ones are looked up on the platforms.
 */
export function ListImport({ list, onClose }: { list: Shortlist; onClose: () => void }) {
  const creators = useCreators();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [kinds, setKinds] = useState<ColumnKind[]>([]);
  const [defaultPlatform, setDefaultPlatform] = useState<Platform | "">("");
  const [readError, setReadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [notice, setNotice] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const stop = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function open(file: File) {
    setReadError(null);
    setOutcomes(null);
    if (!/\.(csv|xlsx)$/i.test(file.name)) return setReadError("Choose a .csv or .xlsx file. For an older .xls file, save it as .xlsx first.");
    try {
      const rows = await readFile(file);
      if (rows.length < 2) return setReadError("The file needs a header row and at least one creator.");
      const [header, ...body] = rows;
      const limited = body.slice(0, MAX_ROWS);
      setSheet({ fileName: file.name, header: header.map((h) => String(h)), rows: limited });
      setKinds(detectColumns(header, limited.slice(0, 20)));
      if (body.length > MAX_ROWS) setNotice(`Only the first ${MAX_ROWS} rows are imported at once.`);
    } catch {
      setReadError("Couldn't read that file. If it's from Google Sheets, use File → Download → CSV or Excel.");
    }
  }

  const parsed: ImportRow[] = sheet ? readRows(sheet.rows, kinds, defaultPlatform || null) : [];
  const usable = parsed.filter((r) => !r.problem);
  const problems = parsed.filter((r) => r.problem);
  const saved = usable.filter((r) => findByHandle(creators, r.platform!, r.handle!));
  const toLookUp = usable.filter((r) => !findByHandle(creators, r.platform!, r.handle!));
  const newTikTok = toLookUp.filter((r) => r.platform === "tiktok").length;
  const hasId = kinds.includes("url") || kinds.includes("handle");

  async function run() {
    stop.current = false;
    setRunning(true);
    setNotice(null);
    setProgress({ done: 0, total: usable.length });
    const results: Outcome[] = problems.map((r) => ({ line: r.line, label: r.name || r.email || `Row ${r.line}`, status: "skipped", detail: r.problem }));
    const items: { creatorId: string; fields: ListItemFields }[] = [];
    const onList = new Set(list.items.map((i) => i.creatorId));
    const stopped = new Map<Platform, string>();
    let known: Creator[] = creators;

    for (const [i, r] of usable.entries()) {
      setProgress({ done: i, total: usable.length });
      const label = `@${r.handle} (${platformName(r.platform!)})`;
      if (stop.current) {
        results.push({ line: r.line, label, status: "skipped", detail: "Stopped before this row" });
        continue;
      }
      if (stopped.has(r.platform!)) {
        results.push({ line: r.line, label, status: "skipped", detail: stopped.get(r.platform!) });
        continue;
      }
      // The database first; only new creators are looked up, one at a time.
      let res = await lookupCreator(r.platform!, r.handle!, known);
      for (let tries = 0; res.status === "error" && res.code === "rate_limited" && tries < 3 && !stop.current; tries++) {
        const wait = Math.max(10, res.retryAfterSeconds ?? 60);
        setNotice(`${platformName(r.platform!)} asked us to slow down. Resuming in ${wait} seconds…`);
        await new Promise((ok) => setTimeout(ok, wait * 1000));
        setNotice(null);
        res = await lookupCreator(r.platform!, r.handle!, known);
      }
      if (res.status === "error") {
        if (["quota", "auth", "config", "rate_limited"].includes(res.code ?? "")) stopped.set(r.platform!, `Waiting: ${res.error}`);
        results.push({ line: r.line, label, status: "skipped", detail: res.error });
        continue;
      }
      if (res.status === "added") known = [...known, res.creator];
      const c = res.creator;
      if (r.email && !c.email) await actions.editCreator(c.id, { email: r.email });
      items.push({ creatorId: c.id, fields: r.fields });
      results.push({ line: r.line, label: `${c.name} · @${c.handle}`, status: onList.has(c.id) ? "updated" : "added", creatorId: c.id });
    }
    await actions.addToList(list.id, items);
    setProgress({ done: usable.length, total: usable.length });
    setOutcomes(results.sort((a, b) => a.line - b.line));
    setRunning(false);
  }

  function downloadTemplate() {
    const csv = toCsv([
      ["Profile link", "Name", "Status", "Labels", "Rate", "Email", "Notes"],
      ["https://www.instagram.com/handle", "Ada Example", "Shortlisted", "Food, Lifestyle", "150000", "ada@example.com", "Prefers Reels"],
      ["https://www.tiktok.com/@handle", "", "Contacted", "Comedy", "₦80,000", "", ""],
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "creators-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_23_21/0.04)] sm:p-6">
      <SectionHeader
        title="Import a spreadsheet"
        description="Bring in the creators you already work with, with their status, labels, rates and notes. Column names don't need to match exactly."
        action={
          <button className={buttonClass.icon} onClick={onClose} aria-label="Close import" disabled={running}>
            <Icon name="close" size={16} />
          </button>
        }
        className="mb-4"
      />

      {!sheet && (
        <>
          <div
            className={cx(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft/40" : "border-line-strong bg-surface-2",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) void open(f);
            }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-line">
              <Icon name="download" size={18} className="rotate-180" />
            </span>
            <p className="font-medium">Drag and drop to upload</p>
            <p className="text-xs text-muted">CSV or Excel (.xlsx), up to {MAX_ROWS} rows</p>
            <button className={cx(buttonClass.primary, "mt-2")} onClick={() => fileInput.current?.click()}>
              Choose file
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void open(f);
                e.target.value = "";
              }}
            />
          </div>
          {readError && (
            <p role="alert" className="mt-3 text-sm text-bad">
              {readError}
            </p>
          )}
          <div className="mt-4 text-sm text-ink-2">
            <p className="font-medium text-ink">What to include</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              <li>
                A <b>profile link</b> (instagram.com/…, tiktok.com/@…, youtube.com/@…), or an <b>@handle</b> plus a <b>platform</b> column.
              </li>
              <li>
                Optional: <b>name</b>, <b>status</b>, <b>labels</b>, <b>rate</b> in Naira (₦150,000 or 150k), <b>email</b> and <b>notes</b>.
              </li>
              <li>Rows with only an email can&apos;t be matched to a profile, so they&apos;re listed for you to fix.</li>
            </ul>
            <button className="mt-2 text-xs font-semibold text-accent-ink hover:underline" onClick={downloadTemplate}>
              Download a template
            </button>
          </div>
        </>
      )}

      {sheet && !outcomes && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <span className="font-semibold">{sheet.fileName}</span> <span className="text-muted">· {sheet.rows.length} rows</span>
            </p>
            {!running && (
              <button className={buttonClass.ghost} onClick={() => setSheet(null)}>
                Choose another file
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Columns we found</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sheet.header.map((h, i) => (
                <label key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 ring-1 ring-line">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{h || `Column ${i + 1}`}</span>
                    <span className="block truncate text-xs text-muted">{sheet.rows.find((r) => r[i]?.trim())?.[i] ?? "empty"}</span>
                  </span>
                  <select
                    className={cx(inputClass.replace("w-full ", ""), "w-36 shrink-0 py-1.5 text-xs")}
                    value={kinds[i]}
                    onChange={(e) => setKinds(kinds.map((k, j) => (j === i ? (e.target.value as ColumnKind) : k)))}
                    disabled={running}
                    aria-label={`What "${h}" holds`}
                  >
                    {(Object.keys(COLUMN_LABELS) as ColumnKind[]).map((k) => (
                      <option key={k} value={k}>
                        {COLUMN_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {!kinds.includes("url") && (
              <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink-2">Platform for rows that don&apos;t say:</span>
                <select
                  className={cx(inputClass.replace("w-full ", ""), "w-auto py-1.5")}
                  value={defaultPlatform}
                  onChange={(e) => setDefaultPlatform(e.target.value as Platform | "")}
                  disabled={running}
                >
                  <option value="">Choose…</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {platformName(p)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Summary n={saved.length} label="already in your database" hint="Matched instantly, no lookup" tone="good" />
            <Summary
              n={toLookUp.length}
              label="new, to look up"
              hint={newTikTok ? `${newTikTok} on TikTok use the monthly TikTok allowance` : "Looked up one at a time"}
              tone="neutral"
            />
            <Summary n={problems.length} label="can't be read" hint={problems.length ? "Listed below" : "None"} tone={problems.length ? "bad" : "neutral"} />
          </div>

          {usable.length > 0 && (
            <div className="overflow-x-auto rounded-lg ring-1 ring-line">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-surface-2 text-left text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Creator</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                    <th className="px-3 py-2 font-medium">Labels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {usable.slice(0, 6).map((r) => (
                    <tr key={r.line}>
                      <td className="px-3 py-2 text-muted">{r.line}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name={r.platform!} size={12} /> @{r.handle}
                          {r.name && <span className="text-muted">· {r.name}</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2">{statusLabel(r.fields.status ?? "shortlisted")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNaira(r.fields.rate ?? null)}</td>
                      <td className="px-3 py-2">{r.fields.labels?.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usable.length > 6 && <p className="bg-surface-2 px-3 py-1.5 text-xs text-muted">…and {usable.length - 6} more</p>}
            </div>
          )}

          {problems.length > 0 && (
            <details className="rounded-lg bg-bad-soft/40 px-3 py-2 text-xs ring-1 ring-bad/20">
              <summary className="cursor-pointer font-medium text-bad">{problems.length} rows can&apos;t be imported yet</summary>
              <ul className="mt-2 space-y-0.5 text-ink-2">
                {problems.slice(0, 20).map((r) => (
                  <li key={r.line}>
                    Row {r.line}
                    {r.name ? ` (${r.name})` : ""}: {r.problem}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {running && (
            <div aria-live="polite">
              {notice && <p className="mb-2 rounded-lg bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">{notice}</p>}
              <p className="text-sm font-medium">
                Importing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}>
                <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {running ? (
              <button className={buttonClass.secondary} onClick={() => (stop.current = true)}>
                Stop
              </button>
            ) : (
              <button className={buttonClass.primary} onClick={run} disabled={!hasId || usable.length === 0}>
                Import {usable.length} {usable.length === 1 ? "creator" : "creators"}
              </button>
            )}
            {!hasId && <p className="text-xs text-bad">Mark one column as a profile link or @handle.</p>}
          </div>
        </div>
      )}

      {outcomes && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Summary n={outcomes.filter((o) => o.status === "added").length} label="added to the list" tone="good" />
            <Summary n={outcomes.filter((o) => o.status === "updated").length} label="already on it, updated" tone="neutral" />
            <Summary n={outcomes.filter((o) => o.status === "skipped").length} label="skipped" tone={outcomes.some((o) => o.status === "skipped") ? "bad" : "neutral"} />
          </div>
          {outcomes.some((o) => o.status === "skipped") && (
            <ul className="divide-y divide-line rounded-lg text-xs ring-1 ring-line">
              {outcomes
                .filter((o) => o.status === "skipped")
                .map((o) => (
                  <li key={o.line} className="flex justify-between gap-3 px-3 py-2">
                    <span className="font-medium">
                      Row {o.line}: {o.label}
                    </span>
                    <span className="text-right text-bad">{o.detail}</span>
                  </li>
                ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass.primary} onClick={onClose}>
              Done
            </button>
            <button
              className={buttonClass.secondary}
              onClick={() => {
                setSheet(null);
                setOutcomes(null);
              }}
            >
              Import another file
            </button>
            <Link href="/add" className={buttonClass.ghost}>
              Add creators by hand
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ n, label, hint, tone }: { n: number; label: string; hint?: string; tone: "good" | "bad" | "neutral" }) {
  return (
    <div className={cx("rounded-lg px-3 py-2.5 ring-1", tone === "good" ? "bg-good-soft/50 ring-good/20" : tone === "bad" ? "bg-bad-soft/50 ring-bad/20" : "bg-surface-2 ring-line")}>
      <p className="text-xl font-semibold tabular-nums">{n}</p>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
