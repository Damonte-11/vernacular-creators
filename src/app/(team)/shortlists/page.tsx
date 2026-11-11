"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { statusClass } from "@/components/list-table";
import { buttonClass, cx, EmptyState, inputClass, labelClass, PageHeader } from "@/components/ui";
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
      <PageHeader title="Lists" subtitle="One list per campaign or client. Track each creator's status, rate and notes, then share a clean report." />
      <form
        className="mb-5 flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = await actions.createShortlist(name.trim(), client.trim());
          setName("");
          setClient("");
          if (id) router.push(`/shortlists/${id}`);
        }}
      >
        <label className="flex-[2]">
          <span className={labelClass}>New list name</span>
          <input className={inputClass} placeholder="e.g. December push" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex-1">
          <span className={labelClass}>Client (optional)</span>
          <input className={inputClass} placeholder="e.g. the client's name" value={client} onChange={(e) => setClient(e.target.value)} />
        </label>
        <button className={buttonClass.primary} disabled={!name.trim()}>
          <Icon name="plus" size={15} /> Create list
        </button>
      </form>

      {shortlists.length === 0 ? (
        <EmptyState title="No lists yet" body="Name your first list above. Then add creators from the database, or import a spreadsheet you already have." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line bg-surface-2 text-left text-xs font-medium text-muted">
              <tr>
                <th className="py-2 pl-4 pr-3 font-medium">List</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Status</th>
                <th className="px-3 py-2 text-right font-medium">Creators</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Followers</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Total rate</th>
                <th className="hidden py-2 pl-3 pr-4 text-right font-medium lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shortlists.map((l) => {
                const followers = l.items.reduce((s, i) => s + (followersOf.get(i.creatorId) ?? 0), 0);
                const rate = l.items.reduce((s, i) => s + (i.rate ?? 0), 0);
                const byStatus = LIST_STATUSES.map((s) => ({ ...s, n: l.items.filter((i) => i.status === s.id).length })).filter((s) => s.n > 0);
                return (
                  <tr key={l.id} className="group relative transition-colors duration-100 hover:bg-surface-2">
                    <td className="py-2.5 pl-4 pr-3">
                      <Link href={`/shortlists/${l.id}`} className="font-medium after:absolute after:inset-0 group-hover:underline">
                        {l.name}
                      </Link>
                      <span className="block text-xs text-muted">{l.client || "No client set"}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <span className="flex flex-wrap gap-1">
                        {byStatus.length === 0 && <span className="text-muted">Empty</span>}
                        {byStatus.map((s) => (
                          <span key={s.id} className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1", statusClass(s.id))}>
                            {s.n} {s.label}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{l.items.length}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{formatNumber(followers)}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{rate ? formatNaira(rate) : <span className="text-muted">—</span>}</td>
                    <td className="hidden py-2.5 pl-3 pr-4 text-right text-muted lg:table-cell">{formatDate(l.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
