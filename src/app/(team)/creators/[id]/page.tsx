"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CITIES, NICHES } from "@config/app";
import { FLAG_THRESHOLDS } from "@config/flags";
import { AddToShortlist } from "@/components/add-to-shortlist";
import { EngagementChart } from "@/components/engagement-chart";
import { Icon } from "@/components/icons";
import { ScoreBreakdown } from "@/components/score-breakdown";
import {
  Avatar,
  buttonClass,
  Card,
  cx,
  EmptyState,
  EngagementChip,
  FlagList,
  inputClass,
  labelClass,
  PlatformBadge,
  StatTile,
  VerifiedBadge,
} from "@/components/ui";
import { Loading } from "@/components/ui";
import { NOW, useAnalysis } from "@/lib/data/creators";
import { refreshCreator } from "@/lib/data/lookup";
import { IS_LIVE } from "@/lib/supabase/config";
import { actions, useAppState, useHydrated } from "@/lib/data/store";
import { formatDate, formatFull, formatNumber, formatPercent, formatRange, timeAgo } from "@/lib/format";
import { suggestNiches } from "@/lib/niche";
import { sizeBandLabel } from "@/lib/size-bands";
import type { Creator, CreatorAnalysis, Metrics, Post } from "@/lib/types";

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const analysis = useAnalysis(decodeURIComponent(id));
  const hydrated = useHydrated();

  if (!analysis && !hydrated) return <Loading />;
  if (!analysis) {
    return (
      <EmptyState
        title="Creator not found"
        body="They may have been added in a different browser. In the demo, changes are only saved in the browser you made them in."
        action={
          <Link href="/creators" className={buttonClass.secondary}>
            Back to creators
          </Link>
        }
      />
    );
  }
  return <Profile analysis={analysis} />;
}

