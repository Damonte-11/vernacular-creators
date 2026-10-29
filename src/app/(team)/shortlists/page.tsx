"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { statusClass } from "@/components/list-table";
import { buttonClass, Card, cx, EmptyState, inputClass, labelClass, PageHeader, SectionHeader } from "@/components/ui";
import { useAnalyses } from "@/lib/data/creators";
import { actions, useAppState } from "@/lib/data/store";
import { formatDate, formatNumber } from "@/lib/format";
import { formatNaira, LIST_STATUSES } from "@/lib/lists";

export default function ListsPage() {
  const { shortlists } = useAppState();
  const all = useAnalyses();
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const followersOf = new Map(all.map((a) => [a.creator.id, a.creator.followers]));

  return (
    <>
      <PageHeader title="Lists" subtitle="One list per campaign or client: track each creator's status, rate and notes, then share a clean report with the client." />
      <Card className="mb-8 p-5 sm:p-6">
        <SectionHeader title="New list" description="Then add creators from your database, or import a spreadsheet you already have." className="mb-4" />
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = await actions.createShortlist(name.trim(), client.trim());
            setName("");
            setClient("");
            if (id) router.push(`/shortlists/${id}`);
          }}
        >
          <label>
            <span className={labelClass}>List name</span>
            <input className={inputClass} placeholder="e.g. inDrive December push" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Client (optional)</span>
            <input className={inputClass} placeholder="e.g. inDrive" value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <button className={buttonClass.primary} disabled={!name.trim()}>
            <Icon name="plus" size={16} /> Create list
          </button>
        </form>
      </Card>

      {shortlists.length === 0 ? (
        <EmptyState title="No lists yet" body="Create one above, then add creators or import a spreadsheet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((l) => {
            const followers = l.items.reduce((s, i) => s + (followersOf.get(i.creatorId) ?? 0), 0);
            const rate = l.items.reduce((s, i) => s + (i.rate ?? 0), 0);
            const byStatus = LIST_STATUSES.map((s) => ({ ...s, n: l.items.filter((i) => i.status === s.id).length })).filter((s) => s.n > 0);
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
                  {byStatus.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {byStatus.map((s) => (
                        <span key={s.id} className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", statusClass(s.id))}>
                          {s.n} {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex-1" />
                  <dl className="mt-5 flex gap-6 border-t border-line pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Creators</dt>
                      <dd className="font-semibold tabular-nums">{l.items.length}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Followers</dt>
                      <dd className="font-semibold tabular-nums">{formatNumber(followers)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Total rate</dt>
                      <dd className="font-semibold tabular-nums">{rate ? formatNaira(rate) : "—"}</dd>
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
