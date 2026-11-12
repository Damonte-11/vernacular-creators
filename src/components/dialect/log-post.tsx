"use client";
import { selectClass } from "./bits";
import { useState } from "react";
import { FORMAT_LABEL, PURPOSES, readLink, type DialectPost, type Purpose } from "@/lib/dialect";
import { buttonClass, Card, cx, inputClass, labelClass } from "../ui";
import { PlatformTag, Segmented } from "./bits";

/** Paste a post's link; content type and purpose are required. Numbers are read on the next check. */
export function LogPost({
  contentTypes,
  today,
  onLog,
  onClose,
}: {
  contentTypes: string[];
  today: string;
  onLog: (p: DialectPost) => Promise<string | null> | void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [date, setDate] = useState(today);
  const [tried, setTried] = useState(false);
  const read = url.trim() ? readLink(url) : null;
  const problem = !url.trim()
    ? "Paste the post's link."
    : !read
      ? "That isn't an Instagram, TikTok, X or YouTube post link."
      : !type
        ? "Pick what type of content it is."
        : !purpose
          ? "Pick what it's for: differentiation, safety or trend."
          : null;

  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setFailed(null);
    if (problem || !read || !purpose) return;
    setBusy(true);
    const err = await onLog({
      id: `new-${Date.now()}`,
      platform: read.platform,
      url: url.trim(),
      title: title.trim() || "New post",
      postedAt: `${date}T12:00:00+01:00`,
      format: read.format,
      contentType: type,
      purpose,
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
    });
    setBusy(false);
    if (err) return setFailed(err);
    setUrl("");
    setTitle("");
    setType("");
    setPurpose(null);
    setTried(false);
  }

  return (
    <Card className="fade-enter p-4 sm:p-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Log a post</p>
            <p className="text-xs text-muted">Numbers are read within the hour, then every 7 days, with a final read on the 1st.</p>
          </div>
          <button type="button" className={buttonClass.ghost} onClick={onClose}>
            Done
          </button>
        </div>
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
          <label>
            <span className={labelClass}>Content type</span>
            <select className={cx(selectClass, "w-48")} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Pick one…</option>
              {contentTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <div>
            <span className={labelClass}>What it&apos;s for</span>
            <Segmented label="What it's for" value={purpose} options={PURPOSES} onChange={setPurpose} />
          </div>
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
    </Card>
  );
}
