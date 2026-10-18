"use client";
import { isLimited } from "@/components/score-breakdown";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import {
  Avatar,
  buttonClass,
  Card,
  CreatorLink,
  cx,
  EmptyState,
  FlagCount,
  inputClass,
  PageHeader,
  PlatformBadge,
  ScoreBadge,
  StatTile,
} from "@/components/ui";
import { Loading } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { actions, useAppState, useHydrated } from "@/lib/data/store";
import { formatNumber, formatPercent, formatRange } from "@/lib/format";
import { shortlistTotals } from "@/lib/report";
import type { CreatorAnalysis } from "@/lib/types";

export default function ShortlistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { shortlists } = useAppState();
  const all = useAnalyses();
  const list = shortlists.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const hydrated = useHydrated();

  if (!list && !hydrated) return <Loading />;
  if (!list) {
    return (
      <EmptyState
        title="Shortlist not found"
        body="It may have been deleted, or made in a different browser."
        action={
          <Link href="/shortlists" className={buttonClass.secondary}>
            All shortlists
          </Link>
        }
      />
    );
  }

  const rows = list.items
    .map((i) => all.find((a) => a.creator.id === i.creatorId))
    .filter((a): a is CreatorAnalysis => !!a);
  const totals = shortlistTotals(rows);

  async function copyLink() {
    const url = `${window.location.origin}/reports/${list!.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <>
      <Link href="/shortlists" className={cx(buttonClass.ghost, "-ml-2 mb-3")}>
        <Icon name="back" size={16} /> All shortlists
      </Link>
      {editing ? (
        <RenameForm name={list.name} client={list.client} onSave={(n, c) => (actions.renameShortlist(list.id, n, c), setEditing(false))} onCancel={() => setEditing(false)} />
      ) : (
        <PageHeader
          title={list.name}
          subtitle={list.client ? `Client: ${list.client}` : undefined}
          actions={
            <>
              <button className={buttonClass.ghost} onClick={() => setEditing(true)}>
                Rename
              </button>
              <button className={buttonClass.secondary} onClick={copyLink} disabled={rows.length === 0}>
                <Icon name="link" size={16} /> {copied ? "Link copied" : "Copy share link"}
              </button>
              <Link href={`/reports/${list.id}`} className={cx(buttonClass.primary, rows.length === 0 && "pointer-events-none opacity-50")}>
                <Icon name="clipboard" size={16} /> Client report
              </Link>
            </>
          }
        />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Creators" value={totals.creators} />
        <StatTile label="Combined followers" value={formatNumber(totals.followers)} />
        <StatTile label="Expected engagements" value={formatRange(totals.engagements)} hint="If each creator posts once" />
        <StatTile label="Estimated reach" value={formatRange(totals.reach)} estimate hint="One post each; people may overlap" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="This shortlist is empty"
          body="Add creators from their profile page or from the creators list."
          action={
            <Link href="/creators" className={buttonClass.secondary}>
              Browse creators
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-line">
          {rows.map((a) => (
            <div key={a.creator.id} className="flex flex-wrap items-center gap-3 p-4">
              <CreatorLink id={a.creator.id} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={a.creator.name} photoUrl={a.creator.photoUrl} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.creator.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <PlatformBadge platform={a.creator.platform} compact /> @{a.creator.handle}
                  </span>
                </span>
              </CreatorLink>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-right">
                  <span className="block font-semibold">{formatNumber(a.creator.followers)}</span>
                  <span className="text-xs text-muted">followers</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatPercent(a.metrics.engagementRate)}</span>
                  <span className="text-xs text-muted">engagement</span>
                </span>
                <FlagCount flags={a.flags} />
                <ScoreBadge limited={isLimited(a.score)} score={a.score.total} size="sm" />
                <button className={buttonClass.ghost} onClick={() => actions.toggleInShortlist(list.id, a.creator.id)} aria-label={`Remove ${a.creator.name}`} title="Remove from shortlist">
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="mt-8 flex justify-end">
        <button
          className={buttonClass.danger}
          onClick={() => {
            if (window.confirm(`Delete the shortlist "${list.name}"? The creators stay in the database.`)) {
              actions.deleteShortlist(list.id);
              router.push("/shortlists");
            }
          }}
        >
          <Icon name="trash" size={16} /> Delete shortlist
        </button>
      </div>
    </>
  );
}

function RenameForm({ name, client, onSave, onCancel }: { name: string; client: string; onSave: (n: string, c: string) => void; onCancel: () => void }) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(client);
  return (
    <form
      className="mb-6 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (n.trim()) onSave(n.trim(), c.trim());
      }}
    >
      <input className={inputClass} value={n} onChange={(e) => setN(e.target.value)} aria-label="Shortlist name" />
      <input className={inputClass} value={c} onChange={(e) => setC(e.target.value)} placeholder="Client" aria-label="Client" />
      <button className={buttonClass.primary}>Save</button>
      <button type="button" className={buttonClass.secondary} onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
