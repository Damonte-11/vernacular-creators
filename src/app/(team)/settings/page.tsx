"use client";
import { ENGAGEMENT_BENCHMARKS, REACH_RATIOS } from "@config/benchmarks";
import { FLAG_THRESHOLDS } from "@config/flags";
import { SCORE_FACTOR_LABELS, type ScoreFactor } from "@config/scoring";
import { SIZE_BANDS } from "@config/size-bands";
import { buttonClass, Card, inputClass, labelClass, PageHeader } from "@/components/ui";
import { actions, useAppState } from "@/lib/data/store";
import { formatNumber, formatPercent } from "@/lib/format";

export default function SettingsPage() {
  const { settings } = useAppState();
  const weightTotal = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Settings" subtitle="Changes apply straight away to every score on the site." />

      <Card className="mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">Creator Score weights</h2>
            <p className="text-sm text-ink-2">
              How much each factor counts. For a brand that cares most about views, turn up &quot;Views&quot;. Weights are re-balanced automatically, so they
              don&apos;t need to add up to 100.
            </p>
          </div>
          <button className={buttonClass.ghost} onClick={() => actions.resetSettings()}>
            Reset to defaults
          </button>
        </div>
        <div className="space-y-5">
          {(Object.keys(SCORE_FACTOR_LABELS) as ScoreFactor[]).map((f) => (
            <div key={f}>
              <div className="flex items-baseline justify-between text-sm">
                <label htmlFor={`w-${f}`} className="font-semibold">
                  {SCORE_FACTOR_LABELS[f].label}
                </label>
                <span className="text-xs text-muted">
                  {settings.weights[f]} → <span className="font-semibold text-ink">{weightTotal ? Math.round((settings.weights[f] / weightTotal) * 100) : 0}%</span> of the score
                </span>
              </div>
              <input
                id={`w-${f}`}
                type="range"
                min={0}
                max={50}
                step={1}
                value={settings.weights[f]}
                onChange={(e) => actions.updateSettings({ weights: { ...settings.weights, [f]: Number(e.target.value) } })}
                className="mt-1 w-full accent-[var(--color-accent)]"
              />
              <p className="text-xs text-muted">{SCORE_FACTOR_LABELS[f].help}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-bold">Data</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberSetting
            label="Recent posts to use"
            hint="Averages are based on this many recent posts."
            value={settings.recentPostCount}
            min={3}
            max={50}
            onChange={(v) => actions.updateSettings({ recentPostCount: v })}
          />
          <NumberSetting
            label="Skip posts newer than (hours)"
            hint="Brand-new posts are still gaining likes."
            value={settings.minPostAgeHours}
            min={0}
            max={168}
            onChange={(v) => actions.updateSettings({ minPostAgeHours: v })}
          />
          <NumberSetting
            label="Refresh data after (hours)"
            hint="Saves API allowance. Used from Stage 2."
            value={settings.refreshIntervalHours}
            min={1}
            max={720}
            onChange={(v) => actions.updateSettings({ refreshIntervalHours: v })}
          />
        </div>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="font-bold">Benchmarks and thresholds</h2>
        <p className="mb-4 text-sm text-ink-2">
          These are kept in the <code className="rounded bg-canvas px-1">config</code> folder so they&apos;re easy to adjust. Tell me (or a developer) what to
          change.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Size</th>
                <th className="py-2 pr-3">Followers</th>
                <th className="py-2 pr-3">Instagram engagement: poor / avg / good</th>
                <th className="py-2 pr-3">YouTube engagement: poor / avg / good</th>
                <th className="py-2 pr-3">Instagram reach (no views)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SIZE_BANDS.map((b) => {
                const ig = ENGAGEMENT_BENCHMARKS.instagram[b.id];
                const yt = ENGAGEMENT_BENCHMARKS.youtube[b.id];
                const r = REACH_RATIOS.instagram[b.id];
                return (
                  <tr key={b.id}>
                    <td className="py-2 pr-3 font-semibold">{b.label}</td>
                    <td className="py-2 pr-3">
                      {formatNumber(b.min)}
                      {b.max === Infinity ? "+" : `–${formatNumber(b.max)}`}
                    </td>
                    <td className="py-2 pr-3">
                      &lt;{formatPercent(ig.poor)} / &lt;{formatPercent(ig.average)} / &lt;{formatPercent(ig.good)}
                    </td>
                    <td className="py-2 pr-3">
                      &lt;{formatPercent(yt.poor)} / &lt;{formatPercent(yt.average)} / &lt;{formatPercent(yt.good)}
                    </td>
                    <td className="py-2 pr-3">
                      {formatPercent(r.low, 0)}–{formatPercent(r.high, 0)} of followers
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-ink-2">
          <li>Unusually high engagement: more than {FLAG_THRESHOLDS.highEngagementFactor}× the &quot;good&quot; line.</li>
          <li>Follower jump: more than {formatPercent(FLAG_THRESHOLDS.followerJumpPct, 0)} growth within {FLAG_THRESHOLDS.followerJumpWindowDays} days.</li>
          <li>
            Likes per comment: normal is {FLAG_THRESHOLDS.likesPerComment.instagram.min}–{FLAG_THRESHOLDS.likesPerComment.instagram.max} on Instagram,{" "}
            {FLAG_THRESHOLDS.likesPerComment.youtube.min}–{FLAG_THRESHOLDS.likesPerComment.youtube.max} on YouTube.
          </li>
          <li>Posting gap: more than {FLAG_THRESHOLDS.maxPostingGapDays} days.</li>
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">Demo data</h2>
        <p className="mb-3 text-sm text-ink-2">Clear everything saved in this browser (added creators, notes, shortlists, settings) and start the demo fresh.</p>
        <button
          className={buttonClass.danger}
          onClick={() => window.confirm("Reset all demo data in this browser?") && actions.resetEverything()}
        >
          Reset demo data
        </button>
      </Card>
    </>
  );
}

function NumberSetting({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        className={inputClass}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value));
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
      />
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}
