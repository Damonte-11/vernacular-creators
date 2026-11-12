"use client";
import { selectClass } from "./bits";
import { formatFull, formatNumber, formatPercent } from "@/lib/format";
import {
  agreementMonths,
  attention,
  countedEngagements,
  countedViews,
  FORMAT_LABEL,
  METRICS,
  monthName,
  monthOf,
  monthStats,
  paceVerdict,
  purposeLabel,
  type DialectProject,
  type Metric,
  type MonthStats,
} from "@/lib/dialect";
import { buttonClass, Card, cx, SectionHeader } from "../ui";
import { AttentionList, type UpdatePost } from "./attention-list";
import { PlatformTag, TargetBar, VerdictText } from "./bits";
import { PaceChart } from "./pace-chart";
import { PostsTable } from "./posts-table";

/** A: the agreement's months on top · B: a column per platform · C: the pace chart leads. */
export type MonthLayout = "timeline" | "platforms" | "pace";
export const MONTH_LAYOUTS: { id: MonthLayout; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "platforms", label: "Platforms" },
  { id: "pace", label: "Pace chart" },
];

interface Props {
  p: DialectProject;
  layout: MonthLayout;
  month: string;
  months: string[];
  setMonth: (m: string) => void;
  today: string;
  update: UpdatePost;
  showAllPosts: () => void;
}

export function MonthView(props: Props) {
  const { p, month, today, layout } = props;
  const s = monthStats(p, month, today);
  const t = p.monthTargets[month];
  const current = s.day > 0 && s.day < s.days;
  const pace = current ? s.day / s.days : null;
  const ctx = { ...props, s, t, current, pace };
  return (
    <div className="space-y-4">
      {layout === "timeline" && <Timeline {...ctx} />}
      {layout === "platforms" && <Platforms {...ctx} />}
      {layout === "pace" && <Pace {...ctx} />}
    </div>
  );
}

type Ctx = Props & { s: MonthStats; t: DialectProject["monthTargets"][string]; current: boolean; pace: number | null };

/* ---------- A: Timeline ---------- */

