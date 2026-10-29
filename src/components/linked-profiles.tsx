"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiscoveryResult } from "@/lib/discover";
import { discoverAccounts } from "@/lib/data/discover";
import { normalizeHandle, useAnalyses, useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import { actions, useAppState } from "@/lib/data/store";
import { formatNumber, formatPercent } from "@/lib/format";
import { linkedAccounts, linkEdits, searchSaved, suggestLinks, unlinkEdits } from "@/lib/people";
import { PLATFORMS, platformName, profileLink } from "@/lib/platforms";
import type { Creator, CreatorEdits, Platform } from "@/lib/types";
import { Icon } from "./icons";
import { PlatformToggle } from "./lookup-form";
import { SavedMatches } from "./saved-matches";
import { Avatar, buttonClass, CreatorLink, cx, inputClass } from "./ui";

async function save(edits: [string, CreatorEdits][]) {
  for (const [id, patch] of edits) await actions.editCreator(id, patch);
}

/**
 * The person's accounts on each platform, like Modash's "Profiles" list. Each
 * row opens that account's own numbers; nothing is added up across platforms.
 */
export function LinkedProfiles({ creator, autoFind }: { creator: Creator; autoFind?: boolean }) {
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
      {!adding && <OtherPlatforms key={creator.id} creator={creator} all={all} autoFind={autoFind} />}
      {adding && <LinkPanel creator={creator} all={all} onDone={() => setAdding(false)} />}
    </div>
  );
}

