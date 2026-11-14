"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx } from "@/components/ui";
import { fmt, type Pro } from "./data";
import { Avatar, ShareBars } from "./bits";

const AXIS = { fontSize: 11, fill: "#6c6a62" };

/** Followers by month, with a dotted line for where the trend is heading. */
export function GrowthChart({ p, height = 200, color = "#f75115", dark }: { p: Pro; height?: number; color?: string; dark?: boolean }) {
  const g = p.growth;
  const last = g.at(-1)!.followers;
  const slope = (last - g[g.length - 4].followers) / 3;
  const data = [
    ...g.map((x, i) => ({ m: x.m, actual: x.followers, ahead: i === g.length - 1 ? x.followers : undefined })),
    ...[1, 2].map((k) => ({ m: ["Dec", "Jan"][k - 1], actual: undefined, ahead: Math.round(last + slope * k) })),
  ];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g-${p.id}-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={dark ? "rgba(255,255,255,.08)" : "#ece7db"} />
          <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ ...AXIS, fill: dark ? "#ffffff90" : AXIS.fill }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ ...AXIS, fill: dark ? "#ffffff90" : AXIS.fill }}
            tickFormatter={(v: number) => fmt(v)}
            domain={["dataMin", "auto"]}
          />
          <Tooltip formatter={(v) => fmt(Number(v), 2)} labelStyle={{ color: "#171715" }} />
          <Area dataKey="actual" name="Followers" stroke={color} strokeWidth={2} fill={`url(#g-${p.id}-${color})`} isAnimationActive />
          <Area dataKey="ahead" name="If the trend holds" stroke={color} strokeWidth={2} strokeDasharray="4 4" fill="none" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Views per post (last 12), against the creator's usual. */
export function ViewsBars({ p, height = 180, dark }: { p: Pro; height?: number; dark?: boolean }) {
  const data = p.viewSeries.map((v, i) => ({ i: i + 1, v: v ?? 0 }));
  const usual = p.avgViews ?? 0;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            formatter={(v) => fmt(Number(v), 2)}
            labelFormatter={(i) => `Post ${i} of 12`}
            cursor={{ fill: dark ? "rgba(255,255,255,.06)" : "#f8f6f1" }}
          />
          {usual > 0 && (
            <ReferenceLine
              y={usual}
              stroke={dark ? "#fff" : "#171715"}
              strokeDasharray="4 4"
              label={{ value: `usual ${fmt(usual)}`, position: "insideTopRight", fontSize: 10, fill: dark ? "#fff" : "#171715" }}
            />
          )}
          <Bar dataKey="v" name="Views" radius={[3, 3, 0, 0]} isAnimationActive>
            {data.map((d) => (
              <Cell key={d.i} fill={d.v >= usual * 1.3 ? "#f75115" : dark ? "rgba(255,255,255,.35)" : "#cfc8b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** What comments say about the audience: honest estimates, labelled as such. */
export function AudienceSignals({ p, compact }: { p: Pro; compact?: boolean }) {
  return (
    <div className={cx("grid gap-5", !compact && "md:grid-cols-3")}>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Languages in the comments</p>
        <ShareBars items={p.languages} color="#f75115" />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Where commenters seem to be</p>
        <ShareBars items={p.countries} color="#171715" />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Mood of the comments</p>
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <span className="bg-good" style={{ width: `${p.sentiment.positive}%` }} />
          <span className="mx-[2px] bg-line-strong" style={{ width: `${p.sentiment.neutral}%` }} />
          <span className="bg-bad" style={{ width: `${p.sentiment.negative}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink-2">
          Positive {p.sentiment.positive}% · neutral {p.sentiment.neutral}% · negative {p.sentiment.negative}%
        </p>
        <p className={cx("mt-3 text-xs", p.spamShare > 10 ? "font-medium text-bad" : "text-ink-2")}>
          {p.spamShare}% of comments look like bots or spam{p.spamShare > 10 ? " (high)" : ""}
        </p>
        <p className="mt-3 text-xs text-muted">People talk about: {p.commentThemes.join(", ")}.</p>
      </div>
    </div>
  );
}

export function Collabs({ p }: { p: Pro }) {
  if (!p.collabs.length) return <p className="text-[13px] text-muted">No brand posts found in their recent content.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {p.collabs.map((c) => (
        <li key={c.brand} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: c.tone }}>
            {c.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{c.brand}</span>
            <span className="text-xs text-muted">
              {c.posts} {c.posts === 1 ? "post" : "posts"} · {c.paid ? "marked paid partnership" : "mention"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ChorusHistory({ p }: { p: Pro }) {
  if (!p.chorus.length) return <p className="text-[13px] text-muted">Not booked by Vernacular yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {p.chorus.map((c) => (
        <li key={c.campaign} className="flex items-center justify-between gap-3 py-2 text-[13px]">
          <span>
            <span className="font-medium">{c.campaign}</span>{" "}
            <span className="text-muted">
              · {c.client} · {c.month}
            </span>
          </span>
          <span className="flex items-center gap-3 tabular-nums">
            <span className={c.vsUsual >= 1 ? "font-medium text-good" : "font-medium text-bad"}>{c.vsUsual.toFixed(1)}× usual views</span>
            <span className={c.onTime ? "text-muted" : "text-bad"}>{c.onTime ? "on time" : "late"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LookalikeList({ list, onOpen }: { list: Pro[]; onOpen: (p: Pro) => void }) {
  return (
    <ul className="divide-y divide-line">
      {list.map((y) => (
        <li key={y.id}>
          <button onClick={() => onOpen(y)} className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-surface-2">
            <Avatar p={y} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{y.name}</span>
              <span className="text-xs text-muted">
                @{y.handle} · {y.niche} · {y.city}
              </span>
            </span>
            <span className="text-right text-xs tabular-nums">
              <b className="block text-[13px] font-semibold">{fmt(y.followers)}</b>
              <span className="text-muted">{y.er !== null ? `${(y.er * 100).toFixed(1)}% ER` : "—"}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
