"use client";
import { useMemo, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatNumber, formatPercent } from "@/lib/format";
import { contactEmail, formatNaira, LIST_STATUSES, parseLabels, parseRate, statusLabel, toCsv } from "@/lib/lists";
import { platformName, profileLink } from "@/lib/platforms";
import type { Creator, CreatorAnalysis, ListStatus, Shortlist, ShortlistItem } from "@/lib/types";
import { AlsoOn } from "./creator-table";
import { Icon } from "./icons";
import { isLimited } from "./score-breakdown";
import { Avatar, buttonClass, Card, CreatorLink, cx, EmptyState, inputClass, PlatformBadge, ScoreBadge } from "./ui";

type Column = "status" | "followers" | "engagement" | "score" | "email" | "rate" | "labels" | "notes";
const COLUMNS: { id: Column; label: string; align?: "right" | "center" }[] = [
  { id: "status", label: "Status" },
  { id: "followers", label: "Followers", align: "right" },
  { id: "engagement", label: "Eng. rate", align: "right" },
  { id: "score", label: "Score", align: "center" },
  { id: "email", label: "Email" },
  { id: "rate", label: "Rate (₦)", align: "right" },
  { id: "labels", label: "Labels" },
  { id: "notes", label: "Notes" },
];
type SortKey = "name" | "status" | "followers" | "engagement" | "score" | "rate";
const COLS_KEY = "vernacular-creators:list-columns";

export const STATUS_TONE: Record<(typeof LIST_STATUSES)[number]["tone"], string> = {
  neutral: "bg-surface-2 text-ink-2 ring-line",
  info: "bg-info-soft text-info ring-info/20",
  warn: "bg-warn-soft text-warn ring-warn/20",
  good: "bg-good-soft text-good ring-good/20",
  done: "bg-ink/5 text-ink-2 ring-line",
  bad: "bg-bad-soft text-bad ring-bad/20",
};
export function statusClass(s: ListStatus): string {
  return STATUS_TONE[LIST_STATUSES.find((x) => x.id === s)?.tone ?? "neutral"];
}

interface Row {
  a: CreatorAnalysis;
  item: ShortlistItem;
}

/**
 * The working table for a list (like Modash's Manage): status, rate, email,
 * labels and notes per creator, editable in place, with bulk changes, a totals
 * row and CSV export. Numbers are always per account.
 */
