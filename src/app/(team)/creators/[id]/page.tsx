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
import { actions, useAppState, useHydrated } from "@/lib/data/store";
import { formatDate, formatFull, formatNumber, formatPercent, formatRange, timeAgo } from "@/lib/format";
import { suggestNiches } from "@/lib/niche";
import { sizeBandLabel } from "@/lib/size-bands";
import type { Creator, CreatorAnalysis, Post } from "@/lib/types";

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
  const excluded = c.posts.length - m.postsUsed.length;

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
              <span>{c.accountType === "channel" ? "YouTube channel" : c.accountType === "creator" ? "Creator account" : "Business account"}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm">{c.bio}</p>
            <p className="mt-2 text-xs text-muted">
              Data updated {timeAgo(c.lastFetchedAt, NOW)} · refreshes when older than {settings.refreshIntervalHours} hours (Stage 2)
            </p>
          </div>
          <div className="flex gap-2 sm:flex-col">
            <AddToShortlist creatorId={c.id} />
            <button className={buttonClass.secondary} disabled title="Live refresh arrives in Stage 2">
              Refresh data
            </button>
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
              <span className="flex items-center gap-1">
                <EngagementChip label={m.engagementLabel} /> for a {bandName.toLowerCase()} {c.platform === "instagram" ? "Instagram" : "YouTube"} creator
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
            <h2 className="font-bold">Averages from recent posts</h2>
            <p className="mt-0.5 text-xs text-muted">
              Last {m.postsUsed.length} posts
              {excluded > 0 && ` (${excluded} ${excluded === 1 ? "post" : "posts"} left out: too new or older than the last ${settings.recentPostCount})`}. Posts under{" "}
              {settings.minPostAgeHours} hours old are left out because their numbers are still growing.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <Avg label="Likes" value={m.likesHidden ? null : m.avgLikes} empty={m.likesHidden ? "Hidden by creator" : "—"} />
              <Avg label="Comments" value={m.avgComments} />
              <Avg
                label="Views"
                value={m.avgViews}
                empty={c.platform === "instagram" ? "No Reels with views" : "—"}
                hint={m.viewPostCount > 0 && m.viewPostCount < m.postsUsed.length ? `from ${m.viewPostCount} posts with views` : undefined}
              />
            </dl>
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
            <PostGrid posts={[...c.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt))} usedIds={new Set(m.postsUsed.map((p) => p.id))} />
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

function PostGrid({ posts, usedIds }: { posts: Post[]; usedIds: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {posts.map((p) => (
        <div key={p.id} className={cx("rounded-lg border border-line p-3", !usedIds.has(p.id) && "opacity-60")}>
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
          {!usedIds.has(p.id) && <p className="mt-2 text-[11px] text-muted">Not counted in averages</p>}
        </div>
      ))}
    </div>
  );
}

function TeamFields({ creator: c }: { creator: Creator }) {
  const [notes, setNotes] = useState(c.notes);
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
