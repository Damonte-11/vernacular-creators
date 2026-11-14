"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { SideDrawer } from "@/components/creators/media";
import { ProfileDrawer } from "@/components/creators/profile-drawer";
import { Avatar, buttonClass, cx, EmptyState, Loading } from "@/components/ui";
import { creatorView } from "@/lib/creator-view";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { actions, useAppState } from "@/lib/data/store";
import { businessSignal, mediaSignal, qualityProblem } from "@/lib/discovery-rules";
import { formatDate, formatNumber } from "@/lib/format";
import { platformName, profileLink } from "@/lib/platforms";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { IS_LIVE } from "@/lib/supabase/config";
import type { Platform } from "@/lib/types";

interface Candidate {
  id: number;
  platform: Platform;
  handle: string;
  platform_id: string | null;
  status: "review" | "added" | "skipped" | "ignored";
  source: string;
  reason: string;
  name: string;
  photo_url: string | null;
  bio: string;
  followers: number | null;
  last_post_at: string | null;
  creator_id: string | null;
  created_at: string;
  decided_at: string | null;
}
type Tab = "review" | "added" | "skipped";
const WEEK = 7 * 86_400_000;

/** Demo only: a few made-up suggestions so the page has something to show. */
const DEMO: Candidate[] = [
  {
    id: 1,
    platform: "instagram",
    handle: "lagosdancecrew_demo",
    platform_id: null,
    status: "review",
    source: "Tagged by @ifeanyiskits_demo",
    reason: "Tagged by a Nigerian creator, but no Nigeria link in their own profile",
    name: "Dance Crew",
    photo_url: null,
    bio: "Choreography • Workshops • Bookings open",
    followers: 64_000,
    last_post_at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    creator_id: null,
    created_at: new Date().toISOString(),
    decided_at: null,
  },
  {
    id: 2,
    platform: "youtube",
    handle: "chefamaka_demo",
    platform_id: null,
    status: "added",
    source: "YouTube search: food Lagos",
    reason: 'Nigerian creator (bio mentions "lagos")',
    name: "Chef Amaka",
    photo_url: null,
    bio: "Lagos home cooking",
    followers: 120_000,
    last_post_at: new Date().toISOString(),
    creator_id: null,
    created_at: new Date().toISOString(),
    decided_at: new Date().toISOString(),
  },
  {
    id: 3,
    platform: "instagram",
    handle: "shopwithtemi_demo",
    platform_id: null,
    status: "skipped",
    source: "Tagged by @stylebytemi_demo",
    reason: 'Looks like a business ("we deliver")',
    name: "Shop with Temi",
    photo_url: null,
    bio: "Ankara fabrics. We deliver nationwide",
    followers: 22_000,
    last_post_at: new Date().toISOString(),
    creator_id: null,
    created_at: new Date().toISOString(),
    decided_at: new Date().toISOString(),
  },
];

/**
 * Creators the app found by itself. Most are added (or skipped) automatically
 * by the rules in Settings; only borderline accounts wait in "Worth a look".
 */
