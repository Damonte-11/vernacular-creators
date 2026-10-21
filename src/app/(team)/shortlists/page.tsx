"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { buttonClass, Card, EmptyState, inputClass, labelClass, PageHeader, SectionHeader } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { actions, useAppState } from "@/lib/data/store";
import { formatDate, formatNumber } from "@/lib/format";

export default function ShortlistsPage() {
  const { shortlists } = useAppState();
  const all = useAnalyses();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");

  return (
    <>
      <PageHeader title="Shortlists" subtitle="Group creators for a campaign, then share a clean report with the client." />
      <Card className="mb-8 p-5 sm:p-6">
        <SectionHeader title="New shortlist" className="mb-4" />
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            actions.createShortlist(name.trim(), client.trim());
            setName("");
            setClient("");
          }}
        >
          <label>
            <span className={labelClass}>Shortlist name</span>
            <input className={inputClass} placeholder="e.g. inDrive December push" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Client (optional)</span>
            <input className={inputClass} placeholder="e.g. inDrive" value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <button className={buttonClass.primary} disabled={!name.trim()}>
            <Icon name="plus" size={16} /> Create shortlist
          </button>
        </form>
      </Card>

      {shortlists.length === 0 ? (
        <EmptyState title="No shortlists yet" body="Create one above, then add creators from their profile or the creators list." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((l) => {
            const followers = l.items.reduce((s, i) => s + (all.find((a) => a.creator.id === i.creatorId)?.creator.followers ?? 0), 0);
            return (
              <Link key={l.id} href={`/shortlists/${l.id}`} className="group rounded-xl">
                <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-line-strong group-hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold group-hover:underline">{l.name}</p>
                    <Icon name="back" size={16} className="mt-0.5 shrink-0 rotate-180 text-muted" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {l.client ? `${l.client} · ` : ""}Created {formatDate(l.createdAt)}
                  </p>
                  <dl className="mt-5 flex gap-6 border-t border-line pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Creators</dt>
                      <dd className="font-semibold tabular-nums">{l.items.length}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Combined followers</dt>
                      <dd className="font-semibold tabular-nums">{formatNumber(followers)}</dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
