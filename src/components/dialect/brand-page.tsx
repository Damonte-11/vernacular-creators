"use client";
import Link from "next/link";
import { selectClass } from "./bits";
import { useEffect, useState } from "react";
import { formatFull } from "@/lib/format";
import { agreementMonths, attention, METRICS, monthName, monthOf, platformLabel, type DialectPost, type DialectProject, type Metric } from "@/lib/dialect";
import { SAMPLE_LISTENING } from "@/lib/dialect-sample";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass, labelClass, SectionHeader, tabClass, tabCountClass, tabListClass } from "../ui";
import { Segmented } from "./bits";
import { LogPost } from "./log-post";
import { MONTH_LAYOUTS, MonthView, type MonthLayout } from "./month-view";
import { PostsTable } from "./posts-table";
import { ReportSlides } from "./report-slides";

type Tab = "month" | "posts" | "report" | "settings";
const LAYOUT_KEY = "dialect:layout";

/** A Dialect project: one brand's pages, month by month, against the agreement's targets. */
export function BrandPage({ initial, today }: { initial: DialectProject; today: string }) {
  const [p, setP] = useState(initial);
  const [tab, setTab] = useState<Tab>("month");
  const [logging, setLogging] = useState(false);
  const [layout, setLayout] = useState<MonthLayout>("timeline");
  const months = agreementMonths(p).filter((m) => m <= monthOf(today));
  const [month, setMonth] = useState(monthOf(today));
  const reportMonths = months.filter((m) => m < monthOf(today));
  const [reportMonth, setReportMonth] = useState(reportMonths.at(-1) ?? months[0]);

  // Each person's layout choice stays in their own browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY) as MonthLayout | null;
      if (saved && MONTH_LAYOUTS.some((l) => l.id === saved)) setLayout(saved);
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);
  function chooseLayout(l: MonthLayout) {
    setLayout(l);
    try {
      localStorage.setItem(LAYOUT_KEY, l);
    } catch {
      // Not saved; fine for this visit.
    }
  }

  const update = (id: string, patch: Partial<DialectPost>) => setP((x) => ({ ...x, posts: x.posts.map((y) => (y.id === id ? { ...y, ...patch } : y)) }));
  const open = attention(p, monthOf(today)).length;
  const monthIndex = agreementMonths(p).indexOf(monthOf(today)) + 1;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "month", label: monthName(month) },
    { id: "posts", label: "Posts", count: p.posts.length },
    { id: "report", label: "Monthly report" },
    { id: "settings", label: "Targets and settings" },
  ];

  return (
    <div>
      <Link href="/projects" className="no-print inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <Icon name="back" size={13} /> Projects
      </Link>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-7 tracking-tight">{p.brand}</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Dialect · {p.platforms.map((x) => platformLabel(x.platform)).join(", ")} · Agreement {monthName(p.startMonth, "short")} {p.startMonth.slice(0, 4)} –{" "}
            {monthName(agreementMonths(p).at(-1)!, "short")} {agreementMonths(p).at(-1)!.slice(0, 4)} · month {monthIndex} of {p.months}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className={buttonClass.secondary}
            onClick={() => {
              setTab("month");
              setMonth(monthOf(today));
              setTimeout(() => document.getElementById("needs-attention")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}
          >
            Needs attention
            {open > 0 && <span className="rounded bg-bad-soft px-1.5 text-xs tabular-nums text-bad">{open}</span>}
          </button>
          <button className={buttonClass.primary} onClick={() => setLogging((v) => !v)} aria-expanded={logging}>
            <Icon name="plus" size={15} /> Log a post
          </button>
        </div>
      </div>

      {logging && (
        <div className="mt-4">
          <LogPost
            contentTypes={p.contentTypes}
            today={today}
            onClose={() => setLogging(false)}
            onLog={(x) => setP((y) => ({ ...y, posts: [...y.posts, x] }))}
          />
        </div>
      )}

      <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <div className={cx(tabListClass, "border-b-0")} role="tablist" aria-label="Project sections">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={tabClass(tab === t.id)}>
              {t.label}
              {t.count !== undefined && <span className={tabCountClass}>{t.count}</span>}
            </button>
          ))}
        </div>
        {tab === "month" && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-muted">Layout</span>
            <Segmented label="Layout" value={layout} options={MONTH_LAYOUTS} onChange={chooseLayout} />
          </div>
        )}
      </div>

      <div key={tab} className="fade-enter">
        {tab === "month" && (
          <MonthView
            p={p}
            layout={layout}
            month={month}
            months={months}
            setMonth={setMonth}
            today={today}
            update={update}
            showAllPosts={() => setTab("posts")}
          />
        )}
        {tab === "posts" && (
          <Card className="overflow-hidden">
            <PostsTable p={p} months={months} update={update} />
          </Card>
        )}
        {tab === "report" && <ReportTab p={p} months={reportMonths} month={reportMonth} setMonth={setReportMonth} />}
        {tab === "settings" && <SettingsTab p={p} setP={setP} />}
      </div>
    </div>
  );
}

