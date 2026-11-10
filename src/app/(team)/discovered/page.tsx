"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, buttonClass, Card, CreatorLink, cx, EmptyState, Loading, PageHeader, StatTile } from "@/components/ui";
import { actions, useAppState } from "@/lib/data/store";
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
  { id: 1, platform: "instagram", handle: "lagosdancecrew_demo", platform_id: null, status: "review", source: "Tagged by @ifeanyiskits_demo", reason: "Tagged by a Nigerian creator, but no Nigeria link in their own profile", name: "Dance Crew", photo_url: null, bio: "Choreography • Workshops • Bookings open", followers: 64_000, last_post_at: new Date(Date.now() - 4 * 86_400_000).toISOString(), creator_id: null, created_at: new Date().toISOString(), decided_at: null },
  { id: 2, platform: "youtube", handle: "chefamaka_demo", platform_id: null, status: "added", source: "YouTube search: food Lagos", reason: "Nigerian creator (bio mentions \"lagos\")", name: "Chef Amaka", photo_url: null, bio: "Lagos home cooking", followers: 120_000, last_post_at: new Date().toISOString(), creator_id: null, created_at: new Date().toISOString(), decided_at: new Date().toISOString() },
  { id: 3, platform: "instagram", handle: "shopwithtemi_demo", platform_id: null, status: "skipped", source: "Tagged by @stylebytemi_demo", reason: "Looks like a business (\"we deliver\")", name: "Shop with Temi", photo_url: null, bio: "Ankara fabrics. We deliver nationwide", followers: 22_000, last_post_at: new Date().toISOString(), creator_id: null, created_at: new Date().toISOString(), decided_at: new Date().toISOString() },
];

/**
 * Creators the app found by itself. Most are added (or skipped) automatically
 * by the rules in Settings; only borderline accounts wait in "Worth a look".
 */
export default function DiscoveredPage() {
  const { settings } = useAppState();
  const cfg = settings.discovery;
  const [rows, setRows] = useState<Candidate[] | null>(IS_LIVE ? null : DEMO);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());

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
      const res = await fetch(`/api/discovery/candidates/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? `Couldn't ${action} that account.`);
      else if (body.creator) actions.upsertCreator(body.creator);
    }
    setBusy((b) => new Set([...b].filter((x) => !ids.includes(x))));
    await load();
  }

  if (rows === null) return <Loading />;
  const shown = lists[tab];

  return (
    <>
      <PageHeader
        title="Discovered"
        subtitle="Creators the app finds on its own every night: accounts your saved creators tag, and YouTube channels for Nigerian niches. Clear matches are added automatically."
        actions={
          IS_LIVE ? (
            <button className={buttonClass.primary} onClick={runNow} disabled={running}>
              {running && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-ink/30 border-t-brand-ink" aria-hidden />}
              {running ? "Running… (up to 4 minutes)" : "Run discovery now"}
            </button>
          ) : undefined
        }
      />

      {!IS_LIVE && (
        <p className="mb-5 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Demo: discovery runs on the live site. These suggestions are made up.</p>
      )}
      {runResult && <p className="mb-5 rounded-lg bg-surface-2 px-3 py-2 text-sm ring-1 ring-line">{runResult}</p>}
      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Added this week" value={lists.added.filter(recent).length} hint={`${lists.added.length} in total`} />
        <StatTile label="Worth a look" value={lists.review.length} hint="Ignored on their own after 14 days" />
        <StatTile label="Skipped this week" value={lists.skipped.filter(recent).length} hint="Too small, inactive, a business or not Nigerian" />
        <StatTile label="Last run" value={lastRun ? formatDate(lastRun) : "Not yet"} hint={cfg.enabled ? "Runs every night at 4am Lagos time" : "Switched off in Settings"} />
      </div>

      <p className="mb-4 text-sm text-ink-2">
        <Icon name="info" size={14} className="mr-1.5 inline align-[-2px] text-muted" />
        Adds Nigerian creators with at least <b>{formatNumber(cfg.minFollowers)}</b> followers who posted in the last <b>{cfg.activeDays} days</b>, up to{" "}
        <b>{cfg.dailyLimit} a day</b>.{" "}
        <Link href="/settings#discovery" className="font-semibold text-accent-ink hover:underline">
          Change
        </Link>
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-line" role="tablist">
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
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                tab === id ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-surface-2",
              )}
            >
              {label}
              <span className={cx("rounded-md px-1.5 text-xs tabular-nums", tab === id ? "bg-white/15" : "bg-surface-2 text-muted")}>{lists[id].length}</span>
            </button>
          ))}
        </div>
        {tab === "review" && lists.review.length > 0 && (
          <div className="flex gap-2">
            <button className={buttonClass.secondary} onClick={() => act(lists.review.map((c) => c.id), "add")} disabled={busy.size > 0}>
              Add all {lists.review.length}
            </button>
            <button className={buttonClass.ghost} onClick={() => act(lists.review.map((c) => c.id), "ignore")} disabled={busy.size > 0}>
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
        <Card className="divide-y divide-line">
          {shown.slice(0, 200).map((c) => (
            <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                <Avatar name={c.name || c.handle} photoUrl={c.photo_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                    <Icon name={c.platform} size={14} className="text-ink-2" />
                    {c.creator_id ? (
                      <CreatorLink id={c.creator_id} className="font-semibold hover:underline">
                        @{c.handle}
                      </CreatorLink>
                    ) : (
                      <span className="font-semibold">@{c.handle}</span>
                    )}
                    {c.name && <span className="text-muted">· {c.name}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {c.followers !== null && <span className="font-medium text-ink-2">{formatNumber(c.followers)} followers · </span>}
                    {c.last_post_at && `last post ${formatDate(c.last_post_at)} · `}
                    {c.source}
                  </p>
                  <p className={cx("mt-1 text-xs", c.status === "added" ? "text-good" : c.status === "review" ? "text-ink-2" : "text-muted")}>{c.reason}</p>
                  {c.bio && <p className="mt-1 line-clamp-2 text-xs text-ink-2">{c.bio}</p>}
                  <a
                    href={profileLink(c.platform, c.handle, c.platform_id ?? undefined)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-block text-xs font-semibold text-accent-ink hover:underline"
                  >
                    Open on {platformName(c.platform)} ↗
                  </a>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
                {c.status === "review" && (
                  <>
                    <button className={cx(buttonClass.primary, "px-3 py-1.5")} onClick={() => act([c.id], "add")} disabled={busy.has(c.id)}>
                      {busy.has(c.id) ? "Adding…" : "Add"}
                    </button>
                    <button className={cx(buttonClass.ghost, "text-xs")} onClick={() => act([c.id], "ignore")} disabled={busy.has(c.id)}>
                      Ignore
                    </button>
                  </>
                )}
                {(c.status === "skipped" || c.status === "ignored") && (
                  <button className={cx(buttonClass.secondary, "px-3 py-1.5 text-xs")} onClick={() => act([c.id], "add")} disabled={busy.has(c.id)}>
                    {busy.has(c.id) ? "Adding…" : "Add anyway"}
                  </button>
                )}
                {c.status === "added" && c.creator_id && (
                  <CreatorLink id={c.creator_id} className={cx(buttonClass.secondary, "px-3 py-1.5 text-xs")}>
                    View profile
                  </CreatorLink>
                )}
              </div>
            </div>
          ))}
          {shown.length > 200 && <p className="px-4 py-3 text-xs text-muted">Showing the newest 200 of {shown.length}.</p>}
        </Card>
      )}
    </>
  );
}
