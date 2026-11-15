"use client";
import { useState } from "react";
import { FORMAT_LABEL, linksIn, purposeLabel, readLink, type DialectPlatform, type DialectPost, type PostFormat, type Purpose } from "@/lib/dialect";
import { Icon } from "../icons";
import { buttonClass, Card, cx, inputClass, labelClass } from "../ui";
import { PlatformTag, Segmented, selectClass } from "./bits";

const ADD_TYPE = "__add";

interface Props {
  contentTypes: string[];
  /** This brand's purposes; none means posts aren't given one. */
  purposes: Purpose[];
  /** Links already logged, so a batch skips them. */
  logged: string[];
  today: string;
  onLog: (p: DialectPost) => Promise<string | null> | void;
  /** Add a content type to the brand's list, from the form. */
  onAddType: (type: string) => void;
  onClose: () => void;
}

/** Same link however it was copied: no query, no trailing slash, any case. */
const keyOf = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

function newPost(
  url: string,
  read: { platform: DialectPlatform; format: PostFormat },
  title: string,
  date: string,
  type: string,
  purpose: Purpose | null,
): DialectPost {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    platform: read.platform,
    url: url.trim(),
    title: title.trim() || "New post",
    postedAt: `${date}T12:00:00+01:00`,
    format: read.format,
    contentType: type || null,
    purpose,
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
  };
}

/** Log one post, or paste a whole batch of links. Numbers are read on the next check. */
export function LogPost(props: Props) {
  const [mode, setMode] = useState<"one" | "many">("one");
  return (
    <Card className="fade-enter p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Log posts</p>
          <p className="text-xs text-muted">Numbers are read within the hour, then every 7 days, with a final read on the 1st.</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            label="How many"
            value={mode}
            options={[
              { id: "one", label: "One post" },
              { id: "many", label: "Many posts" },
            ]}
            onChange={setMode}
          />
          <button type="button" className={buttonClass.ghost} onClick={props.onClose}>
            Done
          </button>
        </div>
      </div>
      <div className="mt-3">{mode === "one" ? <One {...props} /> : <Many {...props} />}</div>
    </Card>
  );
}

/** A content type picker whose last choice adds a new type to the brand's list. */
function TypeSelect({
  value,
  onChange,
  contentTypes,
  onAddType,
  className,
  placeholder = "Pick one…",
}: {
  value: string;
  onChange: (t: string) => void;
  contentTypes: string[];
  onAddType: (t: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  if (adding)
    return (
      <span className="flex gap-1.5">
        <input
          className={cx(inputClass, "w-40")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tweet"
          aria-label="New content type"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") setAdding(false);
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.click();
            }
          }}
        />
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            const t = name.trim();
            if (!t) return setAdding(false);
            const existing = contentTypes.find((x) => x.toLowerCase() === t.toLowerCase());
            if (!existing) onAddType(t);
            onChange(existing ?? t);
            setName("");
            setAdding(false);
          }}
        >
          Add
        </button>
      </span>
    );
  return (
    <select
      className={cx(selectClass, className)}
      value={value}
      onChange={(e) => (e.target.value === ADD_TYPE ? setAdding(true) : onChange(e.target.value))}
      aria-label="Content type"
    >
      <option value="">{placeholder}</option>
      {contentTypes.map((t) => (
        <option key={t}>{t}</option>
      ))}
      <option value={ADD_TYPE}>+ Add a new type…</option>
    </select>
  );
}

/* ── One post ─────────────────────────────────────────────────────── */

