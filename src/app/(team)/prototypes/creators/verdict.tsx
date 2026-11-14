"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { fmt, lookalikes, pct, type Pro } from "./data";
import { Avatar, Cover, Drawer, ScoreRing, useSearch } from "./bits";
import { CrmPanel } from "./crm";
import { AudienceSignals, ChorusHistory, Collabs, GrowthChart, LookalikeList, ViewsBars } from "./report-parts";

const ASKS = [
  "Food creators in Lagos who get real engagement",
  "Safe comedy creators on TikTok",
  "Fashion in Abuja with email",
  "Micro tech creators who post often",
];

/** Direction 3, Verdict: ask in a sentence, get a ranked shortlist with a verdict in words for each creator. */
export default function Verdict() {
  const s = useSearch();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [open, setOpen] = useState<Pro | null>(null);
  const [report, setReport] = useState<Pro | null>(null);
  const [limit, setLimit] = useState(6);

  if (report) return <VerdictReport p={report} all={s.all} onBack={() => setReport(null)} onOpen={setReport} />;
  const ask = (text: string) => {
    setQ(text);
    setAsked(text);
    s.ask(text);
    setLimit(6);
  };
  const list = s.results.slice(0, limit);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#171715] px-6 pb-7 pt-8 text-white sm:px-10">
        <span className="absolute bottom-0 right-0 h-20 w-20 bg-[#f75115]" aria-hidden />
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-[44px]">Tell me the brief. I&apos;ll bring the creators.</h1>
        <form
          className="mt-6 flex max-w-2xl items-end gap-2 border-b-2 border-white/30 pb-2 focus-within:border-[#f75115]"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-white/35"
            placeholder="Who do you need?"
          />
          <button className="rounded-full bg-[#f75115] p-2.5 transition-transform active:scale-95" aria-label="Ask">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {ASKS.map((a) => (
            <button
              key={a}
              onClick={() => ask(a)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:border-white/60 hover:text-white"
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f75115] text-[13px] font-bold text-white">V</span>
        <div key={asked ?? "none"} className="proto-rise rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3 text-[15px] ring-1 ring-line">
          {asked ? (
            s.results.length ? (
              <>
                I found <b>{s.results.length} creators</b> for &ldquo;{asked}&rdquo;
                {s.chips.length > 0 && <> ({s.chips.join(" · ")})</>}. Best fits first, ranked by Creator Score. Each comes with why and what to watch.
              </>
            ) : (
              <>Nobody fits all of &ldquo;{asked}&rdquo;. Try fewer conditions, for example without the city.</>
            )
          ) : (
            <>Here are the strongest creators in the database right now. Ask for a niche, city, platform or size and I&apos;ll narrow it down.</>
          )}
        </div>
      </div>

      <ol className="space-y-3">
        {list.map((p, i) => (
          <li
            key={p.id}
            className="proto-rise group grid cursor-pointer gap-4 rounded-2xl border border-line bg-surface p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(23,23,21,.10)] md:grid-cols-[40px_minmax(0,1fr)_200px] md:items-center"
            style={{ animationDelay: `${i * 45}ms` }}
            onClick={() => setOpen(p)}
          >
            <span className="text-3xl font-bold tabular-nums text-[#f75115]">{i + 1}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Avatar p={p} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold group-hover:underline">{p.name}</p>
                  <p className="truncate text-xs text-muted">
                    {fmt(p.followers)} followers · {p.niche} · {p.city}
                  </p>
                </div>
                <span className="ml-auto md:hidden">
                  <ScoreRing score={p.score} size={44} />
                </span>
              </div>
              <p className="mt-2 text-[17px] font-medium leading-snug tracking-tight">{p.verdict}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.why.slice(0, 2).map((w) => (
                  <span key={w} className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good">
                    {w}
                  </span>
                ))}
                {p.watchOut.slice(0, 1).map((w) => (
                  <span key={w} className="rounded-full bg-bad-soft px-2.5 py-1 text-xs font-medium text-bad">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid flex-1 grid-cols-2 gap-1">
                {p.best.slice(0, 2).map((x) => (
                  <span key={x.id} className="pointer-events-none">
                    <Cover post={x} className="aspect-[3/4]" />
                  </span>
                ))}
              </div>
              <span className="hidden md:block">
                <ScoreRing score={p.score} size={52} stroke={5} />
              </span>
            </div>
          </li>
        ))}
      </ol>
      {s.results.length > limit && (
        <button onClick={() => setLimit((l) => l + 6)} className={cx(buttonClass.secondary, "mx-auto flex")}>
          Show {Math.min(6, s.results.length - limit)} more
        </button>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} width={640} dark>
        {open && (
          <VerdictDrawer
            key={open.id}
            p={open}
            all={s.all}
            onClose={() => setOpen(null)}
            onOpen={setOpen}
            onReport={() => {
              setReport(open);
              setOpen(null);
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

export interface DrawerExtras {
  /** Step through the results without closing (buttons and ← → keys). */
  nav?: { index: number; total: number; onPrev: () => void; onNext: () => void };
  compare?: { on: boolean; toggle: () => void };
  saved?: { on: boolean; toggle: () => void };
}

const SECTIONS = [
  ["summary", "Summary"],
  ["posts", "Posts"],
  ["audience", "Audience"],
  ["us", "With us"],
  ["notes", "Notes"],
] as const;

export function VerdictDrawer({
  p,
  all,
  onClose,
  onOpen,
  onReport,
  extras = {},
}: {
  p: Pro;
  all: Pro[];
  onClose: () => void;
  onOpen: (p: Pro) => void;
  onReport: () => void;
  extras?: DrawerExtras;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const { nav, compare, saved } = extras;
  useEffect(() => {
    if (!nav) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight") nav!.onNext();
      if (e.key === "ArrowLeft") nav!.onPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
  const jump = (id: string) => scroller.current?.querySelector(`#v-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const pill = "rounded-full px-2.5 py-1 text-xs font-medium transition-colors";
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
          {saved && (
            <button onClick={saved.toggle} className={cx(pill, saved.on ? "bg-white text-[#171715]" : "bg-white/10 text-white hover:bg-white/20")}>
              {saved.on ? "Saved" : "Save"}
            </button>
          )}
          {compare && (
            <button onClick={compare.toggle} className={cx(pill, compare.on ? "bg-[#f75115] text-white" : "bg-white/10 text-white hover:bg-white/20")}>
              {compare.on ? "In compare" : "Compare"}
            </button>
          )}
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(`${location.origin}/creators/${p.id}`).catch(() => undefined);
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
      <div ref={scroller} key={p.id} className="proto-rise min-h-0 flex-1 space-y-7 overflow-y-auto px-6 pb-6 pt-3">
        <div className="flex items-center gap-4">
          <Avatar p={p} size={64} />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight">{p.name}</h2>
            <p className="text-[13px] text-white/60">
              @{p.handle} · {p.niche} · {p.city}
            </p>
          </div>
          <ScoreRing score={p.score} size={64} stroke={5} dark />
        </div>
        <Block id="summary" title="The short version">
          <p className="text-xl font-semibold leading-snug tracking-tight">{p.verdict}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              [fmt(p.followers), "followers"],
              [pct(p.er), "engagement"],
              [fmt(p.avgViews), "typical views"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl bg-white/5 py-3">
                <p className="text-xl font-semibold tabular-nums">{v}</p>
                <p className="text-xs text-white/50">{k}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-white/5 p-3">
            <p className="mb-1 text-xs text-white/50">Views on their last 12 posts · hover a bar</p>
            <ViewsBars p={p} height={110} dark />
          </div>
        </Block>
        <div className="grid gap-4 sm:grid-cols-2">
          <Block title="Why they work">
            <ul className="space-y-2 text-[13px]">
              {p.why.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3ccf5a]" />
                  {w}
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Watch out">
            {p.watchOut.length ? (
              <ul className="space-y-2 text-[13px]">
                {p.watchOut.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b5b]" />
                    {w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-white/60">Nothing unusual in their numbers.</p>
            )}
          </Block>
        </div>
        <Block id="posts" title="Their best posts">
          <div className="grid grid-cols-3 gap-1.5">
            {p.best.slice(0, 6).map((x) => (
              <Cover key={x.id} post={x} className="aspect-[3/4]" />
            ))}
          </div>
        </Block>
        <Block id="audience" title="What their audience says">
          <p className="text-[13px] text-white/80">
            {p.sentiment.positive}% of comments are positive. People mostly talk about {p.commentThemes.join(", ")}. Comments are mostly in{" "}
            {p.languages[0].label} and {p.languages[1].label}
            {p.spamShare > 10 ? `; ${p.spamShare}% look like bots, which is high.` : "."}
          </p>
        </Block>
        <Block id="us" title="With Vernacular">
          {p.chorus.length ? (
            <ul className="space-y-1 text-[13px]">
              {p.chorus.map((c) => (
                <li key={c.campaign}>
                  {c.campaign} ({c.month}): <b className={c.vsUsual >= 1 ? "text-[#3ccf5a]" : "text-[#ff6b5b]"}>{c.vsUsual.toFixed(1)}× their usual views</b>
                  {c.onTime ? ", on time" : ", posted late"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-white/60">Not booked by Vernacular yet.</p>
          )}
        </Block>
        <Block id="notes" title="The team's notes">
          <CrmPanel p={p} dark />
        </Block>
        <Block title="Similar creators">
          <div className="flex flex-wrap gap-2">
            {lookalikes(p, all, 5).map((y) => (
              <button
                key={y.id}
                onClick={() => onOpen(y)}
                className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-[13px] hover:bg-white/10"
              >
                <Avatar p={y} size={26} />
                {y.name}
              </button>
            ))}
          </div>
        </Block>
      </div>
      <div className="shrink-0 border-t border-white/10 px-6 py-4">
        <button onClick={onReport} className="w-full rounded-xl bg-[#f75115] py-3 text-[15px] font-semibold text-white transition-transform active:scale-[.98]">
          Open the full report
        </button>
      </div>
    </>
  );
}

function Block({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id ? `v-${id}` : undefined} className="scroll-mt-3">
      <p className="mb-2 text-xs font-medium text-[#f75115]">{title}</p>
      {children}
    </section>
  );
}

export function VerdictReport({ p, all, onBack, onOpen }: { p: Pro; all: Pro[]; onBack: () => void; onOpen: (p: Pro) => void }) {
  return (
    <article className="proto-rise mx-auto max-w-5xl space-y-4">
      <div className="no-print flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <Icon name="back" size={14} /> Back to the shortlist
        </button>
        <button onClick={() => window.print()} className={buttonClass.secondary}>
          <Icon name="download" size={14} /> Download PDF
        </button>
      </div>
      <Sheet dark>
        <div className="flex h-full flex-col justify-between">
          <p className="text-[13px] text-white/60">Creator report · prepared by Vernacular</p>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold leading-none tracking-tight sm:text-6xl">{p.name}</h1>
              <p className="mt-3 text-lg text-[#f75115]">
                {p.niche} creator in {p.city} · @{p.handle}
              </p>
            </div>
            <ScoreRing score={p.score} size={96} stroke={7} dark />
          </div>
        </div>
        <span className="absolute right-0 top-0 h-[22%] w-[12%] bg-[#f75115]" />
      </Sheet>
      <Sheet>
        <h2 className="text-3xl font-bold leading-tight tracking-tight">{p.verdict}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [fmt(p.followers), "Followers"],
            [pct(p.er), "Engagement"],
            [fmt(p.avgViews), "Typical views"],
            [p.viewsRatio ? `${Math.round(p.viewsRatio * 100)}%` : "—", "Of followers reached"],
          ].map(([v, k], i) => (
            <div key={k} className={cx("rounded-2xl p-5", i === 2 ? "bg-[#171715] text-white" : "bg-white")}>
              <p className="text-3xl font-bold tabular-nums tracking-tight">{v}</p>
              <p className={cx("mt-1 text-[13px]", i === 2 ? "text-white/60" : "text-muted")}>{k}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-1 text-[13px] font-semibold">Followers over the year</p>
            <GrowthChart p={p} height={170} />
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-1 text-[13px] font-semibold">Views on their last 12 posts</p>
            <ViewsBars p={p} height={170} />
          </div>
        </div>
      </Sheet>
      <Sheet>
        <h2 className="text-3xl font-bold tracking-tight">What they make</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 md:grid-cols-6">
          {p.best.slice(0, 6).map((x) => (
            <Cover key={x.id} post={x} className="aspect-[3/4]" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5">
            <p className="mb-3 text-[13px] font-semibold">Brands</p>
            <Collabs p={p} />
          </div>
          <div className="rounded-2xl bg-white p-5">
            <p className="mb-3 text-[13px] font-semibold">With Vernacular</p>
            <ChorusHistory p={p} />
          </div>
        </div>
      </Sheet>
      <Sheet>
        <h2 className="text-3xl font-bold tracking-tight">Who they reach</h2>
        <p className="mt-1 text-[13px] text-muted">Estimated from the people commenting on their posts.</p>
        <div className="mt-5 rounded-2xl bg-white p-5">
          <AudienceSignals p={p} />
        </div>
      </Sheet>
      <Sheet>
        <h2 className="text-3xl font-bold tracking-tight">If not {p.name.split(" ")[0]}, try</h2>
        <div className="mt-5 rounded-2xl bg-white p-5">
          <LookalikeList list={lookalikes(p, all)} onOpen={onOpen} />
        </div>
      </Sheet>
    </article>
  );
}

function Sheet({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={cx("relative overflow-hidden rounded-3xl p-8 sm:p-12", dark ? "min-h-[360px] bg-[#171715] text-white" : "bg-[#f2eee3] text-[#171715]")}>
      {children}
    </section>
  );
}
