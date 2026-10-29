"use client";
import type { ReactNode } from "react";
import { formatNumber } from "@/lib/format";
import { platformName } from "@/lib/platforms";
import type { Creator } from "@/lib/types";
import { Icon } from "./icons";
import { Avatar, CreatorLink } from "./ui";

/** "Already in your database": saved creators matching a search, shown before any platform is asked. */
export function SavedMatches({ matches, title = "Already in your database", action }: { matches: Creator[]; title?: string; action?: (c: Creator) => ReactNode }) {
  if (matches.length === 0) return null;
  return (
    <div className="rounded-xl bg-surface-2 p-2 ring-1 ring-line">
      <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-muted">{title}</p>
      <ul>
        {matches.map((c) => {
          const row = (
            <>
              <Icon name={c.platform} size={16} className="shrink-0 text-ink-2" />
              <Avatar name={c.name} photoUrl={c.photoUrl} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted">
                  @{c.handle} · {platformName(c.platform)} · {formatNumber(c.followers)} followers
                </span>
              </span>
            </>
          );
          return (
            <li key={c.id}>
              {action ? (
                <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                  {row}
                  {action(c)}
                </div>
              ) : (
                <CreatorLink id={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                  {row}
                  <span className="text-xs font-semibold text-ink-2">Open</span>
                </CreatorLink>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
