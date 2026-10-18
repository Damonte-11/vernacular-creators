"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { buttonClass, Card, CreatorLink, EmptyState, inputClass, labelClass, PageHeader } from "@/components/ui";
import { useCreators } from "@/lib/data/creators";
import { actions, useAppState } from "@/lib/data/store";
import { formatDate, formatFull } from "@/lib/format";

/**
 * Optional: log what a campaign post actually achieved. Once there are a few
 * results for creators of a similar size, reach estimates blend them in.
 */
export default function CampaignResultsPage() {
  const creators = useCreators();
  const { campaignResults } = useAppState();
  const byId = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);
  const sortedCreators = useMemo(() => [...creators].sort((a, b) => a.name.localeCompare(b.name)), [creators]);

  const [creatorId, setCreatorId] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [reach, setReach] = useState("");
  const [impressions, setImpressions] = useState("");
  const [views, setViews] = useState("");
  const [loggedBy, setLoggedBy] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(/,/g, "")));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = toNum(reach);
    const i = toNum(impressions);
    const v = toNum(views);
    if (!creatorId) return setError("Pick the creator.");
    if ([r, i, v].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return setError("Numbers must be whole, positive numbers.");
    if (r === null && i === null && v === null) return setError("Enter at least one number (reach, impressions or views).");
    actions.logCampaignResult({ creatorId, postUrl: postUrl.trim(), reach: r, impressions: i, views: v, loggedBy: loggedBy.trim() });
    setError(null);
    setPostUrl("");
    setReach("");
    setImpressions("");
    setViews("");
  }

  return (
    <>
      <PageHeader
        title="Campaign results"
        subtitle="Optional. Log what a post really achieved (from the creator's screenshot or report). Reach estimates get more accurate as results build up."
      />
      <Card className="mb-6 p-5">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className={labelClass}>Creator</span>
            <select className={inputClass} value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
              <option value="">Choose a creator…</option>
              {sortedCreators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (@{c.handle})
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Post link</span>
            <input className={inputClass} value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://…" />
          </label>
          <NumField label="Reach" value={reach} onChange={setReach} />
          <NumField label="Impressions" value={impressions} onChange={setImpressions} />
          <NumField label="Views" value={views} onChange={setViews} />
          <label className="block">
            <span className={labelClass}>Logged by</span>
            <input className={inputClass} value={loggedBy} onChange={(e) => setLoggedBy(e.target.value)} placeholder="Your name" />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className={buttonClass.primary}>Save result</button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-bad sm:col-span-2 lg:col-span-3">
              {error}
            </p>
          )}
        </form>
      </Card>

      {campaignResults.length === 0 ? (
        <EmptyState title="No results logged yet" body="That's fine: reach estimates use public views and size benchmarks until there's real campaign data." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-canvas text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3 text-right">Reach</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3">Logged</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...campaignResults].reverse().map((r) => {
                const c = byId.get(r.creatorId);
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      {c ? (
                        <CreatorLink id={c.id} className="font-semibold text-accent hover:underline">
                          {c.name}
                        </CreatorLink>
                      ) : (
                        <span className="text-muted">Removed creator</span>
                      )}
                      {r.postUrl && (
                        <a href={r.postUrl} target="_blank" rel="noreferrer noopener" className="block max-w-56 truncate text-xs text-muted hover:underline">
                          {r.postUrl}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatFull(r.reach)}</td>
                    <td className="px-4 py-3 text-right">{formatFull(r.impressions)}</td>
                    <td className="px-4 py-3 text-right">{formatFull(r.views)}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(r.loggedAt)}
                      {r.loggedBy && ` · ${r.loggedBy}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className={buttonClass.ghost} onClick={() => actions.deleteCampaignResult(r.id)} aria-label="Delete result">
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input className={inputClass} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional" />
    </label>
  );
}
