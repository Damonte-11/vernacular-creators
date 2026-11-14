import { cx } from "./ui";

/**
 * The chat language from the Vernacular website: questions in bubbles, answers from the orange V.
 * Used wherever the app's AI speaks (search, verdicts, report progress), so it reads as one voice.
 */

/** The V from the official wordmark, in a Vernacular Orange circle. */
export function VMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full bg-vern text-brand", className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="26 28 90 90" width={size * 0.56} height={size * 0.56} fill="currentColor">
        <path d="M94.7527 33.7951L111.191 33.6507L77.3128 111.36L63.8227 111.302L30 33.7085L46.355 33.4487L70.5817 92.2215L94.7805 33.7951H94.7527Z" />
      </svg>
    </span>
  );
}

/** Three dots that pulse while V is thinking. */
export function Typing({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 py-1", className)} role="status" aria-label="Working on it">
      {[0, 150, 300].map((d) => (
        <i key={d} className="v-dot block h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** Something the team said or asked: right side, filled. */
export function YouBubble({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <p
      className={cx(
        "v-pop ml-auto w-fit max-w-[88%] rounded-[20px_20px_6px_20px] px-4 py-2.5 text-[14px] font-medium leading-snug",
        dark ? "bg-white/12 text-white" : "bg-accent text-white",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** V speaking: the orange V, then a bubble with the tight corner at the bottom left. */
export function VBubble({
  children,
  typing,
  dark,
  size = "md",
  className,
}: {
  children?: React.ReactNode;
  typing?: boolean;
  dark?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cx("v-pop flex items-end gap-2.5", className)}>
      <VMark size={size === "sm" ? 26 : 32} />
      <div
        className={cx(
          "min-w-0 max-w-[94%] rounded-[20px_20px_20px_6px] leading-relaxed",
          size === "sm" ? "px-3.5 py-2 text-[13px]" : "px-4 py-3 text-[14px]",
          dark ? "bg-[#2c2a28] text-[#e9e4d9]" : "bg-surface text-ink ring-1 ring-line",
        )}
      >
        {typing ? <Typing /> : children}
      </div>
    </div>
  );
}