export function ListTable({ list, analyses, creators }: { list: Shortlist; analyses: CreatorAnalysis[]; creators: Creator[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ListStatus | "">("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [group, setGroup] = useState(false);
  const [hidden, setHidden] = useState<Set<Column>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(COLS_KEY) ?? "[]") as Column[]);
    } catch {
      return new Set();
    }
  });
  const [columnsOpen, setColumnsOpen] = useState(false);

  const all: Row[] = useMemo(() => {
    const byId = new Map(analyses.map((a) => [a.creator.id, a]));
    return list.items.flatMap((item) => {
      const a = byId.get(item.creatorId);
      return a ? [{ a, item }] : [];
    });
  }, [list.items, analyses]);

  const counts = useMemo(() => {
    const m = new Map<ListStatus, number>();
    for (const r of all) m.set(r.item.status, (m.get(r.item.status) ?? 0) + 1);
    return m;
  }, [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    const filtered = all.filter(
      (r) =>
        (!status || r.item.status === status) &&
        (!needle ||
          r.a.creator.name.toLowerCase().includes(needle) ||
          r.a.creator.handle.toLowerCase().includes(needle) ||
          r.item.labels.some((l) => l.includes(needle)) ||
          r.item.notes.toLowerCase().includes(needle)),
    );
    const order = (r: Row): number | string => {
      switch (sort.key) {
        case "name":
          return r.a.creator.name.toLowerCase();
        case "status":
          return LIST_STATUSES.findIndex((s) => s.id === r.item.status);
        case "followers":
          return r.a.creator.followers;
        case "engagement":
          return r.a.metrics.engagementRate ?? -1;
        case "score":
          return r.a.score.total ?? -1;
        case "rate":
          return r.item.rate ?? -1;
      }
    };
    const sorted = [...filtered].sort((x, y) => {
      const a = order(x);
      const b = order(y);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir;
    });
    if (!group) return sorted;
    // Keep each person's accounts together, in the position of their first account.
    const key = (r: Row) => r.a.creator.personId ?? r.a.creator.id;
    const firstAt = new Map<string, number>();
    sorted.forEach((r, i) => firstAt.has(key(r)) || firstAt.set(key(r), i));
    return [...sorted].sort((x, y) => firstAt.get(key(x))! - firstAt.get(key(y))! || sorted.indexOf(x) - sorted.indexOf(y));
  }, [all, q, status, sort, group]);

  const show = (c: Column) => !hidden.has(c);
  const selectedRows = rows.filter((r) => selected.has(r.a.creator.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const totalFollowers = rows.reduce((s, r) => s + r.a.creator.followers, 0);
  const totalRate = rows.reduce((s, r) => s + (r.item.rate ?? 0), 0);
  const ratedCount = rows.filter((r) => r.item.rate !== null).length;

  function toggleColumn(c: Column) {
    const next = new Set(hidden);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setHidden(next);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify([...next]));
    } catch {
      // Private browsing: the choice just isn't remembered.
    }
  }

  function exportCsv(which: Row[]) {
    const header = ["Name", "Platform", "Handle", "Profile link", "Followers", "Engagement rate", "Score", "Status", "Email", "Rate (NGN)", "Labels", "Notes"];
    const body = which.map(({ a, item }) => [
      a.creator.name,
      platformName(a.creator.platform),
      `@${a.creator.handle}`,
      profileLink(a.creator.platform, a.creator.handle, a.creator.platformId),
      a.creator.followers,
      a.metrics.engagementRate === null ? null : Number((a.metrics.engagementRate * 100).toFixed(2)),
      a.score.total,
      statusLabel(item.status),
      contactEmail(a.creator)?.email ?? null,
      item.rate,
      item.labels.join(", "),
      item.notes,
    ]);
    const blob = new Blob([toCsv([header, ...body])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${list.name.replace(/[^\w\- ]+/g, "").trim() || "list"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const ids = (rs: Row[]) => rs.map((r) => r.a.creator.id);
  const update = (rs: Row[], fields: Parameters<typeof actions.updateListItems>[2]) => actions.updateListItems(list.id, ids(rs), fields);

  const SortHeader = ({ k, children, align }: { k: SortKey; children: React.ReactNode; align?: "right" | "center" }) => (
    <button
      type="button"
      className={cx("inline-flex items-center gap-1 rounded hover:text-ink", align === "right" && "flex-row-reverse")}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === "name" || k === "status" ? 1 : -1 }))}
      aria-label={`Sort by ${typeof children === "string" ? children : k}`}
    >
      {children}
      <span className={cx("text-[10px]", sort.key === k ? "text-ink" : "text-line-strong")} aria-hidden>
        {sort.key === k && sort.dir === -1 ? "▼" : "▲"}
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Status filter */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-line" role="tablist" aria-label="Status">
          <StatusTab active={status === ""} onClick={() => setStatus("")} label="All" count={all.length} />
          {LIST_STATUSES.map((s) => (
            <StatusTab key={s.id} active={status === s.id} onClick={() => setStatus(s.id)} label={s.label} count={counts.get(s.id) ?? 0} />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className={cx(inputClass, "py-2 pl-9")} placeholder="Search name, handle, label or note" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search this list" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-2 hover:bg-ink/5">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={group} onChange={(e) => setGroup(e.target.checked)} />
          Group related profiles
        </label>
        <div className="relative">
          <button className={cx(buttonClass.secondary, "py-2")} onClick={() => setColumnsOpen((o) => !o)} aria-expanded={columnsOpen}>
            Columns
          </button>
          {columnsOpen && (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface p-2 shadow-lg">
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input type="checkbox" className="accent-[var(--color-accent)]" checked={show(c.id)} onChange={() => toggleColumn(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className={cx(buttonClass.secondary, "py-2")} onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
          <Icon name="download" size={16} /> Export
        </button>
      </div>

      {/* Bulk actions */}
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm text-brand-ink" role="region" aria-label="Bulk actions">
          <span className="mr-1 font-semibold">{selectedRows.length} selected</span>
          <select
            className="rounded-lg bg-white/10 px-2 py-1.5 text-sm text-brand-ink ring-1 ring-white/20 [&>option]:text-ink"
            value=""
            onChange={(e) => e.target.value && update(selectedRows, { status: e.target.value as ListStatus })}
            aria-label="Set status for selected"
          >
            <option value="">Set status…</option>
            {LIST_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("label") as HTMLInputElement;
              const add = parseLabels(input.value);
              if (!add.length) return;
              for (const r of selectedRows) void actions.updateListItems(list.id, [r.a.creator.id], { labels: [...new Set([...r.item.labels, ...add])] });
              input.value = "";
            }}
          >
            <input name="label" className="w-32 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-brand-ink ring-1 ring-white/20 placeholder:text-white/60" placeholder="Add label" aria-label="Add label to selected" />
          </form>
          <button className="rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10" onClick={() => exportCsv(selectedRows)}>
            Export selected
          </button>
          <button
            className="rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10"
            onClick={() => {
              if (window.confirm(`Remove ${selectedRows.length} creator${selectedRows.length === 1 ? "" : "s"} from this list? They stay in the database.`)) {
                void actions.removeFromList(list.id, ids(selectedRows));
                setSelected(new Set());
              }
            }}
          >
            Remove from list
          </button>
          <button className="ml-auto rounded-lg px-2 py-1.5 hover:bg-white/10" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={all.length ? "No creators match" : "This list is empty"} body={all.length ? "Try another status or search." : "Add creators, or import a spreadsheet."} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="whitespace-nowrap border-b border-line bg-surface-2 text-left text-xs font-medium text-muted">
              <tr>
                <th className="sticky left-0 z-10 w-10 bg-surface-2 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-accent)]"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(ids(rows)))}
                    aria-label="Select all"
                  />
                </th>
                <th className="sticky left-10 z-10 bg-surface-2 px-3 py-2.5">
                  <SortHeader k="name">Profiles ({rows.length})</SortHeader>
                </th>
                {show("status") && (
                  <th className="px-3 py-2.5">
                    <SortHeader k="status">Status</SortHeader>
                  </th>
                )}
                {show("followers") && (
                  <th className="px-3 py-2.5 text-right">
                    <SortHeader k="followers" align="right">
                      Followers
                    </SortHeader>
                  </th>
                )}
                {show("engagement") && (
                  <th className="px-3 py-2.5 text-right">
                    <SortHeader k="engagement" align="right">
                      Eng. rate
                    </SortHeader>
                  </th>
                )}
                {show("score") && (
                  <th className="px-3 py-2.5 text-center">
                    <SortHeader k="score">Score</SortHeader>
                  </th>
                )}
                {show("email") && <th className="px-3 py-2.5">Email</th>}
                {show("rate") && (
                  <th className="px-3 py-2.5 text-right">
                    <SortHeader k="rate" align="right">
                      Rate (₦)
                    </SortHeader>
                  </th>
                )}
                {show("labels") && <th className="px-3 py-2.5">Labels</th>}
                {show("notes") && <th className="px-3 py-2.5">Notes</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => {
                const c = r.a.creator;
                const prev = rows[i - 1]?.a.creator;
                const related = group && prev && c.personId && prev.personId === c.personId;
                const email = contactEmail(c);
                const isSel = selected.has(c.id);
                return (
                  <tr key={c.id} className={cx("group transition-colors hover:bg-surface-2", isSel && "bg-accent-soft/40")}>
                    <td className={cx("sticky left-0 z-10 py-2.5 pl-4 group-hover:bg-surface-2", isSel ? "bg-accent-soft/40" : "bg-surface")}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--color-accent)]"
                        checked={isSel}
                        onChange={() => {
                          const next = new Set(selected);
                          if (isSel) next.delete(c.id);
                          else next.add(c.id);
                          setSelected(next);
                        }}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className={cx("sticky left-10 z-10 px-3 py-2.5 group-hover:bg-surface-2", isSel ? "bg-accent-soft/40" : "bg-surface")}>
                      <div className={cx("flex items-center gap-3", related && "pl-5")}>
                        {related && <span className="-ml-4 text-muted" aria-label="Same person">↳</span>}
                        <CreatorLink id={c.id} className="flex min-w-0 items-center gap-3 rounded-md">
                          <Avatar name={c.name} photoUrl={c.photoUrl} size={32} />
                          <span className="min-w-0">
                            <span className="block max-w-[200px] truncate font-semibold hover:underline">{c.name}</span>
                            <span className="flex items-center gap-1.5 text-xs text-muted">
                              <PlatformBadge platform={c.platform} compact />
                              <span className="max-w-[150px] truncate">@{c.handle}</span>
                              <AlsoOn creator={c} all={creators} />
                            </span>
                          </span>
                        </CreatorLink>
                      </div>
                    </td>
                    {show("status") && (
                      <td className="px-3 py-2.5">
                        <StatusSelect value={r.item.status} onChange={(s) => update([r], { status: s })} />
                      </td>
                    )}
                    {show("followers") && <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber(c.followers)}</td>}
                    {show("engagement") && <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">{formatPercent(r.a.metrics.engagementRate)}</td>}
                    {show("score") && (
                      <td className="px-3 py-2.5 text-center">
                        <ScoreBadge score={r.a.score.total} limited={isLimited(r.a.score)} size="sm" />
                      </td>
                    )}
                    {show("email") && (
                      <td className="px-3 py-2.5">
                        <InlineEdit
                          value={c.email ?? ""}
                          display={
                            email ? (
                              <span className="flex items-center gap-1.5">
                                <span className="max-w-[180px] truncate">{email.email}</span>
                                {email.fromBio && <span className="rounded bg-surface-2 px-1 text-[10px] text-muted ring-1 ring-line">from bio</span>}
                              </span>
                            ) : null
                          }
                          placeholder="Add email"
                          label={`Email for ${c.name}`}
                          onSave={(v) => actions.editCreator(c.id, { email: v.trim().toLowerCase() || null })}
                        />
                      </td>
                    )}
                    {show("rate") && (
                      <td className="px-3 py-2.5 text-right">
                        <InlineEdit
                          value={r.item.rate === null ? "" : String(r.item.rate)}
                          display={r.item.rate === null ? null : <span className="font-medium tabular-nums">{formatNaira(r.item.rate)}</span>}
                          placeholder="Add rate"
                          label={`Rate for ${c.name}`}
                          align="right"
                          onSave={(v) => update([r], { rate: parseRate(v) })}
                        />
                      </td>
                    )}
                    {show("labels") && (
                      <td className="px-3 py-2.5">
                        <InlineEdit
                          value={r.item.labels.join(", ")}
                          display={
                            r.item.labels.length ? (
                              <span className="flex max-w-[220px] flex-wrap gap-1">
                                {r.item.labels.map((l) => (
                                  <span key={l} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs ring-1 ring-line">
                                    {l}
                                  </span>
                                ))}
                              </span>
                            ) : null
                          }
                          placeholder="Add labels"
                          label={`Labels for ${c.name}`}
                          onSave={(v) => update([r], { labels: parseLabels(v) })}
                        />
                      </td>
                    )}
                    {show("notes") && (
                      <td className="px-3 py-2.5">
                        <InlineEdit
                          value={r.item.notes}
                          display={r.item.notes ? <span className="line-clamp-2 max-w-[260px] text-xs text-ink-2">{r.item.notes}</span> : null}
                          placeholder="Add note"
                          label={`Notes for ${c.name}`}
                          multiline
                          onSave={(v) => update([r], { notes: v.trim() })}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-line bg-surface-2 text-sm">
              <tr>
                <td className="sticky left-0 bg-surface-2" />
                <td className="sticky left-10 bg-surface-2 px-3 py-2.5 font-semibold">
                  Total
                  <span className="ml-1 font-normal text-muted">
                    · {rows.length} creator{rows.length === 1 ? "" : "s"}
                  </span>
                </td>
                {show("status") && <td />}
                {show("followers") && (
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums" title="Added up across accounts; the same people may follow several">
                    {formatNumber(totalFollowers)}
                  </td>
                )}
                {show("engagement") && <td />}
                {show("score") && <td />}
                {show("email") && <td />}
                {show("rate") && (
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {formatNaira(totalRate)}
                    {ratedCount < rows.length && <span className="block text-[11px] font-normal text-muted">{rows.length - ratedCount} without a rate</span>}
                  </td>
                )}
                {show("labels") && <td />}
                {show("notes") && <td />}
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {label}
      <span className={cx("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-white/15" : "bg-surface-2 text-muted")}>{count}</span>
    </button>
  );
}

export function StatusSelect({ value, onChange }: { value: ListStatus; onChange: (s: ListStatus) => void }) {
  const tone = LIST_STATUSES.find((s) => s.id === value)?.tone ?? "neutral";
  return (
    <span className={cx("relative inline-flex items-center rounded-full ring-1", STATUS_TONE[tone])}>
      <span className="pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ListStatus)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1 pl-6 pr-6 text-xs font-semibold focus:outline-none"
        aria-label="Status"
      >
        {LIST_STATUSES.map((s) => (
          <option key={s.id} value={s.id} className="text-ink">
            {s.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[9px]" aria-hidden>
        ▼
      </span>
    </span>
  );
}

/** Click to edit; saves when you press Enter or click away, Escape cancels. */
function InlineEdit({
  value,
  display,
  placeholder,
  label,
  onSave,
  align,
  multiline,
}: {
  value: string;
  display: React.ReactNode;
  placeholder: string;
  label: string;
  onSave: (v: string) => unknown;
  align?: "right";
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const done = (save: boolean) => {
    setEditing(false);
    if (save && draft !== value) void onSave(draft);
  };
  if (!editing) {
    return (
      <button
        type="button"
        className={cx("w-full rounded-md px-1.5 py-1 hover:bg-ink/5", align === "right" ? "text-right" : "text-left")}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={`Edit ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
      >
        {display ?? <span className="whitespace-nowrap text-xs text-muted">{placeholder}</span>}
      </button>
    );
  }
  const common = {
    autoFocus: true,
    value: draft,
    "aria-label": label,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: () => done(true),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter" && !(multiline && e.shiftKey)) {
        e.preventDefault();
        done(true);
      }
    },
    className: cx(inputClass, "px-2 py-1 text-sm", align === "right" && "text-right"),
  };
  return multiline ? <textarea rows={3} {...common} /> : <input {...common} />;
}
