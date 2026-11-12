"use client";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatFull, formatNumber } from "@/lib/format";
import { monthName, type MonthStats } from "@/lib/dialect";

const AXIS = { fontSize: 11, fill: "var(--color-muted)" };
const MARGIN = { top: 12, right: 16, bottom: 0, left: 0 };

/**
 * The month's signature chart: counted views climbing day by day (orange)
 * against the straight on-pace line to the target (dashed). Posts per day sit
 * in their own strip underneath, on the same days, so the chart keeps one scale.
 */
export function PaceChart({ s, target }: { s: MonthStats; target: number }) {
  const data = Array.from({ length: s.days }, (_, i) => ({
    day: i + 1,
    views: i < s.cumulative.length ? s.cumulative[i].views : undefined,
    pace: Math.round((target * (i + 1)) / s.days),
    posts: s.postsPerDay[i],
  }));
  const top = Math.max(target, s.views) * 1.06;
  const today = s.cumulative.at(-1);
  const short = monthName(s.month, "short");

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={MARGIN}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS} interval={4} tickFormatter={(d: number) => `${d} ${short}`} />
            <YAxis tickLine={false} axisLine={false} width={44} tick={AXIS} domain={[0, top]} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip
              cursor={{ stroke: "var(--color-line-strong)" }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                if (!d) return null;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[0_4px_16px_rgb(23_23_21/0.08)]">
                    <p className="font-medium text-ink">
                      {d.day} {monthName(s.month)}
                    </p>
                    {d.views !== undefined && <p className="tabular-nums text-ink-2">Views so far: {formatFull(d.views)}</p>}
                    <p className="tabular-nums text-muted">On pace: {formatFull(d.pace)}</p>
                    <p className="tabular-nums text-muted">
                      {d.posts} {d.posts === 1 ? "post" : "posts"} that day
                    </p>
                  </div>
                );
              }}
            />
            <Line dataKey="pace" stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
            <Line
              dataKey="views"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface)" }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {today && (
              <ReferenceDot x={today.day} y={today.views} r={5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} ifOverflow="visible" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="h-11 w-full" aria-label="Posts per day">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ ...MARGIN, top: 2 }}>
            <XAxis dataKey="day" hide />
            <YAxis
              width={44}
              domain={[0, Math.max(4, ...s.postsPerDay)]}
              hide={false}
              tick={false}
              axisLine={false}
              tickLine={false}
              label={{ value: "posts", position: "insideRight", fontSize: 10, fill: "var(--color-muted)" }}
            />
            <Bar dataKey="posts" fill="var(--color-line-strong)" radius={[2, 2, 0, 0]} maxBarSize={8} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
