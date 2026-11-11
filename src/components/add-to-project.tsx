"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { actions, useAppState } from "@/lib/data/store";
import { projectPhase, todayLagos } from "@/lib/projects";
import { Icon } from "./icons";
import { buttonClass, cx } from "./ui";

/** Book a creator on a running or upcoming project, from anywhere a creator is shown. */
export function AddToProject({ creatorId, compact }: { creatorId: string; compact?: boolean }) {
  const { projects } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayLagos();
  const open_ = projects.filter((p) => projectPhase(p, today) !== "finished").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const onCount = projects.filter((p) => p.creators.some((c) => c.creatorId === creatorId)).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = onCount > 0 ? `On ${onCount} project${onCount > 1 ? "s" : ""}` : "Add to project";
  return (
    <div className="relative" ref={ref}>
      <button
        className={compact ? cx(buttonClass.icon, onCount > 0 && "text-accent-ink") : buttonClass.secondary}
        onClick={() => setOpen((o) => !o)}
        aria-label={onCount > 0 ? `${label}: change` : label}
        aria-expanded={open}
        title={label}
      >
        <Icon name={onCount > 0 ? "check" : "plus"} size={15} />
        {!compact && label}
      </button>
      {open && (
        <div className="fade-enter absolute right-0 z-20 mt-1 w-72 rounded-xl border border-line bg-surface p-1.5 text-left shadow-lg">
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted">Add to a project</p>
          {open_.length === 0 && <p className="px-2 py-1.5 text-xs text-muted">No running or upcoming projects.</p>}
          {open_.map((p) => {
            const on = p.creators.some((c) => c.creatorId === creatorId);
            return (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={on}
                  className="accent-[var(--color-accent)]"
                  onChange={() =>
                    on
                      ? window.confirm(`Remove from "${p.name}"? Their links there stay, unmatched.`) && actions.removeProjectCreators(p.id, [creatorId])
                      : actions.upsertProjectCreators(p.id, [{ creatorId, dueDate: p.startDate > today ? p.startDate : today, postsAgreed: 1 }])
                  }
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </label>
            );
          })}
          <div className="mt-1 border-t border-line px-2 pb-1 pt-2 text-xs text-muted">
            Due dates and posts agreed are set on the project.{" "}
            <Link href="/projects/new" className="font-medium text-ink-2 underline">
              New project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
