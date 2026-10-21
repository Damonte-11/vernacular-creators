import Link from "next/link";
import type { ReactNode } from "react";
import type { EngagementLabel, Flag, Platform } from "@/lib/types";
import { platformName } from "@/lib/platforms";
import { Icon } from "./icons";
import { Wordmark } from "./logo";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/*
 * Design system, in one place:
 * - Radius: 12px for cards and panels, 8px for buttons, inputs and pills inside them.
 * - Text: page titles 28–32px semibold; section titles 16px semibold; labels 13px medium, sentence case.
 * - Colour: Eerie Black for primary actions, Orange only for highlights (chart bars, focus, active nav),
 *   green / yellow / red only for status, always with a word next to it.
 */
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const buttonClass = {
  primary: `${BUTTON_BASE} bg-brand px-4 py-2.5 text-brand-ink hover:bg-brand/85`,
  secondary: `${BUTTON_BASE} border border-line-strong bg-surface px-4 py-2.5 text-ink hover:bg-surface-2`,
  ghost: `${BUTTON_BASE} px-2.5 py-1.5 text-ink-2 hover:bg-ink/5 hover:text-ink`,
  danger: `${BUTTON_BASE} border border-bad/30 bg-surface px-4 py-2.5 text-bad hover:bg-bad-soft`,
  /** Square icon-only button; always pair with aria-label. */
  icon: `${BUTTON_BASE} h-9 w-9 text-ink-2 hover:bg-ink/5 hover:text-ink`,
};

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted transition-colors hover:border-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface-2";

export const labelClass = "mb-1.5 block text-[13px] font-medium text-ink-2";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(23_23_21/0.04)]", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Title (and optional one-line description) at the top of a card or page section. */
export function SectionHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Small "Estimate" marker next to numbers that are estimated, not measured. */
export function EstimateTag() {
  return <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">Estimate</span>;
}

// Muted, warm tones that sit with the brand palette; dark text stays readable on all of them.
const AVATAR_TONES = ["#f6dfd2", "#e9e3d3", "#dbe8dc", "#dde3ef", "#efe0c4", "#e8dcea"];

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full bg-surface-2 object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink"
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export function PlatformBadge({ platform, compact }: { platform: Platform; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex text-muted" title={platformName(platform)}>
        <Icon name={platform} size={14} />
        <span className="sr-only">{platformName(platform)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-line">
      <Icon name={platform} size={13} />
      {platformName(platform)}
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
  none: "bg-surface-2 text-muted",
};

const TONE_DOT = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", none: "bg-muted" };

export function ScoreBadge({ score, size = "md", limited }: { score: number | null; size?: "sm" | "md" | "lg"; limited?: boolean }) {
  const tone = scoreTone(score);
  const dims = { sm: "h-9 w-9 text-sm", md: "h-11 w-11 text-base", lg: "h-20 w-20 text-3xl" }[size];
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cx("inline-flex items-center justify-center rounded-full font-semibold tabular-nums", dims, TONE_CLASSES[tone])}
        title={score === null ? "Not enough data to score" : `Creator Score ${score} out of 100${limited ? " (limited data: treat with care)" : ""}`}
      >
        {score ?? "–"}
      </span>
      {limited && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-warn text-[10px] font-bold text-white ring-2 ring-surface"
          aria-label="Limited data"
        >
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

/** "● Good": a coloured dot plus the word, so colour is never the only signal. */
export function EngagementChip({ label }: { label: EngagementLabel | null }) {
  if (!label) return <span className="text-xs text-muted">n/a</span>;
  const tone = LABEL_TONE[label];
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium capitalize", tone === "none" ? "text-ink-2" : tone === "good" ? "text-good" : "text-bad")}>
      <span className={cx("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
      {label}
    </span>
  );
}

const SEVERITY = {
  high: { label: "High", cls: "bg-bad-soft text-bad", icon: "alert" as const },
  medium: { label: "Medium", cls: "bg-warn-soft text-warn", icon: "alert" as const },
  low: { label: "Low", cls: "bg-surface-2 text-ink-2 ring-1 ring-line", icon: "info" as const },
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
    <ul className="space-y-2.5">
      {flags.map((f, i) => {
        const s = SEVERITY[f.severity];
        return (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className={cx("mt-0.5 inline-flex w-[76px] shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", s.cls)}>
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
  if (flags.length === 0) {
    return (
      <span className="text-sm text-muted" title="No warning signs">
        –<span className="sr-only">No warning signs</span>
      </span>
    );
  }
  const worst = flags.some((f) => f.severity === "high") ? "high" : flags.some((f) => f.severity === "medium") ? "medium" : "low";
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", SEVERITY[worst].cls)}
      title={flags.map((f) => f.message).join("\n")}
    >
      <Icon name="alert" size={12} /> {flags.length}
      <span className="sr-only">{flags.length === 1 ? "warning sign" : "warning signs"}</span>
    </span>
  );
}

export function StatTile({ label, value, hint, estimate }: { label: string; value: ReactNode; hint?: ReactNode; estimate?: boolean }) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {estimate && <EstimateTag />}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px] sm:leading-9">{value}</p>
      {hint && <div className="mt-1 text-xs leading-relaxed text-muted">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 border-dashed px-6 py-14 text-center shadow-none">
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-line">
        <Icon name="search" size={18} />
      </span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink"
      title="The creator connected their own account (Stage 3). In this demo it's for show only."
    >
      <Icon name="shield" size={11} /> Verified
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
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
      Loading…
    </div>
  );
}

/** "Last 10 posts: +35% vs usual". Neutral when within ±10%. */
export function TrendLine({ trend }: { trend: { recentPosts: number; change: number } | null }) {
  if (!trend) return null;
  const pct = Math.round(trend.change * 100);
  const flat = Math.abs(pct) < 10;
  const cls = flat ? "text-muted" : pct > 0 ? "text-good" : "text-bad";
  const arrow = flat ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span className={cx("text-xs font-medium", cls)} title="Engagement on the newest posts compared with this creator's usual level. It doesn't change the headline numbers.">
      {arrow} Last {trend.recentPosts} posts: {flat ? "about the same as usual" : `${pct > 0 ? "+" : ""}${pct}% vs usual`}
    </span>
  );
}

/** Full-page message for pages outside the team area: not found, report unavailable. */
export function StatusPage({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Wordmark className="mx-auto h-7 w-auto text-ink" />
        <Card className="mt-8 px-6 py-10">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-ink-2">{body}</p>
          {action && <div className="mt-6 flex justify-center">{action}</div>}
        </Card>
      </div>
    </div>
  );
}
