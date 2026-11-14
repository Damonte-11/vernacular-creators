"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CITIES, NICHES, TIKTOK_LIMITS } from "@config/app";
import { FLAG_THRESHOLDS } from "@config/flags";
import { AddToProject } from "@/components/add-to-project";
import { AudiencePanel } from "@/components/creators/audience";
import { FollowerGrowth, ViewsAgainstUsual } from "@/components/creators/charts";
import { Avatar as CrAvatar, PostCover, ScoreRing } from "@/components/creators/media";
import { History } from "@/components/creators/profile-drawer";
import { EngagementChart } from "@/components/engagement-chart";
import { LinkedProfiles } from "@/components/linked-profiles";
import { Icon } from "@/components/icons";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { buttonClass, Card, cx, EmptyState, EngagementChip, FlagList, inputClass, labelClass, EstimateTag, SectionHeader, TrendLine } from "@/components/ui";
import { platformName, profileLink } from "@/lib/platforms";
import { Loading } from "@/components/ui";
import { NOW, useAnalyses, useAnalysis } from "@/lib/data/creators";
import { creatorView, similar } from "@/lib/creator-view";
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
  const analyses = useAnalyses();
  const all = useMemo(() => analyses.map((a) => creatorView(a, NOW)), [analyses]);
  const v = useMemo(() => creatorView(analysis, NOW), [analysis]);
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
  const posts = [...c.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const jump = (id: string) => document.getElementById(`p-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href="/creators" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <Icon name="back" size={14} /> All creators
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!c.isSample && (
            <a href={profileLink(c.platform, c.handle, c.platformId)} target="_blank" rel="noreferrer noopener" className={buttonClass.ghost}>
              Open on {platformName(c.platform)} <span aria-hidden>↗</span>
            </a>
          )}
          <RefreshButton creatorId={c.id} />
          <button className={buttonClass.secondary} onClick={() => window.print()}>
            <Icon name="download" size={14} /> Download PDF
          </button>
          <AddToProject creatorId={c.id} />
        </div>
      </div>

      {/* Cover */}
      <section className="relative overflow-hidden rounded-3xl bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        <span className="absolute right-0 top-0 hidden h-[22%] w-[11%] bg-accent sm:block" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <CrAvatar v={v} size={64} ring />
              <div className="flex flex-wrap gap-1.5">
                {c.verified && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">Verified by the creator</span>}
                {c.discoveredVia && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">Found by discovery</span>}
                {c.isSample && <span className="rounded-full bg-warn px-2 py-0.5 text-xs font-semibold text-white">Sample</span>}
              </div>
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-none tracking-tight sm:text-6xl">{c.name}</h1>
            <p className="mt-3 text-[15px] text-accent">
              @{c.handle} · {platformName(c.platform)}
              {c.niche ? ` · ${c.niche}` : ""}
              {c.city ? ` · ${c.city}` : ""}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {ACCOUNT_LABEL[c.accountType]} ·{" "}
              <span
                title={
                  c.platform === "tiktok"
                    ? `TikTok isn't refreshed automatically (each refresh uses Apify credit); saved data is reused for ${TIKTOK_LIMITS.refreshDays} days.`
                    : `Refreshes automatically when older than ${settings.refreshIntervalHours} hours.`
                }
              >
                updated {timeAgo(c.lastFetchedAt, NOW)}
              </span>
            </p>
            {c.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-[13px] text-white/75">{c.bio}</p>}
          </div>
          <span className="hidden md:block">
            <ScoreRing score={score.total} size={104} stroke={8} dark />
          </span>
          <span className="absolute right-0 top-0 md:hidden">
            <ScoreRing score={score.total} size={56} stroke={5} dark />
          </span>
        </div>
      </section>

      <nav className="no-print sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-canvas/90 px-1 py-2 backdrop-blur" aria-label="Sections">
        {[
          ["summary", "Summary"],
          ["performance", "Performance"],
          ["posts", `Posts · ${posts.length}`],
          ["audience", "Audience"],
          ["tags", "Tags"],
          ["us", "With us"],
          ["team", "Team"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => jump(id)}
            className="shrink-0 rounded-full px-3 py-1 text-[13px] font-medium text-ink-2 ring-1 ring-line hover:bg-surface-2 hover:text-ink"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* The short version */}
      <Sheet id="summary" title={v.verdict}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile big={formatNumber(c.followers)} label="Followers" note={`${bandName} creator · ${formatNumber(c.mediaCount)} posts`} />
          <Tile
            big={formatPercent(m.engagementRate, 2)}
            label="Engagement rate"
            note={
              m.engagementRate === null ? (
                m.likesHidden ? (
                  "Likes are hidden, so we can't work this out."
                ) : (
                  "Not enough posts yet."
                )
              ) : (
                <span className="block space-y-1">
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    <EngagementChip label={m.engagementLabel} /> for this size
                  </span>
                  {m.viewEngagementRate !== null && (
                    <span className="flex flex-wrap items-center gap-x-1.5">
                      {formatPercent(m.viewEngagementRate)} by views <EngagementChip label={m.viewEngagementLabel} />
                    </span>
                  )}
                  {m.lowConfidence && <LowConfidence count={m.typicalPosts.length} />}
                </span>
              )
            }
          />
          <Tile
            dark
            big={m.avgViews === null ? "—" : formatNumber(m.avgViews)}
            label="Expected views"
            note={v.reach !== null ? `About ${Math.round(v.reach * 100)}% of their followers` : "Typical views per post"}
          />
          <Tile big={formatRange(m.expectedEngagements)} label="Expected engagements" note="Likes + comments per post (middle half of recent posts)" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ListCard title="Why they work" items={v.why} tone="good" empty="Nothing stands out yet." />
          <ListCard title="Watch out" items={v.watchOut} tone="bad" empty="Nothing unusual in their numbers." />
        </div>
      </Sheet>

      {/* Performance */}
      <Sheet id="performance" title="How their posts perform">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Views on their last posts" note="Dashed line: their usual. Orange: 30%+ above it.">
            <ViewsAgainstUsual v={v} />
          </Panel>
          <Panel title="Followers over time" note="Saved at every refresh">
            <FollowerGrowth v={v} />
          </Panel>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <Panel
              title="Typical post"
              note={`Average of the latest ${m.typicalPosts.length} normal posts, after dropping the most extreme. Posts newer than ${
                c.platform === "youtube" ? Math.round(settings.minPostAgeHoursYoutube / 24) : Math.round(settings.minPostAgeHours / 24)
              } days are left out while their numbers grow.`}
            >
              <dl className="grid grid-cols-3 gap-4">
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
                <p className="mt-3">
                  <TrendLine trend={m.trend} />
                </p>
              )}
              {m.setAside.length > 0 && (
                <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-2 ring-1 ring-line">
                  <span className="font-semibold">
                    {m.setAside.length} {m.setAside.length === 1 ? "post" : "posts"} set aside
                  </span>{" "}
                  and not counted: {summariseSetAside(m.setAside)}. Older posts took their place
                  {m.typicalPosts.length < settings.recentPostCount && ` where possible (only ${m.typicalPosts.length} posts available in the last 6 months)`}.
                  They&apos;re marked in{" "}
                  <button className="font-medium underline" onClick={() => jump("posts")}>
                    Posts
                  </button>
                  .
                </p>
              )}
              <div className="mt-4 border-t border-line pt-3.5">
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  Reach per post: {formatNumber(reach.low)} – {formatNumber(reach.high)} <EstimateTag />
                </p>
                <p className="mt-1 max-w-2xl text-[13px] text-ink-2">{reach.note}</p>
                {c.platform !== "youtube" && reach.method !== "views" && (
                  <p className="mt-1 text-xs text-muted">The range is wider because it isn&apos;t based on this creator&apos;s own view counts.</p>
                )}
              </div>
            </Panel>
            <Panel title="Engagement across recent posts">
              {m.postsUsed.length > 0 ? (
                <EngagementChart posts={m.postsUsed} likesHidden={m.likesHidden} />
              ) : (
                <p className="text-[13px] text-muted">No posts to show yet.</p>
              )}
            </Panel>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
              <ScoreBreakdown score={score} />
            </div>
            <Panel
              title={flags.length ? `Warning flags (${flags.length})` : "Warning flags"}
              note="Public numbers only. Prompts to look closer, not proof of fraud."
            >
              <FlagList flags={flags} />
            </Panel>
          </div>
        </div>
      </Sheet>

      {/* Posts */}
      <Sheet id="posts" title="What they make">
        {v.best.length > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-2 md:grid-cols-6">
            {v.best.slice(0, 6).map((p, i) => (
              <PostCover key={p.id} post={p} className="aspect-[3/4]" label={i === 0 ? "Most viewed" : undefined} />
            ))}
          </div>
        )}
        <p className="no-print mb-3 text-[13px] text-muted">Faded posts aren&apos;t counted. Exclude a post you know was a paid ad.</p>
        <div className="no-print">
          <PostGrid creatorId={c.id} posts={posts} metrics={m} />
        </div>
      </Sheet>

      {/* Audience */}
      <Sheet id="audience" title="Who comments on their posts">
        <AudiencePanel creator={c} />
      </Sheet>

      {/* Tags */}
      <Sheet id="tags" title="Brands and accounts they tag">
        {v.mentions.length ? (
          <div className="flex flex-wrap gap-2">
            {v.mentions.slice(0, 24).map((x) => (
              <span
                key={x.handle}
                className={cx("rounded-full px-3 py-1.5 text-[13px]", x.paid ? "bg-brand text-white" : "bg-surface text-ink ring-1 ring-line")}
              >
                {x.handle}
                <span className={x.paid ? "text-white/60" : "text-muted"}> · {x.posts}</span>
                {x.paid && <span className="text-accent"> · paid</span>}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">They don&apos;t tag brands or accounts in their recent captions.</p>
        )}
        <p className="mt-3 text-xs text-muted">From their recent captions. Dark ones said #ad, sponsored or paid partnership.</p>
      </Sheet>

      {/* With us */}
      <Sheet id="us" title="With Vernacular" className="no-print">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Past projects">
            <History v={v} light />
          </Panel>
          <Panel title="Linked accounts">
            <LinkedProfiles creator={c} autoFind={autoFind} />
          </Panel>
        </div>
      </Sheet>

      {/* Team */}
      <Sheet id="team" title="For the team only" className="no-print">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <TeamFields key={c.id} creator={c} />
          <FollowerHistory creator={c} />
        </div>
      </Sheet>

      <Sheet title={`If not ${c.name.split(" ")[0]}, try`}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {similar(v, all, 6).map((y) => (
            <Link
              key={y.id}
              href={`/creators/${encodeURIComponent(y.id)}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line transition-shadow hover:shadow-[0_8px_24px_rgba(23,23,21,.08)]"
            >
              <CrAvatar v={y} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{y.name}</span>
                <span className="block truncate text-xs text-muted">
                  {formatNumber(y.followers)} · {y.niche ?? "—"} · {y.city ?? y.country}
                </span>
              </span>
              <ScoreRing score={y.score} size={34} stroke={3} />
            </Link>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function Sheet({ id, title, children, className }: { id?: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section id={id ? `p-${id}` : undefined} className={cx("scroll-mt-14 rounded-3xl bg-rail p-6 sm:p-8", className)}>
      <h2 className="mb-5 max-w-3xl text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <p className="text-[13px] font-semibold">{title}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Tile({ big, label, note, dark }: { big: string; label: string; note?: ReactNode; dark?: boolean }) {
  return (
    <div className={cx("rounded-2xl p-4 sm:p-5", dark ? "bg-brand text-white" : "bg-surface ring-1 ring-line")}>
      <p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{big}</p>
      <p className={cx("mt-1 text-[13px] font-medium", dark ? "text-white/70" : "text-ink-2")}>{label}</p>
      {note && <div className={cx("mt-1 text-xs", dark ? "text-white/50" : "text-muted")}>{note}</div>}
    </div>
  );
}

function ListCard({ title, items, tone, empty }: { title: string; items: string[]; tone: "good" | "bad"; empty: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <p className={cx("text-[13px] font-semibold", tone === "good" ? "text-good" : "text-bad")}>{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {items.map((w) => (
            <li key={w} className="flex gap-2">
              <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "good" ? "bg-good" : "bg-bad")} />
              {w}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted">{empty}</p>
      )}
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
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 text-xl font-semibold tracking-tight tabular-nums">
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
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
        {shown.map((p) => {
          const reason = p.excluded ? "team" : reasons.get(p.id);
          const counted = typical.has(p.id) || views.has(p.id);
          return (
            <div
              key={p.id}
              className={cx(
                "flex flex-col rounded-xl border bg-surface p-3",
                reason && reason !== "team" ? "border-warn/40 bg-warn-soft/30" : "border-line",
                (!counted || reason === "team") && !(reason && reason !== "team") && "bg-surface-2 opacity-70",
              )}
            >
              <PostCover post={p} className="-mx-1 -mt-1 mb-2 aspect-[4/3]" />
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
    <Card className="space-y-4 p-4 sm:p-5">
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
    <Card className="p-4 sm:p-5">
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
