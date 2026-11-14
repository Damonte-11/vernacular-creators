"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { actions, useAppState } from "@/lib/data/store";
import { similar, type CreatorView } from "@/lib/creator-view";
import { formatNumber, formatPercent } from "@/lib/format";
import { postNumbers } from "@/lib/projects";
import { AddToProject } from "../add-to-project";
import { Icon } from "../icons";
import { cx } from "../ui";
import { Avatar, PostCover, ScoreRing } from "./media";

export interface ProfileNav {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const SECTIONS = [
  ["summary", "Summary"],
  ["posts", "Posts"],
  ["tags", "Tags"],
  ["us", "With us"],
  ["team", "Team"],
] as const;

/** The quick look: a dark drawer that tells the creator's story, steps through results and links to the full profile. */
export function ProfileDrawer({
  v,
  all,
  nav,
  compare,
  onClose,
  onOpen,
}: {
  v: CreatorView;
  all: CreatorView[];
  nav?: ProfileNav;
  compare: { on: boolean; toggle: () => void };
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!nav) return;
    function onKey(e: KeyboardEvent) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      if (e.key === "ArrowRight") nav!.onNext();
      if (e.key === "ArrowLeft") nav!.onPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
  const pill = "rounded-full px-2.5 py-1 text-xs font-medium transition-colors";
  const jump = (id: string) => scroller.current?.querySelector(`#cr-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-6 pt-4">
        {nav ? (
          <span className="flex items-center gap-1 text-[13px] text-white/60">
            <button
              onClick={nav.onPrev}
              disabled={nav.index === 0}
              className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"
              aria-label="Previous creator"
            >
              <Icon name="back" size={15} />
            </button>
            <span className="tabular-nums">
              {nav.index + 1} of {nav.total}
            </span>
            <button
              onClick={nav.onNext}
              disabled={nav.index >= nav.total - 1}
              className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"
              aria-label="Next creator"
            >
              <Icon name="back" size={15} className="rotate-180" />
            </button>
          </span>
        ) : (
          <span className="text-[13px] text-white/50">Quick look</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={compare.toggle} className={cx(pill, compare.on ? "bg-accent text-white" : "bg-white/10 text-white hover:bg-white/20")}>
            {compare.on ? "In compare" : "Compare"}
          </button>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(`${location.origin}/creators/${v.id}`).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={cx(pill, "bg-white/10 text-white hover:bg-white/20")}
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </span>
      </div>
      <nav className="flex shrink-0 gap-1 overflow-x-auto px-6 pb-1 pt-3" aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => jump(id)} className={cx(pill, "shrink-0 text-white/60 ring-1 ring-white/15 hover:text-white hover:ring-white/40")}>
            {label}
          </button>
        ))}
      </nav>
      <div ref={scroller} key={v.id} className="cr-rise min-h-0 flex-1 space-y-7 overflow-y-auto px-6 pb-6 pt-3">
        <div className="flex items-center gap-4">
          <Avatar v={v} size={64} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold tracking-tight">{v.name}</h2>
            <p className="truncate text-[13px] text-white/60">
              <a href={profileUrl(v)} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
                @{v.handle}
              </a>
              {v.niche ? ` · ${v.niche}` : ""}
              {v.city ? ` · ${v.city}` : ""}
            </p>
          </div>
          <ScoreRing score={v.score} size={64} stroke={5} dark />
        </div>

        <Block id="summary" title="The short version">
          <p className="text-xl font-semibold leading-snug tracking-tight">{v.verdict}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              [formatNumber(v.followers), "followers"],
              [v.er === null ? "—" : formatPercent(v.er), "engagement"],
              [v.views === null ? "—" : formatNumber(v.views), "expected views"],
            ].map(([n, k]) => (
              <div key={k} className="rounded-xl bg-white/5 py-3">
                <p className="text-xl font-semibold tabular-nums">{n}</p>
                <p className="text-xs text-white/50">{k}</p>
              </div>
            ))}
          </div>
          <ViewBars v={v} />
        </Block>

        <div className="grid gap-5 sm:grid-cols-2">
          <Block title="Why they work">
            <Dots items={v.why} tone="#3ccf5a" empty="Nothing stands out yet." />
          </Block>
          <Block title="Watch out">
            <Dots items={v.watchOut} tone="#ff6b5b" empty="Nothing unusual in their numbers." />
          </Block>
        </div>

        <Block id="posts" title="Their best posts">
          {v.best.length ? (
            <div className="grid grid-cols-3 gap-1.5">
              {v.best.slice(0, 6).map((p) => (
                <PostCover key={p.id} post={p} className="aspect-[3/4]" />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-white/60">No posts read yet.</p>
          )}
        </Block>

        <Block id="tags" title="Brands and accounts they tag">
          {v.mentions.length ? (
            <div className="flex flex-wrap gap-1.5">
              {v.mentions.slice(0, 12).map((m) => (
                <span
                  key={m.handle}
                  className={cx("rounded-full px-2.5 py-1 text-xs", m.paid ? "bg-accent/20 text-white ring-1 ring-accent/50" : "bg-white/5 text-white/80")}
                >
                  {m.handle}
                  <span className="text-white/50"> · {m.posts}</span>
                  {m.paid && <span className="text-[#ffb08f]"> · paid</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-white/60">They don&apos;t tag brands or accounts in their recent captions.</p>
          )}
          <p className="mt-2 text-xs text-white/40">From their recent captions. &ldquo;Paid&rdquo; means the post said #ad, sponsored or paid partnership.</p>
        </Block>

        <Block id="us" title="With Vernacular">
          <History v={v} />
        </Block>

        <Block id="team" title="The team's notes">
          <Team v={v} />
        </Block>

        <Block title="Similar creators">
          <div className="flex flex-wrap gap-2">
            {similar(v, all, 6).map((y) => (
              <button
                key={y.id}
                onClick={() => onOpen(y.id)}
                className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-[13px] hover:bg-white/10"
              >
                <Avatar v={y} size={26} />
                {y.name}
              </button>
            ))}
          </div>
        </Block>
      </div>
      <div className="shrink-0 border-t border-white/10 px-6 py-4">
        <Link
          href={`/creators/${v.id}`}
          className="block w-full rounded-xl bg-accent py-3 text-center text-[15px] font-semibold text-white transition-transform active:scale-[.98]"
        >
          Open the full profile
        </Link>
      </div>
    </>
  );
}

function profileUrl(v: CreatorView): string {
  return v.platform === "instagram"
    ? `https://www.instagram.com/${v.handle}/`
    : v.platform === "tiktok"
      ? `https://www.tiktok.com/@${v.handle}`
      : `https://www.youtube.com/${v.handle.startsWith("UC") ? `channel/${v.handle}` : `@${v.handle}`}`;
}

function Block({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id ? `cr-${id}` : undefined} className="scroll-mt-3">
      <p className="mb-2 text-xs font-medium text-accent">{title}</p>
      {children}
    </section>
  );
}

function Dots({ items, tone, empty }: { items: string[]; tone: string; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-white/60">{empty}</p>;
  return (
    <ul className="space-y-2 text-[13px]">
      {items.map((w) => (
        <li key={w} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
          {w}
        </li>
      ))}
    </ul>
  );
}

/** Views of the last 12 posts against their usual (dashed). Orange: beat the usual by 30% or more. */
function ViewBars({ v }: { v: CreatorView }) {
  const vals = v.viewSeries.map((x) => x ?? 0);
  if (!vals.some(Boolean)) return null;
  const usual = v.views ?? 0;
  const top = Math.max(...vals, usual) * 1.1;
  return (
    <div className="mt-4 rounded-xl bg-white/5 p-3">
      <p className="mb-2 text-xs text-white/50">Views on their last {vals.length} posts · dashed line is their usual · hover a bar</p>
      <div className="relative flex h-24 items-end gap-1">
        {usual > 0 && <span className="absolute inset-x-0 border-t border-dashed border-white/50" style={{ bottom: `${(usual / top) * 100}%` }} />}
        {vals.map((x, i) => (
          <span
            key={i}
            title={`${formatNumber(x)} views`}
            className={cx("flex-1 rounded-t-[3px]", x >= usual * 1.3 ? "bg-accent" : "bg-white/30")}
            style={{ height: `${Math.max(2, (x / top) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Past projects with this creator: their views against their usual, and whether they posted on time. */
export function History({ v, light }: { v: CreatorView; light?: boolean }) {
  const { projects } = useAppState();
  const rows = useMemo(
    () =>
      projects.flatMap((p) => {
        const posts = p.posts.filter((x) => x.creatorId === v.id);
        if (!posts.length) return [];
        const views = posts.map((x) => postNumbers(x).views).filter((x): x is number => x !== null);
        const avg = views.length ? views.reduce((a, b) => a + b, 0) / views.length : null;
        const due = p.creators.find((c) => c.creatorId === v.id)?.dueDate ?? null;
        const late = due !== null && posts.some((x) => x.postedDate !== null && x.postedDate > due);
        return [{ id: p.id, name: p.name, start: p.startDate, vsUsual: avg !== null && v.views ? avg / v.views : null, late }];
      }),
    [projects, v.id, v.views],
  );
  const muted = light ? "text-muted" : "text-white/50";
  if (!rows.length) return <p className={cx("text-[13px]", light ? "text-muted" : "text-white/60")}>Not on any Vernacular project yet.</p>;
  return (
    <ul className="space-y-1.5 text-[13px]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2">
          <Link href={`/projects/${r.id}`} className="font-medium hover:underline">
            {r.name}
          </Link>
          <span className="tabular-nums">
            {r.vsUsual === null ? (
              <span className={muted}>numbers not read yet</span>
            ) : (
              <b className={r.vsUsual >= 1 ? (light ? "text-good" : "text-[#3ccf5a]") : light ? "text-bad" : "text-[#ff6b5b]"}>
                {r.vsUsual.toFixed(1)}× their usual views
              </b>
            )}
            <span className={muted}>{r.late ? " · posted late" : ""}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Team({ v }: { v: CreatorView }) {
  const c = v.a.creator;
  const [notes, setNotes] = useState(c.notes);
  return (
    <div className="space-y-3 rounded-xl bg-surface p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="text-ink-2">
          {v.email ? (
            <a href={`mailto:${v.email}`} className="font-medium text-ink underline underline-offset-2">
              {v.email}
            </a>
          ) : (
            "No email yet"
          )}
        </span>
        <AddToProject creatorId={v.id} />
      </div>
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2 ring-1 ring-line">
              {t}
            </span>
          ))}
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Notes (team only)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== c.notes && actions.editCreator(c.id, { notes })}
          rows={3}
          className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          placeholder="Rates quoted, how they are to work with…"
        />
      </label>
      <p className="text-xs text-muted">Niche, city, tags, linked accounts and setting posts aside are on the full profile.</p>
    </div>
  );
}
