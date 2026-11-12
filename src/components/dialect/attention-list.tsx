"use client";
import { selectClass } from "./bits";
import { useState } from "react";
import { formatFull, formatNumber } from "@/lib/format";
import { FORMAT_LABEL, PURPOSES, type AttentionItem, type DialectPost, type Purpose } from "@/lib/dialect";
import { buttonClass, cx, inputClass } from "../ui";
import { PlatformTag, Segmented, Tag } from "./bits";

export type UpdatePost = (id: string, patch: Partial<DialectPost>) => void;

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const toNumber = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/** Everything to clear before the month's report: possible ads, numbers the apps hide, missing labels. */
export function AttentionList({ items, contentTypes, update }: { items: AttentionItem[]; contentTypes: string[]; update: UpdatePost }) {
  if (items.length === 0) return <p className="text-[13px] text-muted">Nothing to clear. The report will use every post as it stands.</p>;
  const numbers = items.filter((i) => i.kind === "numbers");
  return (
    <div className="divide-y divide-line">
      {items
        .filter((i) => i.kind === "ad")
        .map((it) => (
          <div key={it.post.id} className="py-3 first:pt-0">
            {it.kind === "ad" && <AdItem post={it.post} usual={it.usual} update={update} />}
          </div>
        ))}
      {numbers.length > 0 && (
        <div className="py-3 first:pt-0">
          <Tag tone="warn">Add numbers · {numbers.length}</Tag>
          <p className="mt-1 text-xs text-ink-2">Instagram doesn&apos;t share carousel views or saves. Copy them from the app&apos;s insights.</p>
          <div className="mt-2 grid grid-cols-[1fr_64px_56px_auto] items-center gap-x-1.5 gap-y-2 text-xs text-muted">
            <span>Post</span>
            <span>Views</span>
            <span>Saves</span>
            <span />
            {numbers.map((it) => (
              <NumbersRow key={it.post.id} post={it.post} update={update} />
            ))}
          </div>
        </div>
      )}
      {items
        .filter((i) => i.kind === "label")
        .map((it) => (
          <div key={it.post.id} className="py-3 first:pt-0 last:pb-0">
            <LabelItem post={it.post} contentTypes={contentTypes} update={update} />
          </div>
        ))}
    </div>
  );
}

function PostLine({ post }: { post: DialectPost }) {
  return (
    <p className="mt-1 text-[13px]">
      <a href={post.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
        {post.title}
      </a>
      <span className="text-muted">
        {" "}
        · <PlatformTag platform={post.platform} compact /> {FORMAT_LABEL[post.format]} · {shortDay(post.postedAt)}
      </span>
    </p>
  );
}

function AdItem({ post, usual, update }: { post: DialectPost; usual: number | null; update: UpdatePost }) {
  const [manual, setManual] = useState(false);
  const [views, setViews] = useState("");
  const [eng, setEng] = useState("");
  const times = usual ? Math.round((post.views ?? 0) / usual) : null;
  const v = toNumber(views);
  const e = toNumber(eng);
  return (
    <div>
      <Tag tone="bad">Possible ad</Tag>
      <PostLine post={post} />
      <p className="mt-0.5 text-xs text-ink-2">
        {formatFull(post.views)} views{times ? `, ${times}× its usual ${formatNumber(usual)}` : ""}. Not counted until you decide.
      </p>
      {!manual ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button className={buttonClass.secondary} onClick={() => update(post.id, { decision: "organic" })}>
            Count it: it&apos;s organic
          </button>
          <button className={buttonClass.secondary} onClick={() => setManual(true)}>
            It was boosted: enter organic numbers
          </button>
          <button className={buttonClass.ghost} onClick={() => update(post.id, { decision: "excluded" })}>
            Leave it out
          </button>
        </div>
      ) : (
        <form
          className="mt-2 grid grid-cols-2 gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (v !== null && e !== null) update(post.id, { decision: "manual", organic: { views: v, engagements: e } });
          }}
        >
          <label className="text-xs text-ink-2">
            Organic views
            <input
              className={cx(inputClass, "mt-1")}
              inputMode="numeric"
              value={views}
              onChange={(x) => setViews(x.target.value)}
              placeholder="from the app's insights"
            />
          </label>
          <label className="text-xs text-ink-2">
            Organic engagements
            <input
              className={cx(inputClass, "mt-1")}
              inputMode="numeric"
              value={eng}
              onChange={(x) => setEng(x.target.value)}
              placeholder="likes, comments, shares, saves"
            />
          </label>
          <div className="col-span-2 flex gap-1.5">
            <button className={buttonClass.primary} disabled={v === null || e === null}>
              Save organic numbers
            </button>
            <button type="button" className={buttonClass.ghost} onClick={() => setManual(false)}>
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function NumbersRow({ post, update }: { post: DialectPost; update: UpdatePost }) {
  const [views, setViews] = useState("");
  const [saves, setSaves] = useState("");
  const v = toNumber(views);
  const cell = cx(inputClass, "px-1.5 py-1 tabular-nums");
  return (
    <>
      <a href={post.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-[13px] font-medium text-ink hover:underline" title={post.title}>
        {post.title} <span className="font-normal text-muted">· {shortDay(post.postedAt)}</span>
      </a>
      <input className={cell} inputMode="numeric" value={views} onChange={(x) => setViews(x.target.value)} aria-label={`Views, ${post.title}`} />
      <input className={cell} inputMode="numeric" value={saves} onChange={(x) => setSaves(x.target.value)} aria-label={`Saves, ${post.title}`} />
      <button
        className={cx(buttonClass.secondary, "h-7 px-2")}
        disabled={v === null}
        onClick={() => update(post.id, { views: v, saves: toNumber(saves), manual: true })}
      >
        Save
      </button>
    </>
  );
}

function LabelItem({ post, contentTypes, update }: { post: DialectPost; contentTypes: string[]; update: UpdatePost }) {
  const [type, setType] = useState(post.contentType ?? "");
  const [purpose, setPurpose] = useState<Purpose | null>(post.purpose);
  return (
    <div>
      <Tag>Needs a label</Tag>
      <PostLine post={post} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)} aria-label="Content type">
          <option value="">Content type…</option>
          {contentTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Segmented label="Purpose" value={purpose} options={PURPOSES} onChange={setPurpose} />
        <button className={buttonClass.secondary} disabled={!type || !purpose} onClick={() => update(post.id, { contentType: type, purpose })}>
          Save
        </button>
      </div>
    </div>
  );
}