function One({ contentTypes, purposes, logged, today, onLog, onAddType }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [date, setDate] = useState(today);
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const read = url.trim() ? readLink(url) : null;
  const problem = !url.trim()
    ? "Paste the post's link."
    : !read
      ? "That isn't an Instagram, TikTok, X or YouTube post link."
      : logged.some((x) => keyOf(x) === keyOf(url))
        ? "That post is already logged."
        : !type
          ? "Pick what type of content it is."
          : purposes.length && !purpose
            ? `Pick what it's for: ${purposes.map(purposeLabel).join(", ").toLowerCase()}.`
            : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setFailed(null);
    if (problem || !read) return;
    setBusy(true);
    const err = await onLog(newPost(url, read, title, date, type, purpose));
    setBusy(false);
    if (err) return setFailed(err);
    setUrl("");
    setTitle("");
    setType("");
    setPurpose(null);
    setTried(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <label>
          <span className={labelClass}>Post link</span>
          <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoFocus />
          {read && (
            <span className="mt-1 flex items-center gap-1 text-xs text-muted">
              <PlatformTag platform={read.platform} /> · {FORMAT_LABEL[read.format]}
              {read.platform === "instagram" && read.format === "carousel" && " · views and saves are added by hand"}
            </span>
          )}
        </label>
        <label>
          <span className={labelClass}>Short name (optional)</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Myths vs facts" />
        </label>
        <label>
          <span className={labelClass}>Posted on</span>
          <input type="date" className={inputClass} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className={labelClass}>Content type</span>
          <TypeSelect value={type} onChange={setType} contentTypes={contentTypes} onAddType={onAddType} className="w-48" />
        </div>
        {purposes.length > 0 && (
          <div>
            <span className={labelClass}>What it&apos;s for</span>
            <Segmented label="What it's for" value={purpose} options={purposes.map((id) => ({ id, label: purposeLabel(id) }))} onChange={setPurpose} />
          </div>
        )}
        <button className={cx(buttonClass.primary, "ml-auto")} disabled={busy}>
          {busy ? "Logging…" : "Log post"}
        </button>
      </div>
      {failed && (
        <p role="alert" className="text-xs text-bad">
          {failed}
        </p>
      )}
      {tried && problem && (
        <p role="alert" className="text-xs text-bad">
          {problem}
        </p>
      )}
    </form>
  );
}

/* ── Many posts ───────────────────────────────────────────────────── */

interface Row {
  key: string;
  url: string;
  read: { platform: DialectPlatform; format: PostFormat } | null;
  /** Why it won't be logged: not a post link, already logged, or pasted twice. */
  skip: string | null;
  title: string;
  date: string;
  type: string;
  purpose: Purpose | null;
}

