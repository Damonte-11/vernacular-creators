"use client";
import { useState } from "react";
import { actions } from "@/lib/data/store";
import { OBJECTIVES, splitList } from "@/lib/projects";
import type { Project, ProjectBrief } from "@/lib/types";
import { buttonClass, Card, cx, inputClass, labelClass, SectionHeader } from "../ui";

const LISTS: { key: keyof ProjectBrief; label: string; hint: string }[] = [
  { key: "mustSay", label: "Must say or show", hint: "One per line. Checked against each post." },
  { key: "hashtags", label: "Hashtags and tags", hint: "e.g. #SundayAnyDay, @brand" },
  { key: "dos", label: "Do's", hint: "One per line." },
  { key: "donts", label: "Don'ts", hint: "One per line." },
  { key: "competitors", label: "Competitors", hint: "Brands people might compare it with, for comment analysis." },
];

/**
 * The brief as fields the app can use: the comment analysis reads the brand,
 * product, message and competitors, and the brief check reads the must-says.
 */
export function BriefView({ p }: { p: Project }) {
  const [b, setB] = useState(p.brief);
  const [lists, setLists] = useState(() => Object.fromEntries(LISTS.map((l) => [l.key, (p.brief[l.key] as string[]).join("\n")])) as Record<string, string>);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(build()) !== JSON.stringify(p.brief);

  function build(): ProjectBrief {
    return { ...b, ...Object.fromEntries(LISTS.map((l) => [l.key, splitList(lists[l.key] ?? "")])) } as ProjectBrief;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await actions.updateProject(p.id, { brief: build() });
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]" onChange={() => setSaved(false)}>
      <Card className="space-y-4 p-4 sm:p-5">
        <SectionHeader title="Brief" description="What the brand asked for. The comment analysis and the brief check read these fields." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Brand</span>
            <input className={inputClass} value={b.brand} onChange={(e) => setB({ ...b, brand: e.target.value })} />
          </label>
          <label>
            <span className={labelClass}>Product or launch</span>
            <input className={inputClass} value={b.product} onChange={(e) => setB({ ...b, product: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Key message</span>
          <textarea
            rows={2}
            className={inputClass}
            value={b.keyMessage}
            onChange={(e) => setB({ ...b, keyMessage: e.target.value })}
            placeholder="The one thing people should take away"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {LISTS.map((l) => (
            <label key={l.key} className={cx("block", l.key === "competitors" && "sm:col-span-2")}>
              <span className={labelClass}>{l.label}</span>
              <textarea rows={3} className={inputClass} value={lists[l.key]} onChange={(e) => setLists({ ...lists, [l.key]: e.target.value })} />
              <span className="mt-1 block text-xs text-muted">{l.hint}</span>
            </label>
          ))}
        </div>
        <label className="block">
          <span className={labelClass}>Other notes</span>
          <textarea rows={2} className={inputClass} value={b.notes} onChange={(e) => setB({ ...b, notes: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          <button className={buttonClass.primary} disabled={!dirty}>
            Save brief
          </button>
          {saved && !dirty && (
            <span className="text-[13px] text-good" role="status">
              Saved.
            </span>
          )}
        </div>
      </Card>
      <Card className="p-4">
        <p className="text-sm font-semibold">Objective: {OBJECTIVES.find((o) => o.id === p.objective)?.label}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {p.objective === "awareness" && "The report leads with message pickup, people hearing about it for the first time, and friends being tagged."}
          {p.objective === "consideration" && "The report leads with questions, comparisons with competitors, and doubts or objections."}
          {p.objective === "conversion" && "The report leads with buying signals: where to buy, price, links and people saying they ordered."}
        </p>
        <p className="mt-3 text-xs text-muted">Change it with Edit project. Reading the brief straight from an uploaded PDF or Slides deck comes next.</p>
      </Card>
    </form>
  );
}
