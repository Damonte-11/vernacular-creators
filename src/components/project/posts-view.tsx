"use client";
import { useMemo, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatNumber, formatPercent } from "@/lib/format";
import { checkLabel, daysBetween, LOW_ER, parseViews, postNumbers, shortDate, shortUrl } from "@/lib/projects";
import type { Creator, Project, ProjectPost } from "@/lib/types";
import { Icon } from "../icons";
import { buttonClass, cx, EmptyState, inputClass } from "../ui";

function needsLook(post: ProjectPost, today: string): boolean {
  if (!post.creatorId || post.problem) return true;
  const n = postNumbers(post);
  const age = post.postedDate ? daysBetween(post.postedDate, today) : 0;
  return (!n.check && age >= 2) || (n.er !== null && n.er < LOW_ER && age >= 3);
}

export function PostsView({ p, today, byId, focusPostId }: { p: Project; today: string; byId: Map<string, Creator>; focusPostId?: string | null }) {
  const [filter, setFilter] = useState<"all" | "look">(focusPostId ? "look" : "all");
  const [editing, setEditing] = useState<string | null>(null);
  const onProject = useMemo(
    () =>
      p.creators
        .map((pc) => byId.get(pc.creatorId))
        .filter((c): c is Creator => !!c)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [p.creators, byId],
  );
  const sorted = useMemo(
    () => [...p.posts].sort((a, b) => Number(needsLook(b, today)) - Number(needsLook(a, today)) || (b.postedDate ?? "").localeCompare(a.postedDate ?? "")),
    [p.posts, today],
  );
  const look = sorted.filter((x) => needsLook(x, today));
  const list = filter === "all" ? sorted : look;

  if (p.posts.length === 0) {
    return <EmptyState title="No posts yet" body="Paste the links creators send you in the box above. They show up here with their numbers." />;
  }

  return (
    <div>
      <div className="mb-3 flex gap-2" role="group" aria-label="Show">
        {(["all", "look"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cx(
              "h-7 rounded-lg px-2.5 text-[13px] font-medium ring-1 transition-colors",
              filter === f ? "bg-brand text-brand-ink ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-surface-2",
            )}
          >
            {f === "all" ? `All posts ${sorted.length}` : `Needs a look ${look.length}`}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-muted">Nothing needs a look.</p>
      ) : (
        <>
          {/* Phones: one row per post */}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line md:hidden">
            {list.map((post) => {
              const c = post.creatorId ? byId.get(post.creatorId) : undefined;
              const n = postNumbers(post);
              return (
                <li key={post.id} className={cx("p-3 text-[13px]", post.id === focusPostId && "bg-accent-soft/50")}>
                  <div className="flex items-center justify-between gap-2">
                    {c ? (
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <Icon name={c.platform} size={12} className="text-muted" /> <span className="truncate">{c.name}</span>
                      </span>
                    ) : (
                      <Unmatched p={p} post={post} onProject={onProject} byId={byId} />
                    )}
                    <span className={cx("shrink-0 text-xs", post.problem ? "text-bad" : !n.check ? "text-warn" : "text-muted")}>{checkLabel(post, today)}</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted">Views</dt>
                      <dd className="font-semibold tabular-nums">{formatNumber(n.views)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Engagements</dt>
                      <dd className="font-semibold tabular-nums">{formatNumber(n.engagements)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">ER by views</dt>
                      <dd className={cx("font-semibold tabular-nums", n.er !== null && n.er < LOW_ER && "text-warn")}>
                        {n.er === null ? "—" : formatPercent(n.er)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                    <a href={post.url} target="_blank" rel="noreferrer noopener" className="truncate hover:text-ink hover:underline">
                      {post.postedDate ? `${shortDate(post.postedDate)} · ` : ""}
                      {shortUrl(post.url)}
                    </a>
                    <button className="shrink-0 font-medium text-ink-2 underline" onClick={() => setEditing(editing === post.id ? null : post.id)}>
                      Type in numbers
                    </button>
                  </div>
                  {editing === post.id && <NumbersForm p={p} post={post} today={today} onDone={() => setEditing(null)} />}
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pl-4 pr-3 font-medium">Creator</th>
                  <th className="px-3 py-2 font-medium">Post</th>
                  <th className="px-3 py-2 font-medium">Posted</th>
                  <th className="px-3 py-2 font-medium">Numbers from</th>
                  <th className="px-3 py-2 text-right font-medium">Views</th>
                  <th className="px-3 py-2 text-right font-medium">Engagements</th>
                  <th className="px-3 py-2 text-right font-medium">ER by views</th>
                  <th className="w-20 px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((post) => {
                  const c = post.creatorId ? byId.get(post.creatorId) : undefined;
                  const n = postNumbers(post);
                  const low = n.er !== null && n.er < LOW_ER;
                  return (
                    <PostRow key={post.id} post={post} focused={post.id === focusPostId}>
                      <td className="py-1.5 pl-4 pr-3">
                        {c ? (
                          <span className="flex items-center gap-1.5">
                            <Icon name={c.platform} size={12} className="text-muted" />
                            <span className="font-medium">{c.name}</span>
                          </span>
                        ) : (
                          <Unmatched p={p} post={post} onProject={onProject} byId={byId} />
                        )}
                      </td>
                      <td className="max-w-56 px-3 py-1.5">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex max-w-full items-center gap-1 text-ink-2 hover:text-ink hover:underline"
                        >
                          <span className="truncate">{shortUrl(post.url)}</span> <Icon name="link" size={11} className="shrink-0" />
                        </a>
                        {post.source === "sheet" && <span className="ml-1 text-[11px] text-muted">from sheet</span>}
                      </td>
                      <td className="px-3 py-1.5 text-ink-2">{post.postedDate ? shortDate(post.postedDate) : "—"}</td>
                      <td className={cx("px-3 py-1.5", post.problem ? "text-bad" : !n.check ? "text-warn" : "text-ink-2")} title={post.problem ?? undefined}>
                        {checkLabel(post, today)}
                        {n.check?.source === "manual" && <span className="ml-1 text-[11px] text-muted">typed in</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatNumber(n.views)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(n.engagements)}</td>
                      <td className={cx("px-3 py-1.5 text-right tabular-nums", low && "font-medium text-warn")}>{n.er === null ? "—" : formatPercent(n.er)}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex justify-end gap-0.5">
                          <button
                            className={buttonClass.icon}
                            aria-label="Type in numbers"
                            title="Type in numbers"
                            onClick={() => setEditing(editing === post.id ? null : post.id)}
                          >
                            <Icon name="clipboard" size={15} />
                          </button>
                          <button
                            className={buttonClass.icon}
                            aria-label="Remove this post"
                            title="Remove"
                            onClick={() => window.confirm("Remove this post from the project?") && actions.removeProjectPosts(p.id, [post.id])}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </span>
                      </td>
                    </PostRow>
                  );
                })}
              </tbody>
            </table>
            {editing && <NumbersForm p={p} post={p.posts.find((x) => x.id === editing)!} today={today} onDone={() => setEditing(null)} />}
          </div>
        </>
      )}
    </div>
  );
}

/** A link with no creator yet: the agent's guess (if any) to confirm, or a list to pick from. */
function Unmatched({ p, post, onProject, byId }: { p: Project; post: ProjectPost; onProject: Creator[]; byId: Map<string, Creator> }) {
  const guess = post.suggestedCreatorId ? byId.get(post.suggestedCreatorId) : undefined;
  return (
    <span className="flex min-w-0 flex-col gap-1">
      {guess && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-warn">Is this {guess.name}?</span>
          <button
            className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-medium text-brand-ink"
            onClick={() => actions.updateProjectPost(p.id, post.id, { creatorId: guess.id })}
          >
            Yes
          </button>
        </span>
      )}
      <select
        aria-label={`Creator for ${shortUrl(post.url)}`}
        className={cx(inputClass, "max-w-52 border-warn")}
        value=""
        onChange={(e) => e.target.value && actions.updateProjectPost(p.id, post.id, { creatorId: e.target.value })}
      >
        <option value="">{guess ? "No, it's…" : "Pick the creator…"}</option>
        {onProject.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} (@{x.handle})
          </option>
        ))}
      </select>
      {post.sheetLabel && <span className="max-w-56 text-[11px] text-muted">Sheet says &quot;{post.sheetLabel}&quot;</span>}
      {post.matchNote && <span className="max-w-56 text-[11px] text-muted">{post.matchNote}</span>}
    </span>
  );
}