function Many({ contentTypes, purposes, logged, today, onLog, onAddType }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [all, setAll] = useState<{ type: string; purpose: Purpose | null; date: string }>({ type: "", purpose: null, date: today });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function readLinks() {
    const done = new Set(logged.map(keyOf));
    const seen = new Set(rows.map((r) => keyOf(r.url)));
    const next = linksIn(text).map((url): Row => {
      const k = keyOf(url);
      const read = readLink(url);
      const skip = !read ? "Not a post link" : done.has(k) ? "Already logged" : seen.has(k) ? "Pasted twice" : null;
      seen.add(k);
      return { key: `${k}-${Math.random()}`, url, read, skip, title: "", date: all.date, type: all.type, purpose: all.purpose };
    });
    setRows((r) => [...r, ...next]);
    setText("");
    setNote(next.length ? null : "No links found. Paste full links that start with https://");
  }
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const ready = rows.filter((r) => !r.skip && r.read);

  async function logAll() {
    setBusy(true);
    setNote(null);
    const failed: Row[] = [];
    let ok = 0;
    let unlabelled = 0;
    for (const r of ready) {
      const err = await onLog(newPost(r.url, r.read!, r.title, r.date, r.type, r.purpose));
      if (err) failed.push(r);
      else {
        ok++;
        if (!r.type || (purposes.length && !r.purpose)) unlabelled++;
      }
    }
    setBusy(false);
    setRows(failed);
    setNote(
      `${ok} ${ok === 1 ? "post" : "posts"} logged.` +
        (unlabelled > 0 ? ` ${unlabelled} without a ${purposes.length ? "type or purpose are" : "type is"} in Needs attention.` : "") +
        (failed.length ? ` ${failed.length} couldn't be saved; they're still below to try again.` : ""),
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={labelClass}>Paste links, one per line (or a column copied from a sheet)</span>
        <textarea
          className={cx(inputClass, "h-28 py-2 font-mono text-xs leading-relaxed")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://www.tiktok.com/@brand/video/…\nhttps://www.instagram.com/reel/…\nhttps://x.com/brand/status/…"}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass.secondary} onClick={readLinks} disabled={!text.trim()}>
          Read links
        </button>
        <span className="text-xs text-muted">The platform and format come from each link; anything already logged is skipped.</span>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3 ring-1 ring-line">
            <div>
              <span className={labelClass}>Content type</span>
              <TypeSelect
                value={all.type}
                onChange={(type) => setAll((a) => ({ ...a, type }))}
                contentTypes={contentTypes}
                onAddType={onAddType}
                className="w-44"
              />
            </div>
            {purposes.length > 0 && (
              <div>
                <span className={labelClass}>What it&apos;s for</span>
                <Segmented
                  label="What it's for"
                  value={all.purpose}
                  options={purposes.map((id) => ({ id, label: purposeLabel(id) }))}
                  onChange={(purpose) => setAll((a) => ({ ...a, purpose }))}
                />
              </div>
            )}
            <label>
              <span className={labelClass}>Posted on</span>
              <input
                type="date"
                className={cx(inputClass, "w-40")}
                value={all.date}
                max={today}
                onChange={(e) => setAll((a) => ({ ...a, date: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className={buttonClass.secondary}
              onClick={() => setRows((rs) => rs.map((r) => ({ ...r, type: all.type || r.type, purpose: all.purpose ?? r.purpose, date: all.date })))}
            >
              Apply to all
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl ring-1 ring-line">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pl-3 pr-2 font-medium">Post</th>
                  <th className="px-2 py-2 font-medium">Short name</th>
                  <th className="px-2 py-2 font-medium">Posted on</th>
                  <th className="px-2 py-2 font-medium">Content type</th>
                  {purposes.length > 0 && <th className="px-2 py-2 font-medium">What it&apos;s for</th>}
                  <th className="w-10 py-2 pr-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key} className={cx(r.skip && "bg-surface-2/60 text-muted")}>
                    <td className="max-w-[260px] py-2 pl-3 pr-2">
                      {r.read && (
                        <span className="flex items-center gap-1 text-xs">
                          <PlatformTag platform={r.read.platform} /> · {FORMAT_LABEL[r.read.format]}
                        </span>
                      )}
                      <a href={r.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted hover:underline">
                        {r.url}
                      </a>
                    </td>
                    {r.skip ? (
                      <td colSpan={purposes.length ? 4 : 3} className="px-2 py-2 text-xs font-medium text-warn">
                        {r.skip}: won&apos;t be logged
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-2">
                          <input
                            className={cx(inputClass, "w-40")}
                            value={r.title}
                            onChange={(e) => set(r.key, { title: e.target.value })}
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            className={cx(inputClass, "w-36")}
                            value={r.date}
                            max={today}
                            onChange={(e) => set(r.key, { date: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <TypeSelect
                            value={r.type}
                            onChange={(type) => set(r.key, { type })}
                            contentTypes={contentTypes}
                            onAddType={onAddType}
                            placeholder="Type…"
                            className={cx("w-40", !r.type && "border-warn")}
                          />
                        </td>
                        {purposes.length > 0 && (
                          <td className="px-2 py-2">
                            <select
                              className={cx(selectClass, "w-36", !r.purpose && "border-warn")}
                              value={r.purpose ?? ""}
                              onChange={(e) => set(r.key, { purpose: e.target.value || null })}
                              aria-label="What it's for"
                            >
                              <option value="">Purpose…</option>
                              {purposes.map((id) => (
                                <option key={id} value={id}>
                                  {purposeLabel(id)}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                      </>
                    )}
                    <td className="py-2 pr-3 text-right">
                      <button
                        type="button"
                        className={buttonClass.icon}
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        aria-label="Remove from batch"
                        title="Remove from batch"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {ready.length} to log
              {rows.length > ready.length ? ` · ${rows.length - ready.length} skipped` : ""}
              {ready.some((r) => !r.type || (purposes.length && !r.purpose)) ? " · posts without a label go to Needs attention" : ""}
            </span>
            <span className="flex gap-2">
              <button type="button" className={buttonClass.ghost} onClick={() => setRows([])} disabled={busy}>
                Clear
              </button>
              <button type="button" className={buttonClass.primary} onClick={logAll} disabled={busy || !ready.length}>
                {busy ? "Logging…" : `Log ${ready.length} ${ready.length === 1 ? "post" : "posts"}`}
              </button>
            </span>
          </div>
        </>
      )}
      {note && (
        <p role="status" className="text-[13px] text-ink-2">
          {note}
        </p>
      )}
    </div>
  );
}
