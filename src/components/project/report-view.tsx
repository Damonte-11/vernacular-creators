"use client";
import { useEffect, useMemo, useState } from "react";
import {
  numbersReport,
  OBJECTIVE_SIGNALS,
  postsForComments,
  SECTION_TITLES,
  SIGNALS,
  videoSummary,
  type CommentStats,
  type ReportSections,
} from "@/lib/campaign-report";
import { useAnalyses } from "@/lib/data/creators";
import { actions } from "@/lib/data/store";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { chorusLabel, OBJECTIVES, shortDate, todayLagos } from "@/lib/projects";
import { IS_LIVE } from "@/lib/supabase/config";
import type { CreatorAnalysis, Project } from "@/lib/types";
import { Icon } from "../icons";
import { buttonClass, Card, cx, SectionHeader, StatStrip, StatTile } from "../ui";
import { PaceBar, TONE_TEXT, verdictText } from "./summary";

const pctOf = (n: number, d: number) => (d ? n / d : 0);

/** The end-of-campaign report: live numbers, plus comments and a draft once it's been made. */
export function ReportView({ p }: { p: Project }) {
  const all = useAnalyses();
  const analyses = useMemo(() => new Map<string, CreatorAnalysis>(all.map((a) => [a.creator.id, a])), [all]);
  const today = todayLagos();
  const n = useMemo(() => numbersReport(p, analyses, today), [p, analyses, today]);
  const r = p.report ?? null;
  const v = verdictText(n.totals, p);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const toRead = postsForComments(p, today);
  const paid = toRead.filter((x) => x.platform !== "youtube").length;

  async function make() {
    if (r && !window.confirm("Make the report again? Comments are read again (using Apify credit for TikTok and Instagram) and the written draft is replaced."))
      return;
    setBusy(true);
    setNote(null);
    setNote(await actions.generateReport(p.id));
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {r ? (
            <>
              Made {formatDate(r.generatedAt)} · {formatNumber(r.commentsRead)} comments read · draft by{" "}
              {r.writtenBy === "ai" ? (r.aiName ?? "AI") : "plain rules"}
            </>
          ) : (
            <>
              Reads up to {formatNumber(p.commentCap)} comments from each of {toRead.length} posts
              {paid ? ` (${paid} on TikTok or Instagram use Apify credit; YouTube is free)` : ""}, then analyses them and drafts the report.
            </>
          )}
        </p>
        <div className="flex gap-2">
          {r && (
            <button className={buttonClass.secondary} onClick={() => window.print()}>
              <Icon name="download" size={14} /> Download PDF
            </button>
          )}
          <button className={r ? buttonClass.secondary : buttonClass.primary} onClick={make} disabled={busy || toRead.length === 0}>
            {busy ? "Reading comments and writing… (a few minutes)" : r ? "Make it again" : "Create report"}
          </button>
        </div>
      </div>
      {note && (
        <p role="status" className="no-print rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
          {note}
        </p>
      )}

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{p.name}: campaign report</h1>
        <p className="text-[13px] text-ink-2">
          {p.client} · Chorus {chorusLabel(p.chorusType)} · {OBJECTIVES.find((o) => o.id === p.objective)?.label} · {shortDate(p.startDate)} –{" "}
          {shortDate(p.endDate)}
        </p>
      </div>

      {/* Guarantee and numbers */}
      <Card className="p-4 sm:p-5">
        <p className={cx("text-base font-semibold", TONE_TEXT[v.tone])}>{v.label}</p>
        <p className="mt-0.5 text-[13px] text-ink-2">{v.line}</p>
        <div className="mt-4">
          <PaceBar p={p} t={n.totals} />
        </div>
      </Card>
      <StatStrip cols={5}>
        <StatTile label="Views" value={formatNumber(n.totals.views)} />
        <StatTile label="Engagements" value={formatNumber(n.totals.engagements)} />
        <StatTile label="ER by views" value={n.totals.erByViews === null ? "—" : formatPercent(n.totals.erByViews)} />
        <StatTile label="Posts" value={`${n.totals.posts} of ${n.totals.postsAgreed}`} />
        <StatTile label="Posted on time" value={n.onTimeShare === null ? "—" : formatPercent(n.onTimeShare, 0)} />
      </StatStrip>

      {/* Written draft */}
      {r && <Draft p={p} sections={r.sections} />}

      {/* Creators, in rebook order */}
      <Card className="overflow-hidden">
        <div className="p-4 pb-3 sm:px-5">
          <SectionHeader title="Creators, best to rebook first" description="Views against each creator's usual, engagement by views, and posting on time." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-4 pr-3 font-medium sm:pl-5">Creator</th>
                <th className="px-3 py-2 text-right font-medium">Posts</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
                <th className="px-3 py-2 text-right font-medium">Vs usual</th>
                <th className="px-3 py-2 text-right font-medium">ER by views</th>
                <th className="px-3 py-2 font-medium">On time</th>
                <th className="py-2 pl-3 pr-4 font-medium sm:pr-5">Rebook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {n.creators.map((c) => (
                <tr key={c.creatorId}>
                  <td className="py-2 pl-4 pr-3 sm:pl-5">
                    <span className="flex items-center gap-1.5 font-medium">
                      {c.platform && <Icon name={c.platform as "instagram"} size={12} className="text-muted" />}
                      {c.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.posts}/{c.postsAgreed}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.views)}</td>
                  <td
                    className={cx(
                      "px-3 py-2 text-right tabular-nums",
                      c.vsUsual !== null && (c.vsUsual >= 1 ? "text-good" : c.vsUsual < 0.7 ? "text-bad" : ""),
                    )}
                  >
                    {c.vsUsual === null ? "—" : `${c.vsUsual.toFixed(1)}×`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.er === null ? "—" : formatPercent(c.er)}</td>
                  <td className={cx("px-3 py-2", c.onTime === false && "text-bad")}>{c.onTime === null ? "—" : c.onTime ? "Yes" : "Late"}</td>
                  <td className="py-2 pl-3 pr-4 sm:pr-5">
                    <span className="flex items-center gap-2">
                      <span className="block h-1.5 w-16 rounded-full bg-line">
                        <span className="block h-1.5 rounded-full bg-accent" style={{ width: `${c.rebookScore}%` }} />
                      </span>
                      <span className="tabular-nums text-muted">{c.rebookScore}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Brief check */}
      {n.briefChecks.length > 0 && (
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="Brief check"
            description={
              n.captions
                ? `Captions of ${n.captions} posts checked for the must-says and hashtags.`
                : "Captions are saved when post numbers are read; check numbers first."
            }
          />
          {n.captions > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {n.briefChecks.map((b) => (
                <li key={b.kind + b.item} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span>
                    <span className="text-muted">{b.kind === "hashtag" ? "Hashtag" : "Must say"}:</span> {b.item}
                  </span>
                  <span className={cx("tabular-nums", b.found === b.checked ? "text-good" : b.found / b.checked < 0.5 ? "text-bad" : "text-warn")}>
                    {b.found} of {b.checked} posts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* What the videos show */}
      <VideoPanel p={p} names={new Map(n.creators.map((c) => [c.creatorId, c.name]))} />

      {/* Comments */}
      {r ? <CommentsPanel p={p} stats={r.stats} themes={r.themes} quotes={r.quotes} /> : null}

      {r && (r.notes.length > 0 || r.sources.some((s) => s.note)) && (
        <Card className="no-print p-4 text-[13px] text-ink-2">
          <p className="font-medium text-ink">Notes on this report</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {r.notes.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>
      )}
      {!IS_LIVE && !r && (
        <p className="text-xs text-muted">Demo: the report uses made-up comments read by plain rules. On the live app the AI reads the real comments.</p>
      )}
    </div>
  );
}

const KEY_MESSAGE: Record<string, string> = { said: "Said", on_screen: "On screen", both: "Said and shown", missing: "Missing" };

/** The AI watches each post's video and checks it against the brief. */
function VideoPanel({ p, names }: { p: Project; names: Map<string, string> }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const v = videoSummary(p);
  const posts = p.posts.filter((x) => x.creatorId);
  const tiktok = posts.filter((x) => x.platform === "tiktok" && (!x.contentReview || x.contentReview.problem)).length;
  const nameOf = (id: string | null) => (id && names.get(id)) || "—";
  const left = posts.filter((x) => !x.contentReview || x.contentReview.problem).length;

  async function watch(again = false) {
    if (again && !window.confirm("Watch every video again? Earlier reviews are replaced (TikTok videos use Apify credit).")) return;
    setBusy(true);
    setNote(null);
    setNote((await actions.watchVideos(p.id, again)).message);
    setBusy(false);
  }

  if (posts.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:px-5">
        <SectionHeader
          title="What the videos show"
          description={`The AI watches each post and checks it against the brief. ${v.watched} of ${v.posts} watched${v.failed ? `, ${v.failed} couldn't be` : ""}.`}
        />
        <div className="no-print flex gap-2">
          {v.watched > 0 && left === 0 && (
            <button className={buttonClass.secondary} onClick={() => watch(true)} disabled={busy}>
              Watch again
            </button>
          )}
          {left > 0 && (
            <button className={v.watched ? buttonClass.secondary : buttonClass.primary} onClick={() => watch()} disabled={busy}>
              {busy ? "Watching… (a few minutes)" : v.watched ? `Watch the next ${Math.min(4, left)}` : "Watch the videos"}
            </button>
          )}
        </div>
      </div>
      {note && (
        <p role="status" className="no-print mx-4 mb-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line sm:mx-5">
          {note}
        </p>
      )}
      {left > 0 && !busy && (
        <p className="no-print mx-4 mb-3 text-xs text-muted sm:mx-5">
          About 4 videos per click.{tiktok ? ` TikTok videos are downloaded through Apify (a few cents each); YouTube and Instagram are free.` : ""}
        </p>
      )}
      {v.watched > 0 && (
        <>
          <StatStrip cols={4} className="mx-4 mb-3 sm:mx-5">
            <StatTile label="Product shown" value={`${v.productShown} of ${v.watched}`} />
            <StatTile label="Product appears at" value={v.medianFirstSecond === null ? "—" : `${v.medianFirstSecond}s (middle)`} />
            <StatTile label="Key message across" value={`${v.keyMessage} of ${v.watched}`} />
            <StatTile label="Call to action" value={`${v.callToAction} of ${v.watched}`} />
          </StatStrip>
          {(v.mustSays.length > 0 || v.donts.length > 0) && (
            <ul className="mx-4 mb-3 divide-y divide-line text-[13px] sm:mx-5">
              {v.mustSays.map((m) => (
                <li key={m.item} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="text-muted">Must say:</span> {m.item}
                  </span>
                  <span className={cx("tabular-nums", m.found === v.watched ? "text-good" : m.found / v.watched < 0.5 ? "text-bad" : "text-warn")}>
                    {m.found} of {v.watched} videos
                  </span>
                </li>
              ))}
              {v.donts.map((d) => (
                <li key={d.item} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="text-muted">Don&apos;t broken:</span> {d.item}
                  </span>
                  <span className="tabular-nums text-bad">
                    {d.posts} {d.posts === 1 ? "video" : "videos"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {posts.some((x) => x.contentReview) && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="py-2 pl-4 pr-3 font-medium sm:pl-5">Post</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Key message</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="py-2 pl-3 pr-4 font-medium sm:pr-5">Hook and notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {posts
                .filter((x) => x.contentReview)
                .map((x) => {
                  const c = x.contentReview!;
                  const missed = (c.mustSays ?? []).filter((m) => !m.found).map((m) => m.item);
                  return (
                    <tr key={x.id}>
                      <td className="py-2 pl-4 pr-3 sm:pl-5">
                        <a href={x.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-medium hover:underline">
                          {x.platform && <Icon name={x.platform as "instagram"} size={12} className="text-muted" />}
                          {nameOf(x.creatorId)}
                        </a>
                      </td>
                      {c.problem ? (
                        <td colSpan={4} className="py-2 pl-3 pr-4 text-muted sm:pr-5">
                          Not watched: {c.problem}
                        </td>
                      ) : (
                        <>
                          <td className={cx("px-3 py-2", !c.productShown && "text-bad")}>
                            {c.productShown ? (c.productFirstSecond != null ? `Yes, at ${c.productFirstSecond}s` : "Yes") : "Not shown"}
                          </td>
                          <td className={cx("px-3 py-2", c.keyMessage === "missing" && "text-bad")}>{KEY_MESSAGE[c.keyMessage ?? "missing"]}</td>
                          <td className="px-3 py-2 capitalize">{c.format || "—"}</td>
                          <td className="py-2 pl-3 pr-4 sm:pr-5">
                            {c.hook && <p className="text-ink-2">“{c.hook}”</p>}
                            {c.note && <p className="mt-0.5 text-muted">{c.note}</p>}
                            {(missed.length > 0 || (c.dontsBroken ?? []).length > 0 || c.callToAction === false) && (
                              <p className="mt-0.5 text-bad">
                                {[
                                  missed.length ? `Missed: ${missed.join(", ")}` : "",
                                  (c.dontsBroken ?? []).length ? `Broke: ${c.dontsBroken!.join(", ")}` : "",
                                  c.callToAction === false ? "No call to action" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Draft({ p, sections }: { p: Project; sections: ReportSections }) {
  const [draft, setDraft] = useState(sections);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(sections), [sections]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(sections);
  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader title="The written report" description="A draft to edit before it goes to the client." className="no-print" />
      <div className="mt-3 space-y-4">
        {SECTION_TITLES.map(({ key, title }) => (
          <div key={key}>
            <p className="text-[13px] font-semibold">{title}</p>
            <textarea
              className="no-print mt-1 min-h-20 w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              value={draft[key]}
              onChange={(e) => {
                setDraft({ ...draft, [key]: e.target.value });
                setSaved(false);
              }}
              aria-label={title}
              rows={Math.min(8, Math.max(3, Math.ceil(draft[key].length / 110)))}
            />
            <p className="hidden whitespace-pre-line text-[13px] leading-relaxed print:block">{draft[key]}</p>
          </div>
        ))}
      </div>
      <div className="no-print mt-3 flex items-center gap-3">
        <button
          className={buttonClass.primary}
          disabled={!dirty}
          onClick={async () => {
            await actions.updateProject(p.id, { report: { ...p.report!, sections: draft } });
            setSaved(true);
          }}
        >
          Save draft
        </button>
        {saved && !dirty && <span className="text-[13px] text-good">Saved.</span>}
      </div>
    </Card>
  );
}

function Bar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={parts.map((x) => `${x.label} ${Math.round(pctOf(x.value, total) * 100)}%`).join(", ")}
      >
        {parts.map((x) => (
          <div key={x.label} className={x.className} style={{ width: `${pctOf(x.value, total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {parts.map((x) => (
          <span key={x.label} className="inline-flex items-center gap-1.5">
            <span className={cx("h-2 w-2 rounded-sm", x.className)} aria-hidden /> {x.label} {Math.round(pctOf(x.value, total) * 100)}%{" "}
            <span className="text-muted">({x.value})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CommentsPanel({
  p,
  stats,
  themes,
  quotes,
}: {
  p: Project;
  stats: CommentStats;
  themes: string[];
  quotes: { positive: { text: string }[]; negative: { text: string }[]; questions: { text: string }[] };
}) {
  const lead = OBJECTIVE_SIGNALS[p.objective];
  const real = stats.read - stats.about.spam;
  const languages = Object.entries(stats.languages)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (stats.read === 0) {
    return (
      <Card className="p-4 text-[13px] text-ink-2">
        <p className="font-semibold text-ink">Comments</p>
        <p className="mt-1">No comments could be read for this report. See the notes below.</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeader
          title="What people think of the brand"
          description={`From ${formatNumber(stats.about.brand)} comments about the brand or product, out of ${formatNumber(stats.read)} read.`}
        />
        <Bar
          parts={[
            { label: "Positive", value: stats.brand.positive, className: "bg-good" },
            { label: "Neutral", value: stats.brand.neutral, className: "bg-line-strong" },
            { label: "Negative", value: stats.brand.negative, className: "bg-bad" },
          ]}
        />
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">What the comments were about</p>
          <Bar
            parts={[
              { label: "The brand", value: stats.about.brand, className: "bg-accent" },
              { label: "The creator", value: stats.about.creator, className: "bg-ink" },
              { label: "Other", value: stats.about.other, className: "bg-line-strong" },
              { label: "Spam or bots", value: stats.about.spam, className: "bg-warn" },
            ]}
          />
        </div>
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-[13px]">
          <div>
            <dt className="text-xs text-muted">Started a conversation</dt>
            <dd className="font-semibold tabular-nums">{formatPercent(pctOf(stats.withReplies, real), 0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Languages</dt>
            <dd className="font-medium">
              {languages.map(([l, c]) => `${l[0].toUpperCase()}${l.slice(1)} ${Math.round(pctOf(c, real) * 100)}%`).join(", ") || "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <SectionHeader
          title={`Signals for ${OBJECTIVES.find((o) => o.id === p.objective)?.label.toLowerCase()}`}
          description="How many comments showed each, out of the real (non-spam) comments read."
        />
        <ul className="space-y-2">
          {[...lead, ...SIGNALS.map((s) => s.id).filter((s) => !lead.includes(s))].map((id) => {
            const label = SIGNALS.find((s) => s.id === id)!.label;
            const count = stats.signals[id];
            return (
              <li key={id} className={cx("flex items-center gap-3 text-[13px]", !lead.includes(id) && "text-ink-2")}>
                <span className="w-56 shrink-0">
                  {label}
                  {lead.includes(id) && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent-ink">Key</span>}
                </span>
                <span className="block h-1.5 flex-1 rounded-full bg-line">
                  <span
                    className={cx("block h-1.5 rounded-full", lead.includes(id) ? "bg-accent" : "bg-muted")}
                    style={{ width: `${Math.min(100, pctOf(count, real) * 100 * 3)}%` }}
                  />
                </span>
                <span className="w-16 text-right tabular-nums text-muted">
                  {count} · {Math.round(pctOf(count, real) * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
        {themes.length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="text-xs font-medium text-muted">Recurring questions and objections</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px]">
              {themes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5 lg:col-span-2">
        <SectionHeader title="In their words" description="Most-liked comments." />
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {(
            [
              ["Positive", quotes.positive, "text-good"],
              ["Negative", quotes.negative, "text-bad"],
              ["Questions and doubts", quotes.questions, "text-ink"],
            ] as const
          ).map(([title, list, tone]) => (
            <div key={title}>
              <p className={cx("text-xs font-semibold", tone)}>{title}</p>
              {list.length === 0 ? (
                <p className="mt-1 text-[13px] text-muted">None.</p>
              ) : (
                <ul className="mt-1 space-y-2">
                  {list.map((q, i) => (
                    <li key={i} className="border-l-2 border-line pl-2.5 text-[13px] text-ink-2">
                      “{q.text}”
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
