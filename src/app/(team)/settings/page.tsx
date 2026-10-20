"use client";
import { ENGAGEMENT_BENCHMARKS, REACH_RATIOS, VIEW_ENGAGEMENT_BENCHMARKS, VIEWS_TO_REACH } from "@config/benchmarks";
import { FLAG_THRESHOLDS } from "@config/flags";
import { SCORE_FACTOR_LABELS, type ScoreFactor } from "@config/scoring";
import { SIZE_BANDS } from "@config/size-bands";
import { buttonClass, Card, inputClass, labelClass, PageHeader } from "@/components/ui";
import { actions, useAppState } from "@/lib/data/store";
import { IS_LIVE } from "@/lib/supabase/config";
import { formatNumber, formatPercent } from "@/lib/format";

export default function SettingsPage() {
  const { settings } = useAppState();
  const weightTotal = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={IS_LIVE ? "Shared by the whole team. Changes apply straight away to every score." : "Changes apply straight away to every score on the site."}
      />

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
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberSetting
            label="Recent posts to use"
            hint="Numbers use this many recent posts (default 30, like HypeAuditor), from the last 6 months, always including the newest 12."
            value={settings.recentPostCount}
            min={3}
            max={50}
            onChange={(v) => actions.updateSettings({ recentPostCount: v })}
          />
          <NumberSetting
            label="Instagram: skip posts newer than (hours)"
            hint="New posts are still gaining likes. Default 72 (3 days)."
            value={settings.minPostAgeHours}
            min={0}
            max={336}
            onChange={(v) => actions.updateSettings({ minPostAgeHours: v })}
          />
          <NumberSetting
            label="YouTube: skip videos newer than (hours)"
            hint="Videos keep growing for about a week. Default 168 (7 days)."
            value={settings.minPostAgeHoursYoutube}
            min={0}
            max={720}
            onChange={(v) => actions.updateSettings({ minPostAgeHoursYoutube: v })}
          />
          <NumberSetting
            label="Refresh data after (hours)"
            hint="Saved creators are re-fetched after this long. Saves API allowance."
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
          change. Each size&apos;s numbers apply at its typical follower count and blend smoothly in between, so there&apos;s no sudden jump between sizes.
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
          <li>
            Engagement by views: poor below {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.instagram.poor, 0)}, good from{" "}
            {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.instagram.average, 0)}, great from {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.instagram.good, 0)} on Instagram (
            {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.youtube.poor, 1)} / {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.youtube.average, 0)} /{" "}
            {formatPercent(VIEW_ENGAGEMENT_BENCHMARKS.youtube.good, 0)} on YouTube). The Engagement score uses both rates half and half where views exist.
          </li>
          <li>Reach from views: {formatPercent(VIEWS_TO_REACH, 0)} of views (views include repeat plays), adjusted by logged campaign results.</li>
          <li>
            Unusually high engagement: more than {FLAG_THRESHOLDS.highEngagementFactor}× the &quot;good&quot; line, flagged only when backed by another sign
            (odd likes-to-comments ratio, a follower jump, or over {formatPercent(FLAG_THRESHOLDS.maxViewEngagement, 0)} engagement per view).
          </li>
          <li>
            Inactive followers: views under {formatPercent(FLAG_THRESHOLDS.inactiveFollowersViewShare, 0)} of the healthy level for the size, while viewers engage
            normally.
          </li>
          <li>Only signs of fake or bought activity lower the Authenticity score; low engagement, gaps and boosted posts are shown as warnings only.</li>
          <li>Follower jump: more than {formatPercent(FLAG_THRESHOLDS.followerJumpPct, 0)} growth within {FLAG_THRESHOLDS.followerJumpWindowDays} days.</li>
          <li>
            Likes per comment: normal is {FLAG_THRESHOLDS.likesPerComment.instagram.min}–{FLAG_THRESHOLDS.likesPerComment.instagram.max} on Instagram,{" "}
            {FLAG_THRESHOLDS.likesPerComment.youtube.min}–{FLAG_THRESHOLDS.likesPerComment.youtube.max} on YouTube.
          </li>
          <li>Posting gap: more than {FLAG_THRESHOLDS.maxPostingGapDays} days.</li>
          <li>
            Possibly boosted posts: a post with more than {FLAG_THRESHOLDS.outlierFactor}× a typical post&apos;s engagement or views is set aside and not
            counted, and the next older post takes its place (needs at least {FLAG_THRESHOLDS.minPostsForOutliers} posts; if over{" "}
            {formatPercent(FLAG_THRESHOLDS.maxOutlierShare, 0)} of posts qualify, that&apos;s the creator&apos;s normal pattern and none are set aside). The team can
            also exclude any post by hand.
          </li>
          <li>
            Low confidence: shown when fewer than {FLAG_THRESHOLDS.minPostsForConfidence} posts are behind the numbers.
          </li>
        </ul>
      </Card>

      {!IS_LIVE && <Card className="p-5">
        <h2 className="font-bold">Demo data</h2>
        <p className="mb-3 text-sm text-ink-2">Clear everything saved in this browser (added creators, notes, shortlists, settings) and start the demo fresh.</p>
        <button
          className={buttonClass.danger}
          onClick={() => window.confirm("Reset all demo data in this browser?") && actions.resetEverything()}
        >
          Reset demo data
        </button>
      </Card>}
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
