"use client";
import { useEffect, useRef, useState } from "react";
import { actions, useAppState } from "@/lib/data/store";
import { buttonClass, cx, inputClass } from "./ui";
import { Icon } from "./icons";

export function AddToShortlist({ creatorId, compact }: { creatorId: string; compact?: boolean }) {
  const { shortlists } = useAppState();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inCount = shortlists.filter((l) => l.items.some((i) => i.creatorId === creatorId)).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className={compact ? cx(buttonClass.ghost, inCount > 0 && "text-accent-ink") : buttonClass.secondary}
        onClick={() => setOpen((o) => !o)}
        aria-label="Add to shortlist"
        title="Add to shortlist"
      >
        <Icon name={inCount > 0 ? "check" : "plus"} size={16} />
        {compact ? null : inCount > 0 ? `In ${inCount} shortlist${inCount > 1 ? "s" : ""}` : "Add to shortlist"}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
          {shortlists.length === 0 && <p className="px-2 py-1 text-xs text-muted">No shortlists yet.</p>}
          {shortlists.map((l) => {
            const checked = l.items.some((i) => i.creatorId === creatorId);
            return (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-canvas">
                <input type="checkbox" checked={checked} onChange={() => actions.toggleInShortlist(l.id, creatorId)} className="accent-[var(--color-accent)]" />
                <span className="truncate">{l.name}</span>
              </label>
            );
          })}
          <form
            className="mt-2 flex gap-1 border-t border-line pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const id = actions.createShortlist(newName.trim(), "");
              actions.toggleInShortlist(id, creatorId);
              setNewName("");
            }}
          >
            <input className={cx(inputClass, "py-1.5")} placeholder="New shortlist name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className={cx(buttonClass.primary, "px-3 py-1.5")} aria-label="Create shortlist">
              <Icon name="plus" size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
