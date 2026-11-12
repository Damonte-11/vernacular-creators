"use client";
import type { ReactNode } from "react";
import { platformLabel, type DialectPlatform, type Verdict } from "@/lib/dialect";
import { Icon } from "../icons";
import { cx, inputClass } from "../ui";

/** The input style without the full width, for selects and inputs that size to their content. */
export const selectClass = inputClass.replace("w-full", "w-auto");

export function PlatformTag({ platform, compact }: { platform: DialectPlatform; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon name={platform} size={13} className="text-muted" />
      {!compact && platformLabel(platform)}
      {compact && <span className="sr-only">{platformLabel(platform)}</span>}
    </span>
  );
}

const TONE = { good: "text-good", warn: "text-warn", bad: "text-bad" } as const;
export function VerdictText({ v, className }: { v: Verdict; className?: string }) {
  return <span className={cx("text-xs font-medium", TONE[v.tone], className)}>{v.text}</span>;
}

/** A small labelled marker: status always has a word. */
export function Tag({ tone = "plain", children }: { tone?: "plain" | "bad" | "warn" | "good" | "info"; children: ReactNode }) {
  const cls = {
    plain: "bg-surface-2 text-ink-2 ring-line",
    bad: "bg-bad-soft text-bad ring-bad/15",
    warn: "bg-warn-soft text-warn ring-warn/15",
    good: "bg-good-soft text-good ring-good/15",
    info: "bg-info-soft text-info ring-info/15",
  }[tone];
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>{children}</span>
  );
}

/** Progress against a target, with a black notch where the month should be today. */
export function TargetBar({ done, target, pace }: { done: number; target: number; pace: number | null }) {
  const pct = target ? Math.min(100, (done / target) * 100) : 0;
  return (
    <div className="relative h-1.5 rounded-full bg-line" role="img" aria-label={`${Math.round(pct)}% of target`}>
      <div className={cx("absolute inset-y-0 left-0 rounded-full", done >= target ? "bg-brand" : "bg-accent")} style={{ width: `${pct}%` }} />
      {pace !== null && pace > 0 && pace < 1 && <div className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-brand" style={{ left: `${pace * 100}%` }} />}
    </div>
  );
}

/** Two to four exclusive choices. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-0.5 text-xs font-medium ring-1 ring-line" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "rounded-md px-2.5 py-1 transition-colors duration-150",
            value === o.id ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
