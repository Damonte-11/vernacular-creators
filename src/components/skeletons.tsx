import { BandShapes } from "./creators/band";
import { cx } from "./ui";

/**
 * Loading states that look like the page that's coming: the real headings and layout, with soft bars where the
 * numbers and names will be. The words that never change (page titles, labels) show straight away.
 */

function Bone({ className, dark, style }: { className?: string; dark?: boolean; style?: React.CSSProperties }) {
  return <span className={cx("block", !/\brounded/.test(className ?? "") && "rounded-md", dark ? "bone-dark" : "bone", className)} style={style} aria-hidden />;
}

function Busy({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Lagos" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** A dark band with its real heading, and bars for what's worked out. */
function BandSkeleton({ title, line, children }: { title: string; line?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-6 text-white sm:px-8 sm:py-7">
      <BandShapes />
      <h1 className="relative text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
      {line ? <p className="relative mt-1 text-[13px] text-white/60">{line}</p> : <Bone dark className="relative mt-2.5 h-3 w-72 max-w-full" />}
      {children}
    </section>
  );
}

/** One creator card: avatar, name, score ring, four post covers, three numbers. */
export function CardSkeleton({ i = 0 }: { i?: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4" style={{ animationDelay: `${i * 80}ms` }}>
      <div className="flex items-center gap-3">
        <Bone className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-3.5 w-36 max-w-full" />
          <Bone className="h-2.5 w-52 max-w-full" />
        </div>
        <span className="h-11 w-11 shrink-0 rounded-full border-[3px] border-line" aria-hidden />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((k) => (
          <Bone key={k} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        {["Followers", "Engagement", "Expected views"].map((k) => (
          <div key={k}>
            <span>{k}</span>
            <Bone className="mt-1.5 h-3.5 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <Bone className="h-2.5 w-40" />
        <Bone className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

function Cards({ n, className }: { n: number; className?: string }) {
  return (
    <div className={cx("grid grid-cols-1 gap-4 xl:grid-cols-2", className)}>
      {Array.from({ length: n }, (_, i) => (
        <CardSkeleton key={i} i={i} />
      ))}
    </div>
  );
}

function StatTiles({ labels }: { labels: string[] }) {
  return (
    <div className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {labels.map((l) => (
        <div key={l} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <Bone dark className="h-6 w-14" />
          <p className="mt-1.5 text-xs text-white/70">{l}</p>
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Busy label="Loading home" className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-8 sm:py-8">
        <BandShapes />
        <h1 className="relative text-3xl font-bold tracking-tight sm:text-4xl">{greeting()}.</h1>
        <p className="relative mt-1 text-[14px] text-white/60">Look a creator up, or pick up where the team left off.</p>
        <div className="relative mt-5 max-w-3xl rounded-2xl bg-surface p-3 sm:p-4">
          <div className="flex gap-2">
            <Bone className="h-9 w-56 rounded-lg" />
            <Bone className="h-9 flex-1 rounded-lg" />
            <span className="h-9 w-20 rounded-lg bg-brand/90" aria-hidden />
          </div>
        </div>
        <StatTiles labels={["Creators saved", "Average score", "With warning signs", "Found this week"]} />
      </section>
      <section>
        <h2 className="text-xl font-bold tracking-tight">Top creators right now</h2>
        <Bone className="mt-1.5 h-3 w-72" />
        <Cards n={4} className="mt-3 2xl:grid-cols-3" />
      </section>
    </Busy>
  );
}

export function CreatorsSkeleton() {
  return (
    <Busy label="Loading creators" className="space-y-6">
      <BandSkeleton title="Who are you looking for?">
        <div className="relative mt-4 flex max-w-2xl items-center gap-2 rounded-xl bg-surface p-1.5 pl-4">
          <span className="flex-1 py-2 text-[15px] text-muted">e.g. food creators in Lagos with high engagement</span>
          <span className="h-9 w-28 rounded-lg bg-accent/70" aria-hidden />
        </div>
        <div className="relative mt-3 flex gap-2">
          {[180, 150, 200].map((w) => (
            <Bone key={w} dark className="h-6 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </BandSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="hidden space-y-5 lg:block">
          {["Platform", "Expected views", "Engagement", "Size"].map((t) => (
            <div key={t}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">{t}</p>
              <div className="mt-3 space-y-2.5">
                <Bone className="h-3 w-40" />
                <Bone className="h-3 w-32" />
                <Bone className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <Bone className="mb-4 h-3.5 w-28" />
          <Cards n={6} />
        </div>
      </div>
    </Busy>
  );
}

export function LeaderboardsSkeleton() {
  return (
    <Busy label="Loading leaderboards" className="space-y-5">
      <BandSkeleton
        title="Leaderboards"
        line="The highest Creator Scores, ranked only against creators of the same size, so a 9K creator is never up against a 1.4M one."
      >
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {[70, 70, 84, 74, 66, 84].map((w, i) => (
            <Bone key={i} dark className="h-8 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </BandSkeleton>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cx("rounded-2xl p-5", i === 0 ? "bg-brand" : "bg-surface ring-1 ring-line")}>
            <div className="flex gap-3">
              <Bone dark={i === 0} className="h-[52px] w-[52px] rounded-full" />
              <span className={cx("h-[52px] w-[52px] rounded-full border-[5px]", i === 0 ? "border-white/15" : "border-line")} aria-hidden />
            </div>
            <Bone dark={i === 0} className="mt-4 h-4 w-40" />
            <Bone dark={i === 0} className="mt-2 h-2.5 w-56 max-w-full" />
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((k) => (
                <Bone key={k} dark={i === 0} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Rows n={5} />
    </Busy>
  );
}

function Rows({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-44" />
            <Bone className="h-2.5 w-64 max-w-full" />
          </div>
          <Bone className="hidden h-3.5 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function DiscoveredSkeleton() {
  return (
    <Busy label="Loading discovered creators" className="space-y-5">
      <BandSkeleton title="Discovered" />
      <Cards n={4} />
    </Busy>
  );
}

export function ProfileSkeleton() {
  return (
    <Busy label="Loading profile" className="space-y-5">
      <Bone className="h-3 w-24" />
      <section className="relative overflow-hidden rounded-3xl bg-brand px-6 py-8 sm:px-10 sm:py-10">
        <BandShapes />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <Bone dark className="h-16 w-16 rounded-full" />
            <Bone dark className="mt-5 h-8 w-64 max-w-full" />
            <Bone dark className="mt-3 h-3 w-80 max-w-full" />
          </div>
          <span className="hidden h-24 w-24 shrink-0 self-end rounded-full border-[7px] border-white/15 md:block" aria-hidden />
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {["Followers", "Engagement", "Expected views", "Posts a week"].map((l) => (
            <div key={l} className="rounded-xl bg-white/5 p-3">
              <Bone dark className="h-6 w-16" />
              <p className="mt-1.5 text-xs text-white/60">{l}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="flex gap-1.5">
        {["Summary", "Performance", "Posts", "Audience", "Tags", "With us", "Team"].map((l) => (
          <span key={l} className="shrink-0 rounded-full px-3 py-1 text-[13px] font-medium text-muted ring-1 ring-line">
            {l}
          </span>
        ))}
      </div>
      <section className="rounded-3xl bg-rail p-6 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">The short version</h2>
        <div className="mt-5 flex items-end gap-2.5">
          <span className="h-8 w-8 shrink-0 rounded-full bg-vern/60" aria-hidden />
          <div className="w-full max-w-2xl space-y-2 rounded-[20px_20px_20px_6px] bg-surface px-4 py-3 ring-1 ring-line">
            <Bone className="h-4 w-11/12" />
            <Bone className="h-4 w-2/3" />
          </div>
        </div>
      </section>
    </Busy>
  );
}

/** Projects, a project, Dialect, settings: a title, tabs and a few panels. */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <Busy label="Loading" className="space-y-5">
      {title ? <h1 className="text-xl font-semibold tracking-tight">{title}</h1> : <Bone className="h-6 w-56" />}
      <Bone className="h-3 w-80 max-w-full" />
      <div className="flex gap-5 border-b border-line pb-3">
        {[64, 72, 52, 48, 60].map((w, i) => (
          <Bone key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <Bone className="h-4 w-40" />
        <Bone className="mt-4 h-3 w-full rounded-full" />
        <Bone className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <Bone className="h-2.5 w-16" />
            <Bone className="mt-2.5 h-6 w-24" />
          </div>
        ))}
      </div>
      <Rows n={3} />
    </Busy>
  );
}

/** The right loading state for the page being opened. */
export function SkeletonFor({ path }: { path: string }) {
  if (path === "/") return <HomeSkeleton />;
  if (path === "/creators") return <CreatorsSkeleton />;
  if (path.startsWith("/creators/")) return <ProfileSkeleton />;
  if (path.startsWith("/leaderboards")) return <LeaderboardsSkeleton />;
  if (path.startsWith("/discovered")) return <DiscoveredSkeleton />;
  if (path === "/projects") return <PageSkeleton title="Projects" />;
  if (path.startsWith("/campaign-results")) return <PageSkeleton title="Campaign results" />;
  if (path.startsWith("/settings")) return <PageSkeleton title="Settings" />;
  if (path.startsWith("/add")) return <PageSkeleton title="Add creators" />;
  return <PageSkeleton />;
}
