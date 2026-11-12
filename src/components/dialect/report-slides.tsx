"use client";
import type { CSSProperties, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatFull, formatNumber, formatPercent } from "@/lib/format";
import {
  agreementMonths,
  countedEngagements,
  countedViews,
  counts,
  FORMAT_LABEL,
  METRICS,
  monthName,
  monthOf,
  monthStats,
  platformLabel,
  purposeLabel,
  PURPOSES,
  slotOf,
  type DialectPost,
  type DialectProject,
  type Metric,
} from "@/lib/dialect";
import type { SAMPLE_LISTENING } from "@/lib/dialect-sample";
import { cx } from "../ui";

/* The deck's own colours: Vernacular's dark and cream pages with the orange accent. */
const INK = "#171715";
const ORANGE = "#f75115";
const GREY = "#b9b3a4";
const AXIS = { fontSize: 11, fill: "#6c6a62" };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const change = (now: number, before: number) => {
  if (!before) return "";
  const c = Math.round(((now - before) / before) * 100);
  return c >= 0 ? `up ${c}%` : `down ${-c}%`;
};

/** Every page of the monthly report, as the 16:9 slides that go into the Google Slides deck. */
export function ReportSlides({ p, month, listening }: { p: DialectProject; month: string; listening: typeof SAMPLE_LISTENING }) {
  const months = agreementMonths(p);
  const idx = months.indexOf(month);
  const prev = months[idx - 1] ?? null;
  const end = `${month}-${String(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).getUTCDate())}`;
  const s = monthStats(p, month, end);
  const b = prev ? monthStats(p, prev, end) : null;
  const t = p.monthTargets[month];
  const name = monthName(month);
  const posts = p.posts.filter((x) => monthOf(x.postedAt) === month && counts(x) && countedViews(x) > 0);
  const footer = (section: string) => `Vernacular · ${p.brand} · ${name} ${month.slice(0, 4)} · ${section}`;

  const beat = METRICS.filter((m) => s[m.id as Metric] >= t[m.id as Metric]).length;
  const soFar = months.slice(0, idx + 1).map((m) => ({ m, s: monthStats(p, m, end) }));
  const agreementViews = soFar.reduce((a, x) => a + x.s.views, 0);
  const agreementFollowers = soFar.reduce((a, x) => a + x.s.followers, 0);

  const platforms = p.platforms.map(({ platform }) => {
    const xs = posts.filter((x) => x.platform === platform);
    const v = xs.reduce((a, x) => a + countedViews(x), 0);
    const e = xs.reduce((a, x) => a + countedEngagements(x), 0);
    return { platform, label: platformLabel(platform), views: v, posts: xs.length, avg: xs.length ? v / xs.length : 0, er: v ? e / v : 0 };
  });
  const top = [...posts].sort((a, c) => countedViews(c) - countedViews(a)).slice(0, 7);
  const pageAvg = avg(posts.filter((x) => x.platform !== "x").map(countedViews));
  const byType = p.contentTypes
    .map((type) => ({
      type,
      avg: avg(posts.filter((x) => x.contentType === type && x.platform !== "x").map(countedViews)),
      n: posts.filter((x) => x.contentType === type).length,
    }))
    .filter((x) => x.n)
    .sort((a, c) => c.avg - a.avg);
  const byPurpose = PURPOSES.map((o) => ({ purpose: o.label, avg: avg(posts.filter((x) => x.purpose === o.id && x.platform !== "x").map(countedViews)) }));
  const bySlot = (["Morning", "Midday", "Evening", "Night"] as const).map((slot) => ({
    slot,
    avg: avg(posts.filter((x) => slotOf(x.postedAt) === slot && x.platform !== "x").map(countedViews)),
  }));
  const bestSlot = [...bySlot].sort((a, c) => c.avg - a.avg)[0];
  const daily = Array.from({ length: s.days }, (_, i) => ({ day: i + 1, now: s.cumulative[i]?.views, before: b?.cumulative[i]?.views }));
  const likes = posts.reduce((a, x) => a + (x.likes ?? 0), 0);
  const comments = posts.reduce((a, x) => a + (x.comments ?? 0), 0);
  const commitments = p.commitments[month] ?? [];
  const next = p.commitments[months[idx + 1] ?? ""] ?? [];
  const boosted = p.posts.filter((x) => monthOf(x.postedAt) === month && x.decision === "manual");

  let n = 0;
  const page = () => String(++n).padStart(2, "0");

  return (
    <div className="space-y-5">
      {/* 1 Cover */}
      <Slide dark page={page()} footer={null}>
        <div className="flex h-full flex-col justify-between">
          <p className="text-[1.6cqw] text-white/80">Social media report</p>
          <div>
            <h2 className="text-[7.5cqw] font-bold leading-[1] tracking-[-0.03em] text-white">{p.brand}</h2>
            <p className="mt-[1.2cqw] text-[2.4cqw] text-[#f75115]">
              How {name} went on{" "}
              {p.platforms
                .map((x) => platformLabel(x.platform))
                .join(", ")
                .replace(/, ([^,]*)$/, " and $1")}
            </p>
          </div>
          <p className="text-[1.3cqw] text-white/70">
            Prepared by Vernacular · 1st to {s.days}st {name} {month.slice(0, 4)}
          </p>
        </div>
        <span className="absolute right-0 top-0 h-[18%] w-[10.5%] bg-[#f75115]" />
        <span className="absolute right-[10.5%] top-[18%] h-[18%] w-[10.5%] bg-[#f2eee3]" />
      </Slide>

      {/* 2 At a glance */}
      <Slide page={page()} footer={footer(`At a glance${boosted.length ? ` · views exclude ${boosted.length} boosted post at organic numbers only` : ""}`)}>
        <Headline>We beat {["none", "one", "two", "three", "all four"][beat]} of our four targets</Headline>
        <div className="mt-[2.5cqw] grid grid-cols-4 gap-[1.6cqw]">
          {METRICS.map((m, i) => {
            const done = s[m.id as Metric];
            const goal = t[m.id as Metric];
            const share = pct(done, goal);
            const series = soFar.map((x) => ({ m: monthName(x.m, "short"), v: x.s[m.id as Metric] }));
            const dark = i === 2;
            return (
              <div key={m.id} className={cx("flex flex-col rounded-[1.6cqw] p-[2cqw]", dark ? "bg-[#171715] text-white" : "bg-white")}>
                <p className="text-[1.6cqw] font-semibold">{m.label}</p>
                <p className={cx("text-[1.15cqw]", dark ? "text-white/70" : "text-[#6c6a62]")}>Target {formatFull(goal)}</p>
                <p className={cx("mt-[1.4cqw] text-[3.8cqw] font-bold leading-none tracking-[-0.02em] tabular-nums", dark && share >= 100 && "text-[#f75115]")}>
                  {formatFull(done)}
                </p>
                <div className="mt-[1cqw] h-[7cqw]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 14, right: 0, bottom: 0, left: 0 }}>
                      <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: dark ? "#ffffffa0" : "#6c6a62" }} />
                      <YAxis hide domain={[0, "dataMax"]} />
                      <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        <LabelList
                          dataKey="v"
                          position="top"
                          fontSize={10}
                          fill={dark ? "#ffffffc0" : "#45443f"}
                          formatter={(v: unknown) => formatNumber(Number(v))}
                        />
                        {series.map((_, k) => (
                          <Cell key={k} fill={k === series.length - 1 ? ORANGE : dark ? "#ffffff40" : GREY} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={cx("mt-[1cqw] h-[0.9cqw] rounded-full", dark ? "bg-white/20" : "bg-[#e3ddcf]")}>
                  <div className="h-full rounded-full bg-[#f75115]" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
                <p className="mt-[0.8cqw] text-[1.2cqw] font-semibold">
                  {share >= 100 ? "Ahead" : share >= 90 ? "Just short" : "Behind"}: {share}% of target
                </p>
              </div>
            );
          })}
        </div>
      </Slide>

      {/* 3 Project so far */}
      <Slide page={page()} footer={footer(`Project so far · ${monthName(months[0], "short")}–${monthName(months.at(-1)!, "short")} · organic views only`)}>
        <Headline>
          {pct(agreementFollowers, p.totals.followers) >= pct(idx + 1, p.months) ? "Followers on track" : "Followers behind"}, views at{" "}
          {pct(agreementViews, p.totals.views)}% of the agreement
        </Headline>
        <div className="mt-[2cqw] grid grid-cols-[1fr_1.4fr] gap-[2cqw]">
          <div className="space-y-[1.4cqw]">
            {[
              [formatFull(agreementViews), `views, ${pct(agreementViews, p.totals.views)}% of ${formatFull(p.totals.views)}`],
              [formatFull(agreementFollowers), `new followers, ${pct(agreementFollowers, p.totals.followers)}% of ${formatFull(p.totals.followers)}`],
              [`${idx + 1} of ${p.months}`, "months of the agreement done"],
            ].map(([big, small]) => (
              <div key={small} className="rounded-[1.4cqw] bg-white px-[2cqw] py-[1.4cqw]">
                <p className="text-[3.4cqw] font-bold leading-none tracking-[-0.02em] tabular-nums">{big}</p>
                <p className="mt-[0.5cqw] text-[1.3cqw] text-[#45443f]">{small}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.4cqw] bg-white p-[1.6cqw]">
            <p className="text-[1.3cqw] font-semibold">Views each month against its target</p>
            <div className="mt-[0.6cqw] h-[22cqw]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months.map((m) => ({
                    m: monthName(m, "short"),
                    views: soFar.find((x) => x.m === m)?.s.views ?? null,
                    target: p.monthTargets[m].views,
                  }))}
                  margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#ece7db" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={AXIS} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip formatter={(v) => formatFull(Number(v))} cursor={{ fill: "#f8f6f1" }} />
                  <Bar dataKey="target" name="Target" fill="#e3ddcf" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="views" name="Views" fill={ORANGE} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="views" position="top" fontSize={10} fill={INK} formatter={(v: unknown) => (v ? formatNumber(Number(v)) : "")} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend
              items={[
                ["Views", ORANGE],
                ["Target", "#e3ddcf"],
              ]}
            />
          </div>
        </div>
      </Slide>

      {/* 4 Our numbers */}
      <Slide page={page()} footer={footer(prev ? `Changes are against ${monthName(prev)}` : "Our numbers")}>
        <Headline>
          {s.views >= t.views ? "We beat the views target" : "Views came in under target"}
          {b ? `, ${change(s.views, b.views)} on ${monthName(prev!)}` : ""}
        </Headline>
        <div className="mt-[2cqw] grid grid-cols-[1fr_1.6fr] gap-[2cqw]">
          <div className="space-y-[1.2cqw]">
            {[
              [formatFull(s.views), `organic views${b ? `, ${change(s.views, b.views)}` : ""}`],
              [`+${formatFull(s.followers)}`, `new followers${b ? `, ${change(s.followers, b.followers)}` : ""}`],
              [formatFull(s.engagements), `engagements${b ? `, ${change(s.engagements, b.engagements)}` : ""}`],
            ].map(([big, small]) => (
              <div key={small} className="rounded-[1.4cqw] bg-white px-[2cqw] py-[1.2cqw]">
                <p className="text-[3.2cqw] font-bold leading-none tracking-[-0.02em] tabular-nums">{big}</p>
                <p className="mt-[0.5cqw] text-[1.3cqw] text-[#45443f]">{small}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.4cqw] bg-white p-[1.6cqw]">
            <p className="text-[1.3cqw] font-semibold">Views through the month{prev ? `, ${name} against ${monthName(prev)}` : ""}</p>
            <div className="mt-[0.6cqw] h-[22cqw]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 10, right: 56, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#ece7db" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip formatter={(v) => formatFull(Number(v))} labelFormatter={(d) => `Day ${d}`} />
                  {b && <Line dataKey="before" name={monthName(prev!)} stroke={GREY} strokeWidth={2} dot={false} isAnimationActive={false} />}
                  <Line dataKey="now" name={name} stroke={ORANGE} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <ReferenceLine y={t.views} stroke={INK} strokeDasharray="4 4" label={{ value: "target", position: "right", fontSize: 10, fill: INK }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[[name, ORANGE], ...(b ? ([[monthName(prev!), GREY]] as [string, string][]) : []), ["Target", INK]]} />
          </div>
        </div>
      </Slide>

      {/* 5 Platforms */}
      <Slide page={page()} footer={footer("Feed posts only · engagement rate is on views")}>
        <Headline>
          {[...platforms].sort((a, c) => c.views - a.views)[0].label} brings the views, {[...platforms].sort((a, c) => c.er - a.er)[0].label} the engagement
        </Headline>
        <div className="mt-[2cqw] grid gap-[1.6cqw]" style={{ gridTemplateColumns: `repeat(${platforms.length}, 1fr)` } as CSSProperties}>
          {platforms.map((x, i) => (
            <div key={x.platform} className={cx("rounded-[1.6cqw] p-[2cqw]", i === 0 ? "bg-[#171715] text-white" : "bg-white")}>
              <p className={cx("text-[1.7cqw] font-semibold", i === 0 && "text-[#f75115]")}>{x.label}</p>
              <p className="mt-[0.6cqw] text-[3.8cqw] font-bold leading-none tracking-[-0.02em] tabular-nums">{formatFull(x.views)}</p>
              <p className={cx("mt-[0.4cqw] text-[1.25cqw]", i === 0 ? "text-white/70" : "text-[#6c6a62]")}>views from {x.posts} posts</p>
              <div className={cx("mt-[1.2cqw] h-[0.9cqw] rounded-full", i === 0 ? "bg-white/20" : "bg-[#e3ddcf]")}>
                <div className="h-full rounded-full bg-[#f75115]" style={{ width: `${pct(x.views, Math.max(...platforms.map((y) => y.views)))}%` }} />
              </div>
              <dl className="mt-[1.2cqw] divide-y divide-current/15 text-[1.3cqw]">
                {[
                  ["Average views per post", formatFull(Math.round(x.avg))],
                  ["Engagement rate", formatPercent(x.er)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-[0.8cqw]">
                    <dt className={i === 0 ? "text-white/75" : "text-[#45443f]"}>{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Slide>

      {/* 6 Top posts */}
      <Slide page={page()} footer={footer("Post titles link to the posts · organic views")}>
        <Headline>&ldquo;{top[0].title}&rdquo; led the month</Headline>
        <div className="mt-[1.8cqw] rounded-[1.4cqw] bg-white px-[2cqw] py-[1cqw]">
          <table className="w-full text-[1.3cqw]">
            <thead className="text-left text-[#6c6a62]">
              <tr>
                <th className="py-[0.6cqw] font-semibold">Post</th>
                <th className="font-semibold">Platform</th>
                <th className="font-semibold">Type · purpose</th>
                <th className="w-[26%] text-right font-semibold">Views</th>
              </tr>
            </thead>
            <tbody>
              {top.map((x) => (
                <tr key={x.id} className="border-t border-[#e3ddcf]">
                  <td className="py-[0.7cqw]">
                    <a href={x.url} target="_blank" rel="noreferrer" className="text-[#0249b3] underline underline-offset-2">
                      {x.title}
                    </a>{" "}
                    <span className="text-[#6c6a62]">· {FORMAT_LABEL[x.format]}</span>
                  </td>
                  <td>{platformLabel(x.platform)}</td>
                  <td className="text-[#45443f]">
                    {x.contentType} · {x.purpose && purposeLabel(x.purpose)}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-[0.8cqw]">
                      <span className="h-[0.8cqw] rounded-full bg-[#f75115]" style={{ width: `${pct(countedViews(x), countedViews(top[0])) * 0.14}cqw` }} />
                      <span className="w-[6cqw] text-right font-semibold tabular-nums">{formatFull(countedViews(x))}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Slide>

      {/* 7 Commitments */}
      {commitments.length > 0 && (
        <Slide page={page()} footer={footer(`${name} commitments`)}>
          <Headline>
            We kept {commitments.filter((c) => c.status === "done").length} of our {commitments.length} {name} commitments
          </Headline>
          <div className="mt-[1.8cqw] rounded-[1.4cqw] bg-white px-[2cqw] py-[1cqw]">
            <table className="w-full text-[1.3cqw]">
              <thead className="text-left text-[#6c6a62]">
                <tr>
                  <th className="w-[36%] py-[0.6cqw] font-semibold">Commitment</th>
                  <th className="font-semibold">{name} result</th>
                  <th className="text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((c) => (
                  <tr key={c.text} className="border-t border-[#e3ddcf]">
                    <td className="py-[1cqw] pr-[1cqw] font-semibold">{c.text}</td>
                    <td className="pr-[1cqw] text-[#45443f]">{c.result}</td>
                    <td className="text-right font-semibold">
                      {{ done: "Done", on_track: "On track", paused: "Paused", missed: "Missed" }[c.status ?? "on_track"]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Slide>
      )}

      {/* 8 What worked */}
      <Slide page={page()} footer={footer("Instagram and TikTok · average organic views per post")}>
        <Headline>
          {byType[0].type} and {[...byPurpose].sort((a, c) => c.avg - a.avg)[0].purpose.toLowerCase()} posts did best
        </Headline>
        <div className="mt-[1.8cqw] grid grid-cols-[1.5fr_1fr] gap-[1.6cqw]">
          <ChartCard title="By content type, against the page average">
            <HBars data={byType.map((x) => ({ label: x.type, value: Math.round(x.avg) }))} average={pageAvg} />
          </ChartCard>
          <ChartCard title="By purpose">
            <HBars data={byPurpose.map((x) => ({ label: x.purpose, value: Math.round(x.avg) }))} average={pageAvg} />
          </ChartCard>
        </div>
      </Slide>

      {/* 9 When to post */}
      <Slide page={page()} footer={footer("Instagram and TikTok · time the post went up, Lagos time")}>
        <Headline>{bestSlot.slot} posts did best; mornings held us back</Headline>
        <div className="mt-[1.8cqw] grid grid-cols-[1.5fr_1fr] gap-[1.6cqw]">
          <ChartCard title="Average views per post by time of day">
            <div className="h-[22cqw]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySlot.map((x) => ({ ...x, avg: Math.round(x.avg) }))} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#ece7db" />
                  <XAxis dataKey="slot" tickLine={false} axisLine={false} tick={AXIS} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip formatter={(v) => formatFull(Number(v))} cursor={{ fill: "#f8f6f1" }} />
                  <Bar dataKey="avg" name="Average views" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {bySlot.map((x) => (
                      <Cell key={x.slot} fill={x.slot === bestSlot.slot ? ORANGE : GREY} />
                    ))}
                    <LabelList dataKey="avg" position="top" fontSize={11} fill={INK} formatter={(v: unknown) => formatFull(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <div className="rounded-[1.6cqw] bg-[#171715] p-[2cqw] text-white">
            <p className="text-[1.3cqw] text-[#f75115]">What we&apos;re changing</p>
            <p className="mt-[1cqw] text-[2cqw] font-semibold leading-snug">Fewer posts before noon, more at {bestSlot.slot.toLowerCase()}, our best slot</p>
          </div>
        </div>
      </Slide>

      {/* 10 What happened this month */}
      <Slide page={page()} footer={footer("Mentions on X, TikTok and Instagram, competitors and news · read by the AI")}>
        <Headline>
          {formatFull(listening.mentions)} mentions, {change(listening.mentions, listening.mentionsBefore)};{" "}
          {listening.themes[0].label.charAt(0).toLowerCase() + listening.themes[0].label.slice(1)} led
        </Headline>
        <div className="mt-[1.8cqw] grid grid-cols-[1.3fr_1fr] gap-[1.6cqw]">
          <div className="rounded-[1.4cqw] bg-white p-[1.8cqw]">
            <p className="text-[1.3cqw] font-semibold">How people talked about {p.brand}</p>
            <div className="mt-[1cqw] flex h-[2.2cqw] overflow-hidden rounded-[0.6cqw]">
              {(
                [
                  ["positive", "#068116"],
                  ["neutral", "#d6d0c1"],
                  ["negative", "#b42318"],
                ] as const
              ).map(([k, c]) => (
                <span key={k} style={{ width: `${listening.sentiment[k]}%`, background: c }} className="mr-[2px] last:mr-0" />
              ))}
            </div>
            <p className="mt-[0.6cqw] text-[1.15cqw] text-[#45443f]">
              Positive {listening.sentiment.positive}% · neutral {listening.sentiment.neutral}% · negative {listening.sentiment.negative}%
            </p>
            <ul className="mt-[1.2cqw] space-y-[0.7cqw]">
              {listening.themes.map((x) => (
                <li key={x.label} className="grid grid-cols-[1fr_auto] items-center gap-x-[1cqw] text-[1.25cqw]">
                  <span>{x.label}</span>
                  <span className="font-semibold tabular-nums">{x.count}</span>
                  <span className="col-span-2 h-[0.6cqw] rounded-full bg-[#e3ddcf]">
                    <span className="block h-full rounded-full bg-[#171715]" style={{ width: `${pct(x.count, listening.themes[0].count)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-[1.2cqw]">
            <div className="rounded-[1.4cqw] bg-white p-[1.6cqw] text-[1.25cqw]">
              <p className="font-semibold">The spike</p>
              <p className="mt-[0.4cqw] text-[#45443f]">{listening.spike.label}</p>
            </div>
            <div className="rounded-[1.4cqw] bg-white p-[1.6cqw] text-[1.25cqw]">
              <p className="font-semibold">Competitors</p>
              {listening.competitors.map((c) => (
                <p key={c.name} className="mt-[0.4cqw] text-[#45443f]">
                  <b className="font-semibold text-[#171715]">{c.name}:</b> {c.note}
                </p>
              ))}
            </div>
            <div className="rounded-[1.4cqw] bg-white p-[1.6cqw] text-[1.25cqw]">
              <p className="font-semibold">In the news</p>
              {listening.news.map((x) => (
                <p key={x.title} className="mt-[0.4cqw] text-[#45443f]">
                  {x.title}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* 11 Community */}
      <Slide page={page()} footer={footer("Comments on our own posts")}>
        <Headline>
          We got {formatFull(comments)} comments to {formatFull(likes)} likes
        </Headline>
        <div className="mt-[2cqw] grid grid-cols-2 gap-[1.6cqw]">
          {[
            ["Fair price lands", "Riders quote the set-your-price line back to us, most of all on the skits."],
            ["Drivers and extra charges", "AC and waiting fees are the top complaint under every post type."],
            ["Late-night safety", "Questions after the 15th rose; the driver-check post answered many."],
            ["Support replies", "People take support cases to the comments when in-app chat repeats itself."],
          ].map(([h, body], i) => (
            <div key={h} className="flex gap-[1.6cqw] rounded-[1.4cqw] bg-white p-[1.8cqw]">
              <span className="text-[3.2cqw] font-bold leading-none text-[#f75115]">{i + 1}</span>
              <div>
                <p className="text-[1.6cqw] font-semibold">{h}</p>
                <p className="mt-[0.4cqw] text-[1.25cqw] text-[#45443f]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* 12 Next month */}
      {next.length > 0 && (
        <Slide page={page()} footer={footer(`${monthName(months[idx + 1])} plan`)}>
          <Headline>What we&apos;re trying in {monthName(months[idx + 1])}</Headline>
          <div className="mt-[2cqw] grid grid-cols-3 gap-[1.6cqw]">
            {next.map((c, i) => (
              <div
                key={c.text}
                className={cx("rounded-[1.6cqw] p-[2cqw]", i === 0 ? "bg-[#f75115] text-[#171715]" : i === 1 ? "bg-[#171715] text-white" : "bg-white")}
              >
                <p className={cx("text-[1.3cqw] font-semibold", i === 1 && "text-[#f75115]")}>Test {i + 1}</p>
                <p className="mt-[0.8cqw] text-[2.2cqw] font-bold leading-tight tracking-[-0.01em]">{c.text}</p>
              </div>
            ))}
          </div>
        </Slide>
      )}

      {/* 13 Close */}
      <Slide dark page={page()} footer={null}>
        <div className="flex h-full flex-col justify-between">
          <p className="text-[1.6cqw] text-white/80">
            {p.brand} · {name} {month.slice(0, 4)}
          </p>
          <div>
            <h2 className="text-[7.5cqw] font-bold leading-[1] tracking-[-0.03em] text-white">That&apos;s {name}.</h2>
            <p className="mt-[1.2cqw] text-[2.2cqw] text-[#f75115]">Thanks for reading. Tell us what you&apos;d like to see more of next month.</p>
          </div>
          <p className="text-[1.3cqw] text-white/70">From the team at Vernacular</p>
        </div>
        <span className="absolute bottom-0 right-0 h-[18%] w-[10.5%] bg-[#f75115]" />
      </Slide>
    </div>
  );
}

function Slide({ children, dark, page, footer }: { children: ReactNode; dark?: boolean; page: string; footer: string | null }) {
  return (
    <section
      className="@container overflow-hidden rounded-xl border border-line shadow-[0_1px_2px_rgb(23_23_21/0.04)]"
      style={{ containerType: "inline-size" }}
    >
      <div className={cx("relative aspect-[16/9] w-full px-[6.7cqw] py-[6cqw] text-[#171715]", dark ? "bg-[#171715]" : "bg-[#f2eee3]")}>
        {children}
        {footer !== null && (
          <div className="absolute inset-x-[6.7cqw] bottom-[3.6cqw] flex justify-between text-[1.15cqw] text-[#45443f]">
            <span>{footer}</span>
            <span className="tabular-nums">{page}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Headline({ children }: { children: ReactNode }) {
  return <h3 className="max-w-[88%] text-balance text-[3.6cqw] font-bold leading-[1.08] tracking-[-0.025em]">{children}</h3>;
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.4cqw] bg-white p-[1.6cqw]">
      <p className="text-[1.3cqw] font-semibold">{title}</p>
      <div className="mt-[0.6cqw]">{children}</div>
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-[0.6cqw] flex gap-[1.6cqw] text-[1.1cqw] text-[#45443f]">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-[0.5cqw]">
          <span className="h-[0.8cqw] w-[1.4cqw] rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bars, best first; the dashed line is the page's average. */
function HBars({ data, average }: { data: { label: string; value: number }[]; average: number }) {
  const best = Math.max(...data.map((x) => x.value));
  return (
    <div className="h-[22cqw]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 48, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, best * 1.05]} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: INK }} width={112} />
          <Tooltip formatter={(v) => formatFull(Number(v))} cursor={{ fill: "#f8f6f1" }} />
          <ReferenceLine
            x={average}
            stroke={INK}
            strokeDasharray="4 4"
            label={{ value: `page average ${formatNumber(average)}`, position: "top", fontSize: 10, fill: INK }}
          />
          <Bar dataKey="value" name="Average views" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
            {data.map((x) => (
              <Cell key={x.label} fill={x.value === best ? ORANGE : GREY} />
            ))}
            <LabelList dataKey="value" position="right" fontSize={11} fill={INK} formatter={(v: unknown) => formatNumber(Number(v))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { DialectPost };
