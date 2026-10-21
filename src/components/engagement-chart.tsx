"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Post } from "@/lib/types";
import { formatFull, formatNumber } from "@/lib/format";
import { cx } from "./ui";

type Mode = "engagements" | "views";

/** One bar per recent post, oldest on the left. Dashed line = average. */
export function EngagementChart({ posts, likesHidden }: { posts: Post[]; likesHidden: boolean }) {
  const hasViews = posts.some((p) => p.views !== null);
  const [mode, setMode] = useState<Mode>("engagements");

  const data = [...posts]
    .reverse()
    .map((p) => ({
      date: new Date(p.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      caption: p.caption,
      type: p.type,
      value: mode === "engagements" ? (p.likes ?? 0) + p.comments : p.views,
    }))
    .filter((d) => d.value !== null) as { date: string; caption: string; type: string; value: number }[];
  const avg = data.length ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {mode === "engagements"
            ? likesHidden
              ? "Comments per post (likes are hidden)"
              : "Likes + comments per post"
            : "Views per post (only posts with public views)"}
          {" · dashed line = average"}
        </p>
        {hasViews && (
          <div className="flex rounded-lg bg-surface-2 p-1 text-xs font-medium ring-1 ring-line" role="tablist" aria-label="Chart shows">
            {(["engagements", "views"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cx("rounded-md px-3 py-1 capitalize transition-colors", mode === m ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink")}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted)" }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip
              cursor={{ fill: "var(--color-canvas)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-ink">{d.caption}</p>
                    <p className="text-muted">
                      {d.date} · {d.type}
                    </p>
                    <p className="mt-1 text-ink">
                      {formatFull(d.value)} {mode === "engagements" ? (likesHidden ? "comments" : "engagements") : "views"}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={avg} stroke="var(--color-muted)" strokeDasharray="4 4" />
            <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
