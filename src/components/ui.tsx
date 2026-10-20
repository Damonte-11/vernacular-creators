import Link from "next/link";
import type { ReactNode } from "react";
import type { EngagementLabel, Flag, Platform } from "@/lib/types";
import { Icon } from "./icons";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50",
  ghost: "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-2 hover:bg-canvas",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-bad/30 bg-surface px-4 py-2.5 text-sm font-semibold text-bad hover:bg-bad-soft",
};

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Darker steps of the brand palette ramps, so white initials stay readable.
const AVATAR_COLOURS = ["#c64111", "#068116", "#0249b3", "#784acf", "#0a7d8d", "#98750f", "#171715", "#94310d"];

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colour = AVATAR_COLOURS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLOURS.length];
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colour, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function PlatformBadge({ platform, compact }: { platform: Platform; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-ink-2">
      <Icon name={platform} size={13} />
      {!compact && (platform === "instagram" ? "Instagram" : "YouTube")}
    </span>
  );
}

export function scoreTone(score: number | null): "good" | "warn" | "bad" | "none" {
  if (score === null) return "none";
  if (score >= 75) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

const TONE_CLASSES = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  none: "bg-canvas text-muted",
};

export function ScoreBadge({ score, size = "md", limited }: { score: number | null; size?: "sm" | "md" | "lg"; limited?: boolean }) {
  const tone = scoreTone(score);
  const dims = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-base", lg: "h-20 w-20 text-3xl" }[size];
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cx("inline-flex items-center justify-center rounded-full font-bold", dims, TONE_CLASSES[tone])}
        title={
          score === null
            ? "Not enough data to score"
            : `Creator Score ${score} out of 100${limited ? " (limited data: treat with care)" : ""}`
        }
      >
        {score ?? "–"}
      </span>
      {limited && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warn text-[10px] font-bold text-white" aria-label="Limited data">
          !
        </span>
      )}
    </span>
  );
}

const LABEL_TONE: Record<EngagementLabel, keyof typeof TONE_CLASSES> = {
  poor: "bad",
  average: "none",
  good: "good",
  great: "good",
};

export function EngagementChip({ label }: { label: EngagementLabel | null }) {
  if (!label) return <span className="text-xs text-muted">n/a</span>;
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", TONE_CLASSES[LABEL_TONE[label]])}>
      {label}
    </span>
  );
}

const SEVERITY = {
  high: { label: "High", cls: "bg-bad-soft text-bad", icon: "alert" as const },
  medium: { label: "Medium", cls: "bg-warn-soft text-warn", icon: "alert" as const },
  low: { label: "Low", cls: "bg-canvas text-ink-2", icon: "info" as const },
};

export function FlagList({ flags, empty = true }: { flags: Flag[]; empty?: boolean }) {
  if (flags.length === 0) {
    return empty ? (
      <p className="flex items-center gap-2 text-sm text-good">
        <Icon name="check" size={16} /> No warning signs in the public numbers.
      </p>
    ) : null;
  }
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => {
        const s = SEVERITY[f.severity];
        return (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className={cx("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.cls)}>
              <Icon name={s.icon} size={12} /> {s.label}
            </span>
            <span className="text-ink-2">{f.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function FlagCount({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return <span className="text-xs text-muted">None</span>;
  const worst = flags.some((f) => f.severity === "high") ? "high" : flags.some((f) => f.severity === "medium") ? "medium" : "low";
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", SEVERITY[worst].cls)}
      title={flags.map((f) => f.message).join("\n")}
    >
      <Icon name="alert" size={12} /> {flags.length}
    </span>
  );
}

export function StatTile({ label, value, hint, estimate }: { label: string; value: ReactNode; hint?: ReactNode; estimate?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {estimate && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Estimate</span>}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink"
      title="The creator connected their own account (Stage 3). In this demo it's for show only."
    >
      <Icon name="shield" size={12} /> Verified
    </span>
  );
}

export function CreatorLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link href={`/creators/${encodeURIComponent(id)}`} className={className}>
      {children}
    </Link>
  );
}

export function Loading() {
  return <p className="py-20 text-center text-sm text-muted">Loading…</p>;
}

/** "Last 10 posts: +35% vs usual". Neutral when within ±10%. */
export function TrendLine({ trend }: { trend: { recentPosts: number; change: number } | null }) {
  if (!trend) return null;
  const pct = Math.round(trend.change * 100);
  const flat = Math.abs(pct) < 10;
  const cls = flat ? "text-muted" : pct > 0 ? "text-good" : "text-bad";
  const arrow = flat ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span className={cx("text-xs font-semibold", cls)} title="Engagement on the newest posts compared with this creator's usual level. It doesn't change the headline numbers.">
      {arrow} Last {trend.recentPosts} posts: {flat ? "about the same as usual" : `${pct > 0 ? "+" : ""}${pct}% vs usual`}
    </span>
  );
}
