"use client";
import Link from "next/link";
import { useState } from "react";
import { buttonClass, Card, EmptyState, inputClass, labelClass, PageHeader } from "@/components/ui";
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
      <Card className="mb-6 p-5">
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
            Create shortlist
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
              <Link key={l.id} href={`/shortlists/${l.id}`}>
                <Card className="h-full p-5 transition hover:border-accent">
                  <p className="font-bold">{l.name}</p>
                  <p className="text-xs text-muted">
                    {l.client ? `${l.client} · ` : ""}Created {formatDate(l.createdAt)}
                  </p>
                  <p className="mt-4 text-sm text-ink-2">
                    <span className="font-semibold text-ink">{l.items.length}</span> creators · <span className="font-semibold text-ink">{formatNumber(followers)}</span> combined followers
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
