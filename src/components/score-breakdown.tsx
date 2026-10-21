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
          <h2 className="text-base font-semibold">Creator Score</h2>
          <p className="mt-0.5 text-xs text-muted">Out of 100. 
Based on {used.length} of 5 factors, compared with creators of the same size.
          </p>
          {isLimited(score) && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-warn">
              <Icon name="alert" size={12} /> Limited data, so treat this score with care.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-4 border-t border-line pt-5">
        {used.map((f) => (
          <li key={f}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold" title={SCORE_FACTOR_LABELS[f].help}>
                {SCORE_FACTOR_LABELS[f].label}
              </span>
              <span className="text-xs tabular-nums text-muted">
                <span className="text-sm font-semibold text-ink">{score.breakdown[f]}</span>/100 · {Math.round((score.weightsUsed[f] ?? 0) * 100)}% of score
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 rounded-full bg-line"
              role="meter"
              aria-label={SCORE_FACTOR_LABELS[f].label}
              aria-valuenow={score.breakdown[f]}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${score.breakdown[f]}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{SCORE_FACTOR_LABELS[f].help}</p>
          </li>
        ))}
      </ul>

      {score.missing.length > 0 && (
        <div className="mt-5 rounded-lg bg-surface-2 p-3 text-xs text-ink-2 ring-1 ring-line">
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
