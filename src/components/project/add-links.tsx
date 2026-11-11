"use client";
import { useMemo, useState } from "react";
import { actions } from "@/lib/data/store";
import { readPastedLinks, shortUrl, todayLagos, type PastedLink } from "@/lib/projects";
import type { Creator, Project } from "@/lib/types";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass } from "../ui";

/**
 * Paste links from WhatsApp, email or a sheet. Each one is matched to a creator
 * on the project; anything unsure is shown with a guess to confirm.
 */
export function AddLinks({ p, creators }: { p: Project; creators: Creator[] }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [posted, setPosted] = useState(todayLagos());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const onProject = useMemo(
    () => creators.filter((c) => p.creators.some((pc) => pc.creatorId === c.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [creators, p.creators],
  );
  const rows = useMemo(() => readPastedLinks(text, p, creators), [text, p, creators]);
  const who = (r: PastedLink) => picked[r.url] ?? r.creatorId ?? "";
  // A best guess the team didn't change counts as their pick.
  const final = (r: PastedLink) => picked[r.url] ?? r.creatorId ?? r.suggestion ?? "";
  const ready = rows.filter((r) => !r.duplicate);
  const unmatched = ready.filter((r) => !final(r)).length;

  async function add() {
    setBusy(true);
    const n = await actions.addProjectPosts(
      p.id,
      ready.map((r) => ({ url: r.url, platform: r.platform, creatorId: final(r) || null, postedDate: posted, source: "app" as const })),
    );
    setBusy(false);
    setText("");
    setPicked({});
    setDone(
      `${n} ${n === 1 ? "link" : "links"} added.${unmatched ? ` ${unmatched} still need a creator: see Needs attention.` : ""} Numbers are read on day 1, 3 and 7.`,
    );
  }

  if (p.creators.length === 0) {
    return (
      <Card className="border-dashed p-4 text-[13px] text-ink-2">
        Add the creators booked on this project first (Creators tab), then paste their post links here.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="md:w-52 md:shrink-0">
          <p className="text-sm font-semibold">Add post links</p>
          <p className="mt-0.5 text-[13px] text-muted">Paste as many as you have, with names or handles next to them if you like.</p>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`paste-${p.id}`} className="sr-only">
            Post links
          </label>
          <textarea
            id={`paste-${p.id}`}
            rows={text ? 4 : 2}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDone(null);
            }}
            placeholder={"Kemi – https://www.tiktok.com/@kemi.cooks/video/7301…\nhttps://www.instagram.com/reel/C8x…  @tolu"}
            className={cx(inputClass, "resize-y font-normal leading-relaxed")}
          />
          {rows.length > 0 && (
            <>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {rows.map((r) => (
                  <li key={r.url} className={cx("flex flex-col gap-2 px-3 py-2 text-[13px] sm:flex-row sm:items-center", r.duplicate && "opacity-60")}>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {r.platform ? (
                        <Icon name={r.platform} size={14} className="shrink-0 text-muted" />
                      ) : (
                        <Icon name="link" size={14} className="shrink-0 text-muted" />
                      )}
                      <span className="truncate text-ink-2" title={r.url}>
                        {shortUrl(r.url)}
                      </span>
                    </span>
                    {r.duplicate ? (
                      <span className="text-xs text-muted">Already on this project</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {r.creatorId && !picked[r.url] && (
                          <span className="inline-flex items-center gap-1 text-xs text-good" title={`Matched by the ${r.how}`}>
                            <Icon name="check" size={12} /> Matched
                          </span>
                        )}
                        {!r.creatorId && r.suggestion && !picked[r.url] && <span className="text-xs font-medium text-warn">Best guess</span>}
                        <select
                          aria-label={`Creator for ${shortUrl(r.url)}`}
                          className={cx(inputClass, "w-48", !who(r) && !r.suggestion && "border-warn")}
                          value={final(r)}
                          onChange={(e) => setPicked((m) => ({ ...m, [r.url]: e.target.value }))}
                        >
                          <option value="">Pick the creator…</option>
                          {onProject.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} (@{c.handle})
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Best guesses are used unless you change them. Links left without a creator can be matched later.</p>
            </>
          )}
          {done && (
            <p className="mt-2 text-[13px] text-good" role="status">
              {done}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:w-40">
          <label className="text-xs font-medium text-ink-2">
            Posted on
            <input type="date" className={cx(inputClass, "mt-1")} value={posted} onChange={(e) => setPosted(e.target.value)} />
          </label>
          <button className={buttonClass.primary} disabled={busy || ready.length === 0} onClick={add}>
            {busy ? "Adding…" : ready.length ? `Add ${ready.length} ${ready.length === 1 ? "link" : "links"}` : "Add links"}
          </button>
        </div>
      </div>
    </Card>
  );
}
