"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CITIES, NICHES, TIKTOK_LIMITS } from "@config/app";
import { FLAG_THRESHOLDS } from "@config/flags";
import { AddToShortlist } from "@/components/add-to-shortlist";
import { EngagementChart } from "@/components/engagement-chart";
import { LinkedProfiles } from "@/components/linked-profiles";
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
  EstimateTag,
  PlatformBadge,
  SectionHeader,
  StatTile,
  TrendLine,
  VerifiedBadge,
} from "@/components/ui";
import { platformName, profileLink } from "@/lib/platforms";
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
  // Just looked up (?discover=1): look for their other platforms straight away.
  const [autoFind, setAutoFind] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discover") === "1") {
      setAutoFind(true);
      params.delete("discover");
      window.history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : ""));
    }
  }, []);

  return (
    <div className="space-y-6">
      <Link href="/creators" className={cx(buttonClass.ghost, "-ml-2.5")}>
        <Icon name="back" size={16} /> All creators
      </Link>

      {/* Header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-5">
            <Avatar name={c.name} photoUrl={c.photoUrl} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{c.name}</h1>
                <VerifiedBadge verified={c.verified} />
                {c.isSample && <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-semibold text-warn">Sample</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                <PlatformBadge platform={c.platform} />
                <span className="font-medium">@{c.handle}</span>
                <span className="text-muted" aria-hidden>
                  ·
                </span>
                <span className="text-muted">{ACCOUNT_LABEL[c.accountType]}</span>
              </div>
              {c.bio && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-ink-2">{c.bio}</p>}
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <Icon name="info" size={13} className="mt-px shrink-0" />
                <span>
                  Updated {timeAgo(c.lastFetchedAt, NOW)}.{" "}
                  {c.platform === "tiktok"
                    ? `TikTok isn't refreshed automatically (each refresh uses Apify credit); saved data is reused for ${TIKTOK_LIMITS.refreshDays} days.`
                    : `Refreshes automatically when older than ${settings.refreshIntervalHours} hours.`}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            <AddToShortlist creatorId={c.id} />
            <RefreshButton creatorId={c.id} />
            {!c.isSample && (
              <a href={profileLink(c.platform, c.handle, c.platformId)} target="_blank" rel="noreferrer noopener" className={buttonClass.ghost}>
                Open on {platformName(c.platform)} <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
        <div className="mt-5 max-w-2xl border-t border-line pt-4">
          <LinkedProfiles creator={c} autoFind={autoFind} />
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
              m.likesHidden ? (
                "Likes are hidden, so we can't work this out."
              ) : (
                "Not enough posts yet."
              )
            ) : (
              <span className="block space-y-1">
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <EngagementChip label={m.engagementLabel} /> for this size, by followers
                </span>
                {m.viewEngagementRate !== null && (
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    <span className="font-semibold text-ink">{formatPercent(m.viewEngagementRate)}</span> by views
                    <EngagementChip label={m.viewEngagementLabel} />
                  </span>
                )}
                {m.lowConfidence && <LowConfidence count={m.typicalPosts.length} />}
              </span>
            )
          }
        />
        <StatTile label="Expected engagements" value={formatRange(m.expectedEngagements)} hint="Likes + comments per post (middle 50% of recent posts)" />
        <StatTile label="Reach per post" value={formatRange(reach)} estimate hint={reach.method === "views" ? "From public views" : "From size benchmarks"} />
      </div>

      {/* Phones: score first, then the detail, then team fields. Desktop: detail on the left, score and team fields on the right. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        <Card className="p-5 sm:p-6 lg:col-start-3 lg:row-start-1 lg:self-start">
          <ScoreBreakdown score={score} />
        </Card>

        <div className="space-y-6 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Card className="p-5 sm:p-6">
            <SectionHeader
              title="Typical post"
              description={`Average of the latest ${m.typicalPosts.length} normal posts, after dropping the most extreme. Posts newer than ${
                c.platform === "youtube" ? Math.round(settings.minPostAgeHoursYoutube / 24) : Math.round(settings.minPostAgeHours / 24)
              } days are left out while their numbers grow.`}
            />
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-5">
              <Avg label="Likes" value={m.likesHidden ? null : m.avgLikes} empty={m.likesHidden ? "Hidden by creator" : "—"} />
              <Avg label="Comments" value={m.avgComments} />
              <Avg
                label="Views"
                value={m.avgViews}
                empty={c.platform === "instagram" ? "No recent Reels" : "—"}
                hint={m.viewPostCount > 0 ? `Middle ${c.platform === "instagram" ? "Reel" : "video"} of the last ${m.viewPostCount}` : undefined}
                note={
                  m.viewsAdjustment < 1
                    ? `${Math.round(m.viewsAdjustment * 100)}% of Instagram's count, which also includes Facebook and paid views (Settings → Instagram views counted).`
                    : undefined
                }
              />
            </dl>
            {m.trend && (
              <p className="mt-4">
                <TrendLine trend={m.trend} />
              </p>
            )}
            {m.setAside.length > 0 && (
              <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-2 ring-1 ring-line">
                <span className="font-semibold">
                  {m.setAside.length} {m.setAside.length === 1 ? "post" : "posts"} set aside
                </span>{" "}
                and not counted: {summariseSetAside(m.setAside)}. Older posts took their place
                {m.typicalPosts.length < settings.recentPostCount && ` where possible (only ${m.typicalPosts.length} posts available in the last 6 months)`}.
                They&apos;re marked in Recent posts below.
              </p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              title={
                <span className="flex items-center gap-2">
                  Estimated reach per post <EstimateTag />
                </span>
              }
            />
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {formatNumber(reach.low)} – {formatNumber(reach.high)}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-ink-2">{reach.note}</p>
            {c.platform !== "youtube" && reach.method !== "views" && (
              <p className="mt-2 text-xs text-muted">The range is wider because it isn&apos;t based on this creator&apos;s own view counts.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader title="Engagement across recent posts" className="mb-4" />
            {m.postsUsed.length > 0 ? (
              <EngagementChart posts={m.postsUsed} likesHidden={m.likesHidden} />
            ) : (
              <p className="text-sm text-muted">No posts to show yet.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              title={flags.length ? `Warning flags (${flags.length})` : "Warning flags"}
              description="Public numbers only. Prompts to look closer, not proof of fraud."
              className="mb-4"
            />
            <FlagList flags={flags} />
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader title="Recent posts" description="Faded posts aren't counted. Exclude a post you know was a paid ad." className="mb-4" />
            <PostGrid creatorId={c.id} posts={[...c.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt))} metrics={m} />
          </Card>
        </div>

        <div className="space-y-6 lg:col-start-3 lg:row-start-2 lg:self-start">
          <TeamFields key={c.id} creator={c} />
          <FollowerHistory creator={c} />
        </div>
      </div>
    </div>
  );
}

function LowConfidence({ count }: { count: number }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] font-semibold text-warn"
      title="Based on few posts, so these numbers could move a lot as more posts come in."
    >
      <Icon name="alert" size={11} /> Low confidence: only {count} {count === 1 ? "post" : "posts"}
    </span>
  );
}

function Avg({ label, value, empty = "—", hint, note }: { label: string; value: number | null; empty?: string; hint?: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value === null ? <span className="text-sm font-medium text-muted">{empty}</span> : formatNumber(value)}
        {note && value !== null && (
          <span className="cursor-help text-muted" title={note}>
            <Icon name="info" size={14} />
            <span className="sr-only">{note}</span>
          </span>
        )}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

const TYPE_LABEL: Record<Post["type"], string> = {
  image: "Photo",
  carousel: "Carousel",
  reel: "Reel",
  video: "Video",
  short: "Short",
  slideshow: "Photo slideshow",
};

function summariseSetAside(list: Metrics["setAside"]): string {
  const team = list.filter((x) => x.reason === "team").length;
  const high = list.length - team;
  return [high > 0 && `${high} far above the usual level (possibly boosted with ads, or viral)`, team > 0 && `${team} excluded by the team`]
    .filter(Boolean)
    .join(", ");
}

/** Posts shown before "Show all". */
const POSTS_PREVIEW = 12;

function PostGrid({ creatorId, posts, metrics: m }: { creatorId: string; posts: Post[]; metrics: Metrics }) {
  const [showAll, setShowAll] = useState(false);
  const typical = new Set(m.typicalPosts.map((p) => p.id));
  const views = new Set(m.viewPosts.map((p) => p.id));
  const reasons = new Map(m.setAside.map((x) => [x.post.id, x.reason]));
  const shown = showAll ? posts : posts.slice(0, POSTS_PREVIEW);

  if (posts.length === 0) return <p className="text-sm text-muted">No posts saved for this creator yet.</p>;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {shown.map((p) => {
          const reason = p.excluded ? "team" : reasons.get(p.id);
          const counted = typical.has(p.id) || views.has(p.id);
          return (
            <div
              key={p.id}
              className={cx(
                "flex flex-col rounded-lg border p-3",
                reason && reason !== "team" ? "border-warn/40 bg-warn-soft/30" : "border-line",
                (!counted || reason === "team") && !(reason && reason !== "team") && "bg-surface-2 opacity-70",
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium text-ink-2 ring-1 ring-line">{TYPE_LABEL[p.type]}</span>
                <span className="text-muted">{formatDate(p.postedAt)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium">{p.caption || <span className="text-muted">No caption</span>}</p>
              <dl className="mt-2 space-y-0.5 text-xs tabular-nums text-ink-2">
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
                {reason === "high_engagement" && <p className="text-[11px] font-semibold text-warn">Unusually high: possibly boosted. Not counted.</p>}
                {reason === "high_views" && <p className="text-[11px] font-semibold text-warn">Views unusually high: possibly boosted. Views not counted.</p>}
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
                    className="rounded text-[11px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
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
      {posts.length > POSTS_PREVIEW && (
        <div className="mt-4 flex justify-center">
          <button className={buttonClass.secondary} onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
            {showAll ? "Show fewer posts" : `Show all ${posts.length} posts`}
          </button>
        </div>
      )}
    </>
  );
}

/** Public profile link on the platform itself. */

const ACCOUNT_LABEL: Record<Creator["accountType"], string> = {
  channel: "YouTube channel",
  creator: "Creator account",
  business: "Business account",
  professional: "Business or creator account",
};

function RefreshButton({ creatorId }: { creatorId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!IS_LIVE) return null; // nothing to refresh from in the demo
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
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden />}
        {busy ? "Refreshing…" : "Refresh data"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-56 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function TeamFields({ creator: c }: { creator: Creator }) {
  const [notes, setNotes] = useState(c.notes);
  const [country, setCountry] = useState(c.country);
  const [tag, setTag] = useState("");
  const suggestions = suggestNiches(c.bio).filter((n) => n !== c.niche);

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <SectionHeader title="Team details" description="Only the team sees these. Not shown in client reports." />
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
            <button
              key={n}
              className="rounded-md bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink hover:bg-accent/15"
              onClick={() => actions.editCreator(c.id, { niche: n })}
              title={`Set niche to ${n}`}
            >
              + {n}
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
            <span key={t} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium ring-1 ring-line">
              {t}
              <button
                className="rounded text-muted hover:text-ink"
                aria-label={`Remove tag ${t}`}
                onClick={() => actions.editCreator(c.id, { tags: c.tags.filter((x) => x !== t) })}
              >
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
        <span className="mt-1 block text-xs text-muted">Saves when you click away.</span>
      </label>
    </Card>
  );
}

function FollowerHistory({ creator: c }: { creator: Creator }) {
  const snaps = [...c.snapshots].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader title="Follower history" description="Saved at every refresh, to spot growth and sudden jumps." />
      {snaps.length < 2 && <p className="mt-3 text-sm text-ink-2">Only one count saved so far. Growth will show once there&apos;s more history.</p>}
      <ul className="mt-3 divide-y divide-line text-sm">
        {snaps.map((s, i) => {
          const prev = snaps[i + 1];
          const change = prev ? (s.followers - prev.followers) / prev.followers : null;
          return (
            <li key={s.capturedAt} className="flex justify-between py-2 tabular-nums">
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
