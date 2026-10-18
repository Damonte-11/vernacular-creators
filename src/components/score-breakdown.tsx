import { SCORE_FACTOR_LABELS, type ScoreFactor } from "@config/scoring";
import type { ScoreResult } from "@/lib/types";
import { Icon } from "./icons";
import { ScoreBadge } from "./ui";

/** Fewer than 3 factors, or no engagement factor (e.g. hidden likes). */
export function isLimited(score: ScoreResult): boolean {
  return Object.keys(score.breakdown).length < 3 || score.breakdown.engagement === undefined;
}

export function ScoreBreakdown({ score }: { score: ScoreResult }) {
  const used = Object.keys(score.breakdown) as ScoreFactor[];
  return (
    <div>
      <div className="flex items-center gap-4">
        <ScoreBadge score={score.total} size="lg" />
        <div>
          <p className="text-sm font-semibold">Creator Score out of 100</p>
          <p className="text-xs text-muted">
            Based on {used.length} of 5 factors, compared with creators of the same size.
          </p>
          {isLimited(score) && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-warn">
              <Icon name="alert" size={12} /> Limited data, so treat this score with care.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {used.map((f) => (
          <li key={f}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold" title={SCORE_FACTOR_LABELS[f].help}>
                {SCORE_FACTOR_LABELS[f].label}
              </span>
              <span className="text-xs text-muted">
                <span className="font-semibold text-ink">{score.breakdown[f]}</span>/100 · weight {Math.round((score.weightsUsed[f] ?? 0) * 100)}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-canvas">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${score.breakdown[f]}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{SCORE_FACTOR_LABELS[f].help}</p>
          </li>
        ))}
      </ul>

      {score.missing.length > 0 && (
        <div className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-2">
          <p className="font-semibold">Left out (weights re-balanced):</p>
          <ul className="mt-1 space-y-0.5">
            {score.missing.map((m) => (
              <li key={m.factor}>
                <span className="font-semibold">{SCORE_FACTOR_LABELS[m.factor].label}:</span> {m.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