function PostRow({ post, focused, children }: { post: ProjectPost; focused: boolean; children: React.ReactNode }) {
  return (
    <tr id={`post-${post.id}`} className={cx("transition-colors hover:bg-surface-2", focused && "bg-accent-soft/50")}>
      {children}
    </tr>
  );
}

/** Type numbers in by hand, e.g. from the creator's own screenshot. */
function NumbersForm({ p, post, today, onDone }: { p: Project; post: ProjectPost; today: string; onDone: () => void }) {
  const age = post.postedDate ? Math.max(0, daysBetween(post.postedDate, today)) : 0;
  const last = postNumbers(post).check;
  const [f, setF] = useState({
    views: last?.views?.toString() ?? "",
    likes: last?.likes?.toString() ?? "",
    comments: last?.comments?.toString() ?? "",
    shares: last?.shares?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const read = (s: string) => (s.trim() === "" ? null : parseViews(s));
  function save(e: React.FormEvent) {
    e.preventDefault();
    const vals = { views: read(f.views), likes: read(f.likes), comments: read(f.comments), shares: read(f.shares) };
    if (Object.entries(f).some(([k, v]) => v.trim() !== "" && vals[k as keyof typeof vals] === null)) return setError("Use whole numbers, like 45000 or 45k.");
    if (Object.values(vals).every((v) => v === null)) return setError("Enter at least one number.");
    void actions.addPostCheck(p.id, post.id, { day: Math.max(1, Math.min(age, 7)), checkedAt: new Date().toISOString(), ...vals, source: "manual" });
    onDone();
  }
  return (
    <form
      onSubmit={save}
      className="fade-enter mt-2 flex flex-wrap items-end gap-2 border-t border-line bg-surface-2 px-4 py-3 max-md:-mx-3 max-md:-mb-3"
      aria-label="Type in numbers"
    >
      <p className="w-full text-xs text-muted">
        Numbers for {shortUrl(post.url)}, saved as the day-{Math.max(1, Math.min(age, 7))} reading. Automatic readings replace them when they come in.
      </p>
      {(["views", "likes", "comments", "shares"] as const).map((k) => (
        <label key={k} className="text-xs font-medium capitalize text-ink-2">
          {k}
          <input className={cx(inputClass, "mt-1 w-24 sm:w-28")} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </label>
      ))}
      <button className={buttonClass.primary}>Save numbers</button>
      <button type="button" className={buttonClass.ghost} onClick={onDone}>
        Cancel
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
