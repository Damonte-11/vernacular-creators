"use client";
import { useMemo, useState } from "react";
import { useAnalyses, useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import { actions } from "@/lib/data/store";
import { formatNumber, formatPercent } from "@/lib/format";
import { linkedAccounts, linkEdits, suggestLinks, unlinkEdits } from "@/lib/people";
import { platformName } from "@/lib/platforms";
import type { Creator, CreatorEdits, Platform } from "@/lib/types";
import { Icon } from "./icons";
import { PlatformToggle } from "./lookup-form";
import { Avatar, buttonClass, CreatorLink, cx, inputClass } from "./ui";

async function save(edits: [string, CreatorEdits][]) {
  for (const [id, patch] of edits) await actions.editCreator(id, patch);
}

/**
 * The person's accounts on each platform, like Modash's "Profiles" list. Each
 * row opens that account's own numbers; nothing is added up across platforms.
 */
export function LinkedProfiles({ creator }: { creator: Creator }) {
  const all = useCreators();
  const analyses = useAnalyses();
  const [adding, setAdding] = useState(false);
  const linked = linkedAccounts(creator, all);
  const rows = [creator, ...linked];
  const er = useMemo(() => new Map(analyses.map((a) => [a.creator.id, a.metrics.engagementRate])), [analyses]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Profiles</h2>
        {!adding && (
          <button className={cx(buttonClass.ghost, "-mr-2.5")} onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} /> Link another account
          </button>
        )}
      </div>
      <div className="mt-2 hidden items-center gap-3 px-3 text-[11px] font-medium text-muted sm:flex" aria-hidden>
        <span className="flex-1">Account</span>
        <span className="w-16 text-right">Followers</span>
        <span className="w-14 text-right">Eng. rate</span>
        {rows.length > 1 && <span className="w-9" />}
      </div>
      <ul className="mt-1 space-y-1">
        {rows.map((c) => {
          const current = c.id === creator.id;
          const body = (
            <>
              <Icon name={c.platform} size={16} className="shrink-0 text-ink-2" />
              <Avatar name={c.name} photoUrl={c.photoUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">@{c.handle}</span>
              <span className="shrink-0 text-right text-sm font-semibold tabular-nums sm:w-16">{formatNumber(c.followers)}</span>
              <span className="hidden w-14 shrink-0 text-right text-sm tabular-nums text-ink-2 sm:block" title="Engagement rate by followers">
                {formatPercent(er.get(c.id) ?? null)}
              </span>
            </>
          );
          return (
            <li key={c.id} className="flex items-center gap-1">
              {current ? (
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 ring-1 ring-line" aria-current="page">
                  {body}
                </div>
              ) : (
                <CreatorLink id={c.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2">
                  {body}
                </CreatorLink>
              )}
              {rows.length > 1 && (
                <button
                  className={cx(buttonClass.icon, "h-8 w-8")}
                  onClick={() => save(unlinkEdits(c, all))}
                  aria-label={`Unlink @${c.handle} on ${platformName(c.platform)}`}
                  title="Unlink: not the same person"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length === 1 && !adding && (
        <p className="mt-1 text-xs text-muted">Only this account so far. Link their accounts on other platforms to switch between them here.</p>
      )}
      {adding && <LinkPanel creator={creator} all={all} onDone={() => setAdding(false)} />}
    </div>
  );
}

function LinkPanel({ creator, all, onDone }: { creator: Creator; all: Creator[]; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<Platform>(creator.platform === "instagram" ? "tiktok" : "instagram");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = suggestLinks(creator, all);
  const query = q.trim().toLowerCase().replace(/^@/, "");
  const linkedIds = new Set([creator.id, ...linkedAccounts(creator, all).map((c) => c.id)]);
  const results = query
    ? all.filter((c) => !linkedIds.has(c.id) && (c.handle.toLowerCase().includes(query) || c.name.toLowerCase().includes(query))).slice(0, 6)
    : [];

  async function link(other: Creator) {
    await save(linkEdits(creator, other, all, () => crypto.randomUUID()));
    onDone();
  }

  async function lookUpAndLink(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    const r = await lookupCreator(platform, handle, all);
    setBusy(false);
    if (r.status === "error") return setError(r.error);
    if (r.creator.id === creator.id) return setError("That's this same account.");
    // Link against the freshest list, which now includes the new account.
    await save(linkEdits(creator, r.creator, [...all.filter((c) => c.id !== r.creator.id), r.creator], () => crypto.randomUUID()));
    onDone();
  }

  const Row = ({ c }: { c: Creator }) => (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
      <Icon name={c.platform} size={16} className="shrink-0 text-ink-2" />
      <Avatar name={c.name} photoUrl={c.photoUrl} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{c.name}</span>
        <span className="block truncate text-xs text-muted">
          @{c.handle} · {formatNumber(c.followers)}
        </span>
      </span>
      <button className={cx(buttonClass.secondary, "px-3 py-1.5")} onClick={() => link(c)}>
        Link
      </button>
    </li>
  );

  return (
    <div className="mt-3 space-y-4 rounded-xl bg-surface-2 p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Link another account of {creator.name}</p>
        <button className={buttonClass.icon} onClick={onDone} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Possibly the same person</p>
          <ul>
            {suggestions.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted" htmlFor="link-search">
          Find a saved account
        </label>
        <input id="link-search" className={inputClass} placeholder="Name or handle" value={q} onChange={(e) => setQ(e.target.value)} />
        {query && (
          <ul className="mt-1">
            {results.length ? results.map((c) => <Row key={c.id} c={c} />) : <li className="px-2 py-2 text-xs text-muted">No saved account matches.</li>}
          </ul>
        )}
      </div>

      <form onSubmit={lookUpAndLink} className="space-y-2 border-t border-line pt-4">
        <p className="text-xs font-medium text-muted">Not saved yet? Look it up and link it</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PlatformToggle value={platform} onChange={setPlatform} />
          <input className={inputClass} placeholder="@handle or profile link" value={handle} onChange={(e) => setHandle(e.target.value)} disabled={busy} aria-label="Handle to look up and link" />
          <button className={cx(buttonClass.primary, "whitespace-nowrap")} disabled={busy || !handle.trim()}>
            {busy ? "Looking up…" : "Look up and link"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-bad">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
