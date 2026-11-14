"use client";
import { useEffect, useState } from "react";
import { cx } from "./ui";

/**
 * A camera viewfinder (corner brackets, blinking REC, a running timecode), from the "Make it" scene on
 * the Vernacular website. Shown while the AI is watching videos, so the team can see at a glance that it's watching.
 */
export function Viewfinder({ title, detail, className }: { title: string; detail?: string; className?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const tc = [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map((n) => String(n).padStart(2, "0")).join(":");
  const corner = "absolute h-6 w-6 border-[#f2eee4]/70";
  return (
    <div className={cx("relative overflow-hidden rounded-2xl bg-brand px-5 py-4 text-[#f2eee4]", className)} role="status">
      <i className={cx(corner, "left-2.5 top-2.5 border-l-[3px] border-t-[3px]")} aria-hidden />
      <i className={cx(corner, "right-2.5 top-2.5 border-r-[3px] border-t-[3px]")} aria-hidden />
      <i className={cx(corner, "bottom-2.5 left-2.5 border-b-[3px] border-l-[3px]")} aria-hidden />
      <i className={cx(corner, "bottom-2.5 right-2.5 border-b-[3px] border-r-[3px]")} aria-hidden />
      <div className="flex items-center justify-between gap-3 px-3 text-[13px] tracking-wide tabular-nums">
        <span className="flex items-center gap-2 font-semibold">
          <span className="rec-blink h-2.5 w-2.5 rounded-full bg-vern" aria-hidden />
          REC
        </span>
        <span className="text-[#f2eee4]/70" aria-hidden>
          {tc}
        </span>
      </div>
      <p className="mt-5 px-3 text-lg font-semibold leading-tight tracking-tight">{title}</p>
      {detail && <p className="mt-1 px-3 pb-1 text-[13px] text-quiet">{detail}</p>}
    </div>
  );
}