export default function DiscoveredPage() {
  const { settings } = useAppState();
  const analyses = useAnalyses();
  const cfg = settings.discovery;
  const [rows, setRows] = useState<Candidate[] | null>(IS_LIVE ? null : DEMO);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!IS_LIVE) return;
    const { data, error } = await supabaseBrowser().from("discovery_candidates").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) {
      setError(/discovery_candidates/.test(error.message) ? "Run database update 0010_discovery.sql in Supabase first (see docs/SETUP.md)." : error.message);
      setRows([]);
    } else setRows(data as Candidate[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const weekAgo = Date.now() - WEEK;
  const recent = (c: Candidate) => new Date(c.decided_at ?? c.created_at).getTime() >= weekAgo;
  const lists = useMemo(() => {
    const r = rows ?? [];
    return {
      review: r.filter((c) => c.status === "review"),
      added: r.filter((c) => c.status === "added"),
      skipped: r.filter((c) => c.status === "skipped" || c.status === "ignored"),
    };
  }, [rows]);
  const lastRun = rows?.[0]?.created_at;

  async function runNow() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/discovery/run", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setRunResult(body.error ?? `The run failed (${res.status}).`);
      else
        setRunResult(
          `Checked ${body.checked} accounts: ${body.added} added, ${body.review} worth a look, ${body.skipped} skipped.${body.stopped ? ` Stopped: ${body.stopped}.` : ""}`,
        );
      await load();
    } catch {
      setRunResult("Couldn't reach the server. Check your internet connection.");
    }
    setRunning(false);
  }

  async function act(ids: number[], action: "add" | "ignore") {
    setBusy((b) => new Set([...b, ...ids]));
    for (const id of ids) {
      if (!IS_LIVE) {
        setRows((r) => r?.map((c) => (c.id === id ? { ...c, status: action === "add" ? "added" : "ignored", decided_at: new Date().toISOString() } : c)) ?? r);
        continue;
      }
      const res = await fetch(`/api/discovery/candidates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? `Couldn't ${action} that account.`);
      else if (body.creator) actions.upsertCreator(body.creator);
    }
    setBusy((b) => new Set([...b].filter((x) => !ids.includes(x))));
    await load();
  }

  if (rows === null) return <Loading />;
  const shown = lists[tab];
  // Creators found earlier (under looser rules) that don't meet today's bar.
  const belowBar = analyses
    .filter((a) => a.creator.discoveredVia)
    .map((a) => {
      const words = businessSignal(a.creator) ?? mediaSignal(a.creator);
      const reason = words
        ? `Looks like a business or media page ("${words}")`
        : qualityProblem(
            { score: a.score.total, engagementLabel: a.metrics.engagementLabel, highFlags: a.flags.filter((f) => f.severity === "high").map((f) => f.message) },
            cfg.minScore,
          );
      return { a, reason };
    })
    .filter((x): x is { a: (typeof analyses)[number]; reason: string } => x.reason !== null);

  const openCreator = openId ? analyses.find((x) => x.creator.id === openId) : null;
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-6 text-white sm:px-8 sm:py-7">
        <span className="pointer-events-none absolute right-0 top-0 hidden h-20 w-20 bg-accent sm:block" aria-hidden />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Discovered</h1>
            <p className="mt-1 max-w-xl text-[13px] text-white/60">
              Creators the app finds on its own every night: accounts your saved creators tag, and YouTube channels for Nigerian niches. Clear matches are added
              automatically; borderline ones wait here.
            </p>
          </div>
          {IS_LIVE && (
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[.97] disabled:opacity-70"
              onClick={runNow}
              disabled={running}
            >
              {running && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />}
              {running ? "Running… (up to 4 minutes)" : "Run discovery now"}
            </button>
          )}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [String(lists.added.filter(recent).length), "Added this week", `${lists.added.length} in total`],
            [String(lists.review.length), "Worth a look", "Ignored on their own after 14 days"],
            [String(lists.skipped.filter(recent).length), "Skipped this week", "Too small, inactive, a business or not Nigerian"],
            [lastRun ? formatDate(lastRun) : "Not yet", "Last run", cfg.enabled ? "Every night at 4am Lagos time" : "Switched off in Settings"],
          ].map(([n, k, hint]) => (
            <div key={k} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <dd className="text-xl font-semibold tabular-nums">{n}</dd>
              <dt className="text-xs text-white/70">{k}</dt>
              <p className="mt-0.5 text-[11px] text-white/45">{hint}</p>
            </div>
          ))}
        </dl>
      </section>

      {!IS_LIVE && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Demo: discovery runs on the live site. These suggestions are made up.</p>}
      {runResult && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm ring-1 ring-line">{runResult}</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {belowBar.length > 0 && (
        <section className="rounded-2xl bg-warn-soft/40 p-5 ring-1 ring-warn/25">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {belowBar.length} {belowBar.length === 1 ? "creator" : "creators"} found earlier {belowBar.length === 1 ? "doesn't" : "don't"} meet the quality
                bar
              </p>
              <p className="mt-0.5 text-sm text-ink-2">
                They were added before the score check existed. Removing them deletes them from the database and from any projects; discovery won&apos;t add
                them again.
              </p>
            </div>
            <button
              className={buttonClass.danger}
              onClick={() => {
                if (window.confirm(`Remove ${belowBar.length} creators found automatically? This can't be undone.`)) {
                  void actions.removeCreators(belowBar.map((x) => x.a.creator.id));
                }
              }}
            >
              Remove all {belowBar.length}
            </button>
          </div>
          <ul className="mt-3 divide-y divide-warn/20 text-sm">
            {belowBar.slice(0, 12).map(({ a, reason }) => (
              <li key={a.creator.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <button onClick={() => setOpenId(a.creator.id)} className="flex min-w-0 items-center gap-2 text-left hover:underline">
                  <Icon name={a.creator.platform} size={14} className="text-ink-2" />
                  <span className="truncate font-medium">{a.creator.name}</span>
                  <span className="text-xs text-muted">@{a.creator.handle}</span>
                </button>
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-ink-2">{reason}</span>
                  <button className="font-semibold text-bad hover:underline" onClick={() => actions.removeCreators([a.creator.id])}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {belowBar.length > 12 && <p className="mt-1 text-xs text-muted">…and {belowBar.length - 12} more</p>}
        </section>
      )}

      <p className="text-sm text-ink-2">
        <Icon name="info" size={14} className="mr-1.5 inline align-[-2px] text-muted" />
        Adds Nigerian creators with at least <b>{formatNumber(cfg.minFollowers)}</b> followers, a Creator Score of <b>{cfg.minScore}+</b>, no poor engagement or
        serious warning signs, who posted in the last <b>{cfg.activeDays} days</b>, up to <b>{cfg.dailyLimit} a day</b>.{" "}
        <Link href="/settings#discovery" className="font-semibold text-accent-ink hover:underline">
          Change
        </Link>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Discovery results">
          {(
            [
              ["review", "Worth a look"],
              ["added", "Added automatically"],
              ["skipped", "Skipped"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                tab === id ? "bg-brand text-white" : "bg-surface-2 text-ink-2 ring-1 ring-line hover:text-ink",
              )}
            >
              {label} <span className={tab === id ? "text-white/70" : "text-muted"}>{lists[id].length}</span>
            </button>
          ))}
        </div>
        {tab === "review" && lists.review.length > 0 && (
          <div className="flex gap-2">
            <button
              className={buttonClass.secondary}
              onClick={() =>
                act(
                  lists.review.map((c) => c.id),
                  "add",
                )
              }
              disabled={busy.size > 0}
            >
              Add all {lists.review.length}
            </button>
            <button
              className={buttonClass.ghost}
              onClick={() =>
                act(
                  lists.review.map((c) => c.id),
                  "ignore",
                )
              }
              disabled={busy.size > 0}
            >
              Ignore all
            </button>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={tab === "review" ? "Nothing to look at" : tab === "added" ? "Nothing added yet" : "Nothing skipped yet"}
          body={
            tab === "review"
              ? "Borderline accounts show up here. Clear matches are added without asking."
              : IS_LIVE
                ? "Discovery runs every night, or click Run discovery now."
                : "Discovery runs on the live site."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.slice(0, 200).map((c, i) => (
            <article
              key={c.id}
              className="cr-rise flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow duration-150 hover:shadow-[0_10px_28px_rgba(23,23,21,.08)]"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <Avatar name={c.name || c.handle} photoUrl={c.photo_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                    <Icon name={c.platform} size={14} className="shrink-0 text-ink-2" />
                    {c.creator_id ? (
                      <button onClick={() => setOpenId(c.creator_id)} className="truncate hover:underline">
                        @{c.handle}
                      </button>
                    ) : (
                      <span className="truncate">@{c.handle}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {c.name && `${c.name} · `}
                    {c.followers !== null && `${formatNumber(c.followers)} followers`}
                    {c.last_post_at && ` · last post ${formatDate(c.last_post_at)}`}
                  </p>
                </div>
              </div>
              {c.bio && <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{c.bio}</p>}
              <p className="mt-2 text-xs text-muted">{c.source}</p>
              <p
                className={cx(
                  "mt-1 rounded-lg px-2.5 py-1.5 text-xs",
                  c.status === "added"
                    ? "bg-good-soft text-good"
                    : c.status === "review"
                      ? "bg-surface-2 text-ink-2 ring-1 ring-line"
                      : "bg-surface-2 text-muted",
                )}
              >
                {c.reason}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <a
                  href={profileLink(c.platform, c.handle, c.platform_id ?? undefined)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs font-semibold text-accent-ink hover:underline"
                >
                  Open on {platformName(c.platform)} ↗
                </a>
                <span className="flex gap-1.5">
                  {c.status === "review" && (
                    <>
                      <button className={buttonClass.ghost} onClick={() => act([c.id], "ignore")} disabled={busy.has(c.id)}>
                        Ignore
                      </button>
                      <button className={buttonClass.primary} onClick={() => act([c.id], "add")} disabled={busy.has(c.id)}>
                        {busy.has(c.id) ? "Adding…" : "Add"}
                      </button>
                    </>
                  )}
                  {(c.status === "skipped" || c.status === "ignored") && (
                    <button className={buttonClass.secondary} onClick={() => act([c.id], "add")} disabled={busy.has(c.id)}>
                      {busy.has(c.id) ? "Adding…" : "Add anyway"}
                    </button>
                  )}
                  {c.status === "added" && c.creator_id && (
                    <button className={buttonClass.secondary} onClick={() => setOpenId(c.creator_id)}>
                      Quick look
                    </button>
                  )}
                </span>
              </div>
            </article>
          ))}
          {shown.length > 200 && <p className="text-xs text-muted">Showing the newest 200 of {shown.length}.</p>}
        </div>
      )}

      <SideDrawer open={!!openCreator} onClose={() => setOpenId(null)} dark>
        {openCreator && (
          <ProfileDrawer
            v={creatorView(openCreator, NOW)}
            all={analyses.map((x) => creatorView(x, NOW))}
            onClose={() => setOpenId(null)}
            onOpen={setOpenId}
            compare={{ on: false, toggle: () => undefined }}
          />
        )}
      </SideDrawer>
    </div>
  );
}