function ReportTab({ p, months, month, setMonth }: { p: DialectProject; months: string[]; month: string; setMonth: (m: string) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const boosted = p.posts.filter((x) => monthOf(x.postedAt) === month && x.decision === "manual").length;
  return (
    <div className="space-y-4">
      <Card className="no-print flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <select className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Report month">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)} {m.slice(0, 4)} report
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Made on 1 {monthName(addOne(month))}, 06:10, after the final numbers update · AI read the numbers, watched the videos and looked at the carousels,
            read the comments, mentions, competitors and news{boosted ? ` · ${boosted} boosted post counted at organic numbers only` : ""}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className={buttonClass.secondary}
            onClick={() => setNote("The live app makes the report again from the latest numbers; your Google Slides edits are kept in the old deck.")}
          >
            Make it again
          </button>
          <button
            className={buttonClass.primary}
            onClick={() =>
              setNote(
                "Design preview: in the live app this opens the editable Google Slides deck. Edit it there, then File → Download → PDF to send to the client.",
              )
            }
          >
            <Icon name="link" size={14} /> Open in Google Slides
          </button>
        </div>
      </Card>
      {note && (
        <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
          {note}
        </p>
      )}
      <div className="mx-auto max-w-5xl">
        <ReportSlides p={p} month={month} listening={SAMPLE_LISTENING} />
      </div>
    </div>
  );
}

const addOne = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
};

function SettingsTab({ p, setP }: { p: DialectProject; setP: (f: (x: DialectProject) => DialectProject) => void }) {
  const months = agreementMonths(p);
  const setTarget = (m: string, k: Metric, v: number) => setP((x) => ({ ...x, monthTargets: { ...x.monthTargets, [m]: { ...x.monthTargets[m], [k]: v } } }));
  const sums = Object.fromEntries(METRICS.map((m) => [m.id, months.reduce((a, x) => a + p.monthTargets[x][m.id as Metric], 0)])) as Record<Metric, number>;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="p-4 pb-3 sm:px-5">
          <SectionHeader
            title="Targets by month"
            description={`The agreement's totals split evenly over ${p.months} months. Change a month if it's meant to be bigger or smaller; the totals row shows if they still add up.`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-4 pr-3 font-medium sm:pl-5">Month</th>
                {METRICS.map((m) => (
                  <th key={m.id} className="px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {months.map((m) => (
                <tr key={m}>
                  <td className="py-1.5 pl-4 pr-3 font-medium sm:pl-5">
                    {monthName(m)} {m.slice(0, 4)}
                  </td>
                  {METRICS.map((k) => (
                    <td key={k.id} className="px-3 py-1.5 text-right">
                      <input
                        className={cx(selectClass, "ml-auto w-28 py-1 text-right tabular-nums")}
                        inputMode="numeric"
                        value={formatFull(p.monthTargets[m][k.id as Metric])}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/[^\d]/g, ""));
                          if (Number.isFinite(n)) setTarget(m, k.id as Metric, n);
                        }}
                        aria-label={`${k.label}, ${monthName(m)}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-surface-2 font-medium">
                <td className="py-2 pl-4 pr-3 sm:pl-5">Agreement total</td>
                {METRICS.map((k) => {
                  const off = sums[k.id] !== p.totals[k.id as Metric];
                  return (
                    <td key={k.id} className={cx("px-3 py-2 text-right tabular-nums", off && "text-warn")}>
                      {formatFull(sums[k.id])}
                      {off && <span className="block text-xs font-normal">agreed {formatFull(p.totals[k.id as Metric])}</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionHeader title="Possible ads" description="Posts above either line are held back from the totals until someone decides." />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>Views over</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={formatFull(p.adRule.views)}
                onChange={(e) => setP((x) => ({ ...x, adRule: { ...x.adRule, views: Number(e.target.value.replace(/[^\d]/g, "")) || 0 } }))}
              />
            </label>
            <label>
              <span className={labelClass}>Or this many times the usual</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={p.adRule.timesUsual}
                onChange={(e) => setP((x) => ({ ...x, adRule: { ...x.adRule, timesUsual: Number(e.target.value) || 0 } }))}
              />
            </label>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="What the AI checks each month"
            description="Mentions of the brand on X, TikTok and Instagram, the competitors below, and Nigerian news."
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>Competitors</span>
              <input
                className={inputClass}
                value={p.competitors.join(", ")}
                onChange={(e) => setP((x) => ({ ...x, competitors: e.target.value.split(",").map((y) => y.trim()) }))}
              />
            </label>
            <label>
              <span className={labelClass}>Apify spend cap a month (US$)</span>
              <input
                className={inputClass}
                inputMode="decimal"
                value={p.listeningCapUsd}
                onChange={(e) => setP((x) => ({ ...x, listeningCapUsd: Number(e.target.value) || 0 }))}
              />
            </label>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <SectionHeader title="Content types" description="The choices when a post is logged. Rename or add the ones this brand uses." />
          <input
            className={cx(inputClass, "mt-3")}
            value={p.contentTypes.join(", ")}
            onChange={(e) => setP((x) => ({ ...x, contentTypes: e.target.value.split(",").map((y) => y.trim()) }))}
          />
          <p className="mt-1 text-xs text-muted">Separate with commas. Purpose is always one of differentiation, safety or trend.</p>
        </Card>
      </div>
    </div>
  );
}
