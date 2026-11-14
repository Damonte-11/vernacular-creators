"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CreatorView } from "@/lib/creator-view";
import { formatDate, formatFull, formatNumber } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--color-muted)" };

/** Followers at each saved refresh. */
export function FollowerGrowth({ v, height = 200 }: { v: CreatorView; height?: number }) {
  const data = v.growth.map((g) => ({ at: formatDate(g.at), followers: g.followers }));
  if (data.length < 2) return <p className="text-[13px] text-muted">Only one follower count saved so far. Growth shows once there&apos;s more history.</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cr-growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis dataKey="at" tickLine={false} axisLine={false} tick={AXIS} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={AXIS} domain={["dataMin", "auto"]} tickFormatter={(n: number) => formatNumber(n)} />
          <Tooltip formatter={(n) => formatFull(Number(n))} />
          <Area dataKey="followers" name="Followers" stroke="var(--color-accent)" strokeWidth={2} fill="url(#cr-growth)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Views per post (last 12) against their usual; orange beat it by 30% or more. */
export function ViewsAgainstUsual({ v, height = 200 }: { v: CreatorView; height?: number }) {
  const data = v.viewSeries.map((n, i) => ({ i: i + 1, n: n ?? 0 }));
  const usual = v.views ?? 0;
  if (!data.some((d) => d.n)) return <p className="text-[13px] text-muted">No view counts on their recent posts.</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            formatter={(n) => formatFull(Number(n))}
            labelFormatter={(i) => `Post ${i} of ${data.length} (oldest first)`}
            cursor={{ fill: "var(--color-surface-2)" }}
          />
          {usual > 0 && (
            <ReferenceLine
              y={usual}
              stroke="var(--color-ink)"
              strokeDasharray="4 4"
              label={{ value: `usual ${formatNumber(usual)}`, position: "insideTopRight", fontSize: 10, fill: "var(--color-ink)" }}
            />
          )}
          <Bar dataKey="n" name="Views" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.i} fill={d.n >= usual * 1.3 ? "var(--color-accent)" : "var(--color-line-strong)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