function Timeline(c: Ctx) {
  const { p, s, t, pace, today, month, setMonth } = c;
  const all = agreementMonths(p);
  const soFar = all.filter((m) => m <= monthOf(today)).map((m) => monthStats(p, m, today));
  const sum = (k: Metric) => soFar.reduce((a, x) => a + x[k], 0);
  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 sm:grid-cols-6" role="tablist" aria-label="Agreement months">
          {all.map((m) => {
            const st = m <= monthOf(today) ? monthStats(p, m, today) : null;
            const share = st ? st.views / p.monthTargets[m].views : 0;
            const done = st && st.day >= st.days;
            const active = m === month;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                disabled={!st}
                onClick={() => setMonth(m)}
                className={cx(
                  "border-b border-r border-line p-3 text-left transition-colors duration-150 last:border-r-0 disabled:cursor-default sm:border-b-0",
                  active ? "bg-accent-soft" : st ? "hover:bg-surface-2" : "",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cx("text-[13px] font-semibold", !st && "text-muted")}>{monthName(m, "short")}</span>
                  <span className={cx("text-xs", !st ? "text-muted" : done ? (share >= 1 ? "text-good" : "text-bad") : "text-ink-2")}>
                    {!st ? "Not started" : done ? (share >= 1 ? "Met" : "Missed") : "In progress"}
                  </span>
                </span>
                <span className="mt-2 block h-1.5 rounded-full bg-line">
                  <span
                    className={cx("block h-full rounded-full", share >= 1 ? "bg-brand" : "bg-accent")}
                    style={{ width: `${Math.min(100, share * 100)}%` }}
                  />
                </span>
                <span className="mt-1.5 block text-xs tabular-nums text-muted">
                  {st ? `${Math.round(share * 100)}% of views target` : formatNumber(p.monthTargets[m].views) + " target"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
      <p className="-mt-1 text-xs tabular-nums text-muted">
        Agreement so far: {formatNumber(sum("views"))} of {formatNumber(p.totals.views)} views ({Math.round((sum("views") / p.totals.views) * 100)}%) ·{" "}
        {formatFull(sum("followers"))} of {formatFull(p.totals.followers)} new followers · {sum("posts")} of {p.totals.posts} posts
      </p>
      <Card className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line lg:[&>*:nth-child(-n+2)]:border-b-0">
        {METRICS.map((m) => (
          <TargetCell key={m.id} label={m.label} done={s[m.id as Metric]} goal={t[m.id as Metric]} s={s} pace={pace} />
        ))}
      </Card>
      <HeldBackNote c={c} />
      <PostsAndAttention c={c} />
    </>
  );
}

/* ---------- B: Platforms ---------- */

function Platforms(c: Ctx) {
  const { p, s, t, month } = c;
  const v = paceVerdict(s.views, t.views, s.day, s.days);
  const posts = p.posts.filter((x) => monthOf(x.postedAt) === month);
  return (
    <>
      <Card className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {monthName(month)}: {formatFull(s.views)} of {formatFull(t.views)} organic views
            </h2>
            <span>
              <VerdictText v={v} />
              {c.current && (
                <span className="text-xs text-muted">
                  {" "}
                  · day {s.day} of {s.days}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2">
            <TargetBar done={s.views} target={t.views} pace={c.pace} />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] tabular-nums">
          {METRICS.filter((m) => m.id !== "views").map((m) => {
            const done = s[m.id as Metric];
            const goal = t[m.id as Metric];
            const tone = paceVerdict(done, goal, s.day, s.days).tone;
            return (
              <span key={m.id}>
                <span className="text-muted">{m.label} </span>
                <b className={cx("font-semibold", tone === "warn" && "text-warn", tone === "bad" && "text-bad")}>{formatFull(done)}</b>
                <span className="text-muted">/{formatFull(goal)}</span>
              </span>
            );
          })}
        </div>
        <MonthSelect c={c} />
      </Card>
      <HeldBackNote c={c} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {p.platforms.map(({ platform, handle }) => {
          const xs = posts.filter((x) => x.platform === platform);
          const views = xs.reduce((a, x) => a + countedViews(x), 0);
          // Engagement rate only over posts whose views are known (carousels without views would inflate it).
          const eng = xs.filter((x) => countedViews(x) > 0).reduce((a, x) => a + countedEngagements(x), 0);
          return (
            <Card key={platform} className="p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">
                  <PlatformTag platform={platform} />
                </span>
                <span className="text-xs text-muted">
                  @{handle} · {xs.length} {xs.length === 1 ? "post" : "posts"}
                </span>
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">{formatFull(views)}</p>
              <p className="text-xs text-muted">views this month</p>
              <p className="mt-2 text-[13px] tabular-nums">
                <b className="font-semibold">{views ? formatPercent(eng / views) : "—"}</b> <span className="text-muted">ER by views</span>
                <span className="mx-2 text-line-strong">|</span>
                <b className="font-semibold">
                  {xs.some((x) => countedViews(x) > 0) ? formatNumber(views / xs.filter((x) => countedViews(x) > 0).length) : "—"}
                </b>{" "}
                <span className="text-muted">avg per post</span>
              </p>
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {[...xs]
                  .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
                  .slice(0, 4)
                  .map((x) => (
                    <li key={x.id} className="py-2">
                      <a href={x.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium hover:underline">
                        {x.title}
                      </a>
                      <p className="text-xs text-muted">
                        {FORMAT_LABEL[x.format]} · {x.contentType ?? "no type"} · {x.purpose ? purposeLabel(x.purpose) : "no purpose"} ·{" "}
                        {x.possibleAd && !x.decision ? (
                          <span className="text-bad">possible ad</span>
                        ) : x.views === null ? (
                          <span className="text-warn">add views</span>
                        ) : (
                          `${formatNumber(countedViews(x))} views`
                        )}
                      </p>
                    </li>
                  ))}
              </ul>
            </Card>
          );
        })}
      </div>
      <AttentionCard c={c} />
    </>
  );
}

/* ---------- C: Pace chart ---------- */

function Pace(c: Ctx) {
  const { s, t, month, pace } = c;
  const v = paceVerdict(s.views, t.views, s.day, s.days);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Organic views, {monthName(month)}</h2>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold tabular-nums tracking-tight">{formatFull(s.views)}</span>
                <span className="text-[13px] text-muted">of {formatFull(t.views)}</span>
                <VerdictText v={v} />
                {c.current && (
                  <span className="text-xs text-muted">
                    · day {s.day} of {s.days}
                  </span>
                )}
              </p>
            </div>
            <MonthSelect c={c} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-accent" /> Views so far
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-[1.5px] border-dashed border-ink" /> On pace to {formatNumber(t.views)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-1.5 rounded-sm bg-line-strong" /> Posts per day
            </span>
          </div>
          <HeldBackNote c={c} inline />
          <div className="mt-3">
            <PaceChart s={s} target={t.views} />
          </div>
        </Card>
        <Card className="divide-y divide-line">
          {METRICS.filter((m) => m.id !== "views").map((m) => (
            <TargetCell key={m.id} label={m.label} done={s[m.id as Metric]} goal={t[m.id as Metric]} s={s} pace={pace} />
          ))}
          <AgreementSoFar c={c} />
        </Card>
      </div>
      <PostsAndAttention c={c} />
    </>
  );
}

/* ---------- Shared pieces ---------- */

function TargetCell({ label, done, goal, s, pace }: { label: string; done: number; goal: number; s: MonthStats; pace: number | null }) {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        <span className="text-xs tabular-nums text-muted">target {formatFull(goal)}</span>
      </div>
      <p className="mb-2 mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{formatFull(done)}</p>
      <TargetBar done={done} target={goal} pace={pace} />
      <VerdictText className="mt-1.5 block" v={paceVerdict(done, goal, s.day, s.days)} />
    </div>
  );
}

function AgreementSoFar({ c }: { c: Ctx }) {
  const all = agreementMonths(c.p);
  const soFar = all.filter((m) => m <= monthOf(c.today)).map((m) => monthStats(c.p, m, c.today));
  const views = soFar.reduce((a, x) => a + x.views, 0);
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-2">Agreement so far</span>
        <span className="text-xs tabular-nums text-muted">
          month {soFar.length} of {all.length}
        </span>
      </div>
      <p className="mb-2 mt-0.5 text-[13px] tabular-nums">
        <b className="text-xl font-semibold tracking-tight">{formatNumber(views)}</b>{" "}
        <span className="text-muted">of {formatNumber(c.p.totals.views)} views</span>
      </p>
      <TargetBar done={views} target={c.p.totals.views} pace={soFar.length / all.length} />
    </div>
  );
}

function MonthSelect({ c }: { c: Ctx }) {
  return (
    <select className={selectClass} value={c.month} onChange={(e) => c.setMonth(e.target.value)} aria-label="Month">
      {c.months.map((m) => (
        <option key={m} value={m}>
          {monthName(m)} {m.slice(0, 4)}
        </option>
      ))}
    </select>
  );
}

function HeldBackNote({ c, inline }: { c: Ctx; inline?: boolean }) {
  const missing = attention(c.p, c.month).filter((i) => i.kind === "numbers").length;
  if (!c.s.heldBack.length && !missing) return null;
  return (
    <p className={cx("rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2 ring-1 ring-line", inline && "mt-3")}>
      Not counted yet:{" "}
      {[
        c.s.heldBack.length
          ? `${c.s.heldBack.length} possible ad (${formatNumber(c.s.heldBack.reduce((a, x) => a + (x.views ?? 0), 0))} views) waiting for a decision`
          : "",
        missing ? `${missing} posts with no views yet (carousels)` : "",
      ]
        .filter(Boolean)
        .join(" and ")}
      .{" "}
      <a href="#needs-attention" className="font-medium text-ink underline underline-offset-2">
        Clear them
      </a>
    </p>
  );
}

function AttentionCard({ c }: { c: Ctx }) {
  const items = attention(c.p, c.month);
  return (
    <Card className="p-4 sm:p-5" id="needs-attention">
      <SectionHeader title={`Needs attention · ${items.length}`} description="Clear these before the report on the 1st." />
      <div className="mt-3">
        <AttentionList items={items} contentTypes={c.p.contentTypes} update={c.update} />
      </div>
    </Card>
  );
}

function PostsAndAttention({ c }: { c: Ctx }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <div className="p-4 pb-3 sm:px-5">
          <SectionHeader
            title={`${monthName(c.month)} posts`}
            action={
              <button className={buttonClass.ghost} onClick={c.showAllPosts}>
                All posts
              </button>
            }
          />
        </div>
        <PostsTable p={c.p} months={[c.month]} limit={8} />
      </Card>
      <AttentionCard c={c} />
    </div>
  );
}