function Profile({ analysis }: { analysis: CreatorAnalysis }) {
  const { creator: c, metrics: m, reach, flags, score } = analysis;
  const { settings } = useAppState();
  const bandName = sizeBandLabel(m.band);

  return (
    <div className="space-y-6">
      <Link href="/creators" className={cx(buttonClass.ghost, "-ml-2")}>
        <Icon name="back" size={16} /> All creators
      </Link>

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={c.name} photoUrl={c.photoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <VerifiedBadge verified={c.verified} />
              {c.isSample && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">Sample</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
              <PlatformBadge platform={c.platform} />
              <span>@{c.handle}</span>
              <span className="hidden text-muted sm:inline">·</span>
              <span>{ACCOUNT_LABEL[c.accountType]}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm">{c.bio}</p>
            <p className="mt-2 text-xs text-muted">
              Data updated {timeAgo(c.lastFetchedAt, NOW)} · refreshes automatically when older than {settings.refreshIntervalHours} hours
            </p>
          </div>
          <div className="flex gap-2 sm:flex-col">
            <AddToShortlist creatorId={c.id} />
            <RefreshButton creatorId={c.id} />
          </div>
        </div>
      </Card>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Followers" value={formatNumber(c.followers)} hint={`${bandName} creator · ${formatNumber(c.mediaCount)} posts`} />
        <StatTile
          label="Engagement rate"
          value={formatPercent(m.engagementRate, 2)}
          hint={
            m.engagementRate === null ? (
              m.likesHidden ? "Likes are hidden, so we can't work this out." : "Not enough posts yet."
            ) : (
              <span className="block space-y-1">
                <span className="flex flex-wrap items-center gap-1">
                  <EngagementChip label={m.engagementLabel} /> by followers, for creators of this size
                </span>
                {m.viewEngagementRate !== null && (
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="font-semibold text-ink">{formatPercent(m.viewEngagementRate)}</span> by views
                    <EngagementChip label={m.viewEngagementLabel} />
                  </span>
                )}
                {m.lowConfidence && <LowConfidence count={m.typicalPosts.length} />}
              </span>
            )
          }
        />
        <StatTile
          label="Expected engagements"
          value={formatRange(m.expectedEngagements)}
          hint="Likes + comments per post (middle 50% of recent posts)"
        />
        <StatTile label="Reach per post" value={formatRange(reach)} estimate hint={reach.method === "views" ? "From public views" : "From size benchmarks"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-bold">Typical post</h2>
            <p className="mt-0.5 text-xs text-muted">
              Average of the latest {m.typicalPosts.length} normal posts, after dropping the most extreme, so one freak post can&apos;t swing it. Posts
              newer than {c.platform === "youtube" ? `${Math.round(settings.minPostAgeHoursYoutube / 24)} days` : `${Math.round(settings.minPostAgeHours / 24)} days`}{" "}
              are left out because their numbers are still growing.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <Avg label="Likes" value={m.likesHidden ? null : m.avgLikes} empty={m.likesHidden ? "Hidden by creator" : "—"} />
              <Avg label="Comments" value={m.avgComments} />
              <Avg
                label="Views"
                value={m.avgViews}
                empty={c.platform === "instagram" ? "No recent Reels" : "—"}
                hint={m.viewPostCount > 0 ? `from the last ${m.viewPostCount} ${c.platform === "instagram" ? "Reels" : "videos"}` : undefined}
              />
            </dl>
            {m.setAside.length > 0 && (
              <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-2">
                <span className="font-semibold">{m.setAside.length} {m.setAside.length === 1 ? "post" : "posts"} set aside</span> and not counted:{" "}
                {summariseSetAside(m.setAside)}. Older posts took their place
                {m.typicalPosts.length < settings.recentPostCount &&
                  ` where possible (only ${m.typicalPosts.length} normal posts in the last 6 months)`}
                . They&apos;re marked in Recent posts below.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">Estimated reach per post</h2>
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Estimate</span>
            </div>
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(reach.low)} – {formatNumber(reach.high)}
            </p>
            <p className="mt-2 text-sm text-ink-2">{reach.note}</p>
            {c.platform === "instagram" && reach.method !== "views" && (
              <p className="mt-2 text-xs text-muted">The range is wider because it isn&apos;t based on this creator&apos;s own view counts.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">Engagement across recent posts</h2>
            {m.postsUsed.length > 0 ? (
              <EngagementChart posts={m.postsUsed} likesHidden={m.likesHidden} />
            ) : (
              <p className="text-sm text-muted">No posts to show yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">Warning flags</h2>
            <FlagList flags={flags} />
            <p className="mt-3 text-xs text-muted">Flags use public numbers only. They are prompts to look closer, not proof of fraud.</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">Recent posts</h2>
            <PostGrid creatorId={c.id} posts={[...c.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt))} metrics={m} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <ScoreBreakdown score={score} />
          </Card>
          <TeamFields key={c.id} creator={c} />
          <FollowerHistory creator={c} />
        </div>
      </div>
    </div>
  );
}

function LowConfidence({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-warn" title="Based on few posts, so these numbers could move a lot as more posts come in.">
      <Icon name="alert" size={11} /> Low confidence: only {count} {count === 1 ? "post" : "posts"}
    </span>
  );
}

function Avg({ label, value, empty = "—", hint }: { label: string; value: number | null; empty?: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-bold">{value === null ? <span className="text-sm font-semibold text-muted">{empty}</span> : formatNumber(value)}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

const TYPE_LABEL: Record<Post["type"], string> = { image: "Photo", carousel: "Carousel", reel: "Reel", video: "Video", short: "Short" };

function summariseSetAside(list: Metrics["setAside"]): string {
  const team = list.filter((x) => x.reason === "team").length;
  const high = list.length - team;
  return [
    high > 0 && `${high} far above the usual level (possibly boosted with ads, or viral)`,
    team > 0 && `${team} excluded by the team`,
  ]
    .filter(Boolean)
    .join(", ");
}

function PostGrid({ creatorId, posts, metrics: m }: { creatorId: string; posts: Post[]; metrics: Metrics }) {
  const typical = new Set(m.typicalPosts.map((p) => p.id));
  const views = new Set(m.viewPosts.map((p) => p.id));
  const reasons = new Map(m.setAside.map((x) => [x.post.id, x.reason]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {posts.map((p) => {
        const reason = p.excluded ? "team" : reasons.get(p.id);
        const counted = typical.has(p.id) || views.has(p.id);
        return (
          <div
            key={p.id}
            className={cx("flex flex-col rounded-lg border p-3", reason && reason !== "team" ? "border-warn/40" : "border-line", !counted && !reason && "opacity-60")}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="rounded bg-canvas px-1.5 py-0.5 font-semibold text-ink-2">{TYPE_LABEL[p.type]}</span>
              <span className="text-muted">{formatDate(p.postedAt)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{p.caption}</p>
            <dl className="mt-2 space-y-0.5 text-xs text-ink-2">
              <div className="flex justify-between">
                <dt>Likes</dt>
                <dd className="font-semibold">{p.likes === null ? "Hidden" : formatFull(p.likes)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Comments</dt>
                <dd className="font-semibold">{formatFull(p.comments)}</dd>
              </div>
              {p.views !== null && (
                <div className="flex justify-between">
                  <dt>Views</dt>
                  <dd className="font-semibold">{formatFull(p.views)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-auto pt-2">
              {reason === "high_engagement" && (
                <p className="text-[11px] font-semibold text-warn">Unusually high: possibly boosted. Not counted.</p>
              )}
              {reason === "high_views" && (
                <p className="text-[11px] font-semibold text-warn">Views unusually high: possibly boosted. Views not counted.</p>
              )}
              {reason === "team" && <p className="text-[11px] font-semibold text-ink-2">Excluded by the team. Not counted.</p>}
              {!reason && !counted && <p className="text-[11px] text-muted">Not counted (too new or older than the recent posts)</p>}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-accent-ink hover:underline">
                    View post ↗
                  </a>
                ) : (
                  <span />
                )}
                <button
                  className="text-[11px] font-semibold text-muted underline hover:text-ink"
                  onClick={() => actions.setPostExcluded(creatorId, p.id, !p.excluded)}
                  title={p.excluded ? "Count this post again" : "Leave this post out, e.g. if you know it was a paid ad"}
                >
                  {p.excluded ? "Include again" : "Exclude (ad)"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ACCOUNT_LABEL: Record<Creator["accountType"], string> = {
  channel: "YouTube channel",
  creator: "Creator account",
  business: "Business account",
  professional: "Business or creator account",
};

function RefreshButton({ creatorId }: { creatorId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!IS_LIVE) {
    return (
      <button className={buttonClass.secondary} disabled title="Not available in demo mode">
        Refresh data
      </button>
    );
  }
  return (
    <div>
      <button
        className={buttonClass.secondary}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await refreshCreator(creatorId);
          setBusy(false);
          if (!r.ok) setError(r.error);
        }}
      >
        {busy ? "Refreshing…" : "Refresh data"}
      </button>
      {error && <p className="mt-1 max-w-56 text-xs text-bad">{error}</p>}
    </div>
  );
}

function TeamFields({ creator: c }: { creator: Creator }) {
  const [notes, setNotes] = useState(c.notes);
  const [country, setCountry] = useState(c.country);
  const [tag, setTag] = useState("");
  const suggestions = suggestNiches(c.bio).filter((n) => n !== c.niche);

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-bold">Team details</h2>
        <p className="text-xs text-muted">Set by the team. The platforms don&apos;t share these reliably.</p>
      </div>
      <label className="block">
        <span className={labelClass}>Niche</span>
        <select className={inputClass} value={c.niche ?? ""} onChange={(e) => actions.editCreator(c.id, { niche: e.target.value || null })}>
          <option value="">Not set</option>
          {NICHES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      {suggestions.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted">Suggested from bio:</span>
          {suggestions.map((n) => (
            <button key={n} className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink" onClick={() => actions.editCreator(c.id, { niche: n })}>
              {n}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className={labelClass}>City</span>
        <select className={inputClass} value={c.city ?? ""} onChange={(e) => actions.editCreator(c.id, { city: e.target.value || null })}>
          <option value="">Not set</option>
          {CITIES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Country</span>
        <input
          className={inputClass}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onBlur={() => country.trim() && country !== c.country && actions.editCreator(c.id, { country: country.trim() })}
        />
      </label>
      <div>
        <span className={labelClass}>Tags</span>
        <div className="mb-2 flex flex-wrap gap-1">
          {c.tags.length === 0 && <span className="text-xs text-muted">No tags yet.</span>}
          {c.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold">
              {t}
              <button aria-label={`Remove tag ${t}`} onClick={() => actions.editCreator(c.id, { tags: c.tags.filter((x) => x !== t) })}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = tag.trim().toLowerCase();
            if (t && !c.tags.includes(t)) actions.editCreator(c.id, { tags: [...c.tags, t] });
            setTag("");
          }}
        >
          <input className={inputClass} placeholder="e.g. fast-replier" value={tag} onChange={(e) => setTag(e.target.value)} />
          <button className={buttonClass.secondary}>Add</button>
        </form>
      </div>
      <label className="block">
        <span className={labelClass}>Notes</span>
        <textarea
          className={cx(inputClass, "min-h-24")}
          placeholder="Rates, contact person, past work with us…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== c.notes && actions.editCreator(c.id, { notes })}
        />
        <span className="text-xs text-muted">Saves when you click away.</span>
      </label>
    </Card>
  );
}

function FollowerHistory({ creator: c }: { creator: Creator }) {
  const snaps = [...c.snapshots].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return (
    <Card className="p-5">
      <h2 className="font-bold">Follower history</h2>
      <p className="text-xs text-muted">We save the follower count at every refresh. This is how growth and sudden jumps are spotted over time.</p>
      {snaps.length < 2 && <p className="mt-3 text-sm text-ink-2">Only one count saved so far. Growth will show once there&apos;s more history.</p>}
      <ul className="mt-3 divide-y divide-line text-sm">
        {snaps.map((s, i) => {
          const prev = snaps[i + 1];
          const change = prev ? (s.followers - prev.followers) / prev.followers : null;
          return (
            <li key={s.capturedAt} className="flex justify-between py-1.5">
              <span className="text-ink-2">{formatDate(s.capturedAt)}</span>
              <span className="font-semibold">
                {formatFull(s.followers)}
                {change !== null && (
                  <span className={cx("ml-2 text-xs", change > FLAG_THRESHOLDS.followerJumpPct ? "text-bad" : "text-muted")}>
                    {change >= 0 ? "+" : ""}
                    {formatPercent(change)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