function LinkPanel({ creator, all, onDone }: { creator: Creator; all: Creator[]; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<Platform>(creator.platform === "instagram" ? "tiktok" : "instagram");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set([creator.id, ...linkedAccounts(creator, all).map((c) => c.id)]);
  const suggestions = suggestLinks(creator, all);
  // The database first: saved accounts matching what's typed. Platforms are only asked on "Look up".
  const matches = searchSaved(all, normalizeHandle(q) || q, 6).filter((c) => !linkedIds.has(c.id));
  const shown = q.trim() ? matches : suggestions;

  async function link(other: Creator) {
    await save(linkEdits(creator, other, all, () => crypto.randomUUID()));
    onDone();
  }

  async function lookUpAndLink(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    const r = await lookupCreator(platform, q, all);
    setBusy(false);
    if (r.status === "error") return setError(r.error);
    if (r.creator.id === creator.id) return setError("That's this same account.");
    // Link against the freshest list, which now includes the new account.
    await save(linkEdits(creator, r.creator, [...all.filter((c) => c.id !== r.creator.id), r.creator], () => crypto.randomUUID()));
    onDone();
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-surface-2 p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Link another account of {creator.name}</p>
        <button className={buttonClass.icon} onClick={onDone} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>

      <form onSubmit={lookUpAndLink} className="space-y-2">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={cx(inputClass, "pl-9")}
            placeholder="Name, @handle or profile link"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={busy}
            aria-label="Search saved accounts, or a handle to look up"
            autoFocus
          />
        </div>

        <SavedMatches
          matches={shown}
          title={q.trim() ? "Already in your database" : "Possibly the same person (saved)"}
          action={(c) => (
            <button type="button" className={cx(buttonClass.secondary, "px-3 py-1.5")} onClick={() => link(c)}>
              Link
            </button>
          )}
        />

        {q.trim() && (
          <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted sm:mr-auto">{matches.length ? "Not the one? Look it up on" : "Not in your database. Look it up on"}</p>
            <PlatformToggle value={platform} onChange={setPlatform} />
            <button className={cx(buttonClass.primary, "whitespace-nowrap")} disabled={busy}>
              {busy ? "Looking up…" : "Look up and link"}
            </button>
          </div>
        )}
        {platform === "tiktok" && q.trim() && <p className="text-[11px] text-muted">A new TikTok lookup uses one of this month&apos;s TikTok lookups.</p>}
        {error && (
          <p role="alert" className="text-xs text-bad">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

const SOURCE_LABEL: Record<DiscoveryResult["source"], string> = {
  bio: "named in their bio",
  handle: "same handle: open their page to check it's them",
  saved: "already in your database: similar name or handle",
};

type FindState = { status: "idle" } | { status: "loading" } | { status: "done"; results: DiscoveryResult[] } | { status: "error"; error: string };

/**
 * "Found on other platforms": accounts named in the bio, or the same handle on
 * Instagram / YouTube. One click adds and links them; with the setting on,
 * bio matches are added automatically. Handle guesses always wait for a person.
 */
function OtherPlatforms({ creator, all, autoFind }: { creator: Creator; all: Creator[]; autoFind?: boolean }) {
  const { settings } = useAppState();
  const [state, setState] = useState<FindState>({ status: "idle" });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoAdded, setAutoAdded] = useState<Creator[]>([]);
  const allRef = useRef(all);
  allRef.current = all;
  const keyOf = (r: DiscoveryResult) => `${r.platform}:${r.handle.toLowerCase()}`;

  /** Saves the account if needed, then links it. Returns the linked account. */
  const addAndLink = useCallback(
    async (r: DiscoveryResult): Promise<Creator | null> => {
      const current = allRef.current;
      let other = r.savedId ? current.find((c) => c.id === r.savedId) : undefined;
      if (!other) {
        const res = await lookupCreator(r.platform, r.handle, current);
        if (res.status === "error") {
          setError(`${platformName(r.platform)} @${r.handle}: ${res.error}`);
          return null;
        }
        other = res.creator;
      }
      const list = [...allRef.current.filter((c) => c.id !== other!.id), other];
      await save(linkEdits(creator, other, list, () => crypto.randomUUID()));
      return other;
    },
    [creator],
  );

  const find = useCallback(async () => {
    setState({ status: "loading" });
    setError(null);
    // The database first: saved accounts with a similar name or handle, at no cost.
    const saved: DiscoveryResult[] = suggestLinks(creator, allRef.current, 5)
      .filter((c) => c.platform !== creator.platform)
      .map((c) => ({ platform: c.platform, handle: c.handle, source: "saved", savedId: c.id }));
    const covered = new Set(saved.map((r) => r.platform));
    const others = PLATFORMS.filter((p) => p !== creator.platform);
    let results = saved;
    if (!others.every((p) => covered.has(p))) {
      const res = await discoverAccounts(creator, allRef.current);
      if ("error" in res) return setState({ status: "error", error: res.error });
      const seen = new Set(saved.map((r) => r.savedId));
      results = [...saved, ...res.results.filter((r) => !(r.savedId && seen.has(r.savedId)) && !covered.has(r.platform))];
    }
    if (settings.autoLinkFromBio) {
      // Bio matches the platform has confirmed (or that are already saved) are added straight away.
      const auto = results.filter((r) => r.source === "bio" && (r.savedId || r.preview));
      const added: Creator[] = [];
      for (const r of auto) {
        const c = await addAndLink(r);
        if (c) added.push(c);
      }
      setAutoAdded(added);
      results = results.filter((r) => !auto.includes(r));
    }
    setState({ status: "done", results });
  }, [creator, settings.autoLinkFromBio, addAndLink]);

  const started = useRef(false);
  useEffect(() => {
    if (autoFind && !started.current) {
      started.current = true;
      void find();
    }
  }, [autoFind, find]);

  if (state.status === "idle") {
    return (
      <button className={cx(buttonClass.ghost, "-ml-2.5 mt-1")} onClick={find}>
        <Icon name="search" size={14} /> Find on other platforms
      </button>
    );
  }
  if (state.status === "loading") {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs text-muted" role="status">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
        Checking their bio, and the same handle on other platforms…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="mt-2 text-xs text-bad">
        {state.error}{" "}
        <button className="font-semibold underline" onClick={find}>
          Try again
        </button>
      </p>
    );
  }

  const visible = state.results.filter((r) => !hidden.has(keyOf(r)));
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3 ring-1 ring-line">
      <p className="px-1 text-xs font-medium text-muted">Found on other platforms</p>
      {autoAdded.length > 0 && (
        <ul className="mt-1">
          {autoAdded.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-1 py-1.5 text-xs text-good">
              <Icon name="check" size={14} />
              <span className="flex-1">
                Added {platformName(c.platform)} @{c.handle}: named in their bio
              </span>
              <button className="font-semibold text-ink-2 underline" onClick={() => save(unlinkEdits(c, allRef.current))}>
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}
      {visible.length === 0 && autoAdded.length === 0 && (
        <p className="px-1 py-2 text-xs text-ink-2">
          Nothing found: their bio doesn&apos;t name other accounts, and the same handle isn&apos;t on the other platforms. TikTok is only checked when the
          bio names it (each check uses Apify credit), so use <span className="font-medium">Link another account</span> if you know it.
        </p>
      )}
      <ul className="mt-1 space-y-2">
        {visible.map((r) => {
          const k = keyOf(r);
          const saved = r.savedId ? all.find((c) => c.id === r.savedId) : undefined;
          const name = saved?.name ?? r.preview?.name;
          const followers = saved?.followers ?? r.preview?.followers;
          const bio = saved?.bio ?? r.preview?.bio;
          return (
            <li key={k} className="rounded-lg bg-surface p-3 ring-1 ring-line">
              <div className="flex items-start gap-3">
                <Avatar name={name ?? r.handle} photoUrl={saved?.photoUrl ?? r.preview?.photoUrl ?? null} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                    <Icon name={r.platform} size={14} className="text-ink-2" />
                    <span className="font-semibold">@{r.handle}</span>
                    {name && <span className="text-muted">· {name}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {followers !== undefined && <span className="font-medium text-ink-2">{formatNumber(followers)} followers · </span>}
                    {SOURCE_LABEL[r.source]}
                  </p>
                  {bio && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs text-ink-2">{bio}</p>}
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    <a
                      href={profileLink(r.platform, r.handle, saved?.platformId ?? r.preview?.platformId)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent-ink hover:underline"
                    >
                      Open on {platformName(r.platform)} ↗
                    </a>
                    {saved && (
                      <CreatorLink id={saved.id} className="text-ink-2 hover:underline">
                        View saved profile
                      </CreatorLink>
                    )}
                  </p>
                  {r.unchecked && <p className="mt-1 text-[11px] text-muted">Not checked yet. Adding it uses 1 of this month&apos;s TikTok lookups.</p>}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center">
                  <button
                    className={cx(buttonClass.secondary, "px-3 py-1.5")}
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy(k);
                      setError(null);
                      const c = await addAndLink(r);
                      setBusy(null);
                      if (c) setHidden((h) => new Set(h).add(k));
                    }}
                  >
                    {busy === k ? "Adding…" : r.savedId ? "Link" : "Add & link"}
                  </button>
                  <button className={cx(buttonClass.ghost, "text-xs")} onClick={() => setHidden((h) => new Set(h).add(k))}>
                    Not them
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 px-1 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
