"use client";
import { useState } from "react";
import { cx, inputClass } from "@/components/ui";
import type { Pro } from "./data";

const STATUSES = ["Not contacted", "Shortlisted", "Contacted", "Negotiating", "Booked", "Declined"];
const TEAM = ["Unassigned", "Adaeze", "Tobi", "Kemi", "Femi"];
const PROJECTS = ["Malt can launch (sample)", "App sign-ups push (sample)", "Glide Rides · Dialect (sample)"];

/** The team's side of a creator: status, owner, rate, contacts, notes and what happened. Kept on the page in this prototype. */
export function CrmPanel({ p, dark, compact }: { p: Pro; dark?: boolean; compact?: boolean }) {
  const [status, setStatus] = useState(p.chorus.length ? "Booked" : "Not contacted");
  const [owner, setOwner] = useState("Unassigned");
  const [rate, setRate] = useState(p.rate ?? "");
  const [note, setNote] = useState("");
  const [log, setLog] = useState<string[]>([
    `Opened from Discover · just now`,
    ...(p.chorus.length ? [`Booked for ${p.chorus[0].campaign} · ${p.chorus[0].month}`] : []),
  ]);
  const field = cx(inputClass, dark && "border-white/15 bg-white/5 text-white placeholder:text-white/40");
  const label = cx("mb-1 block text-xs font-medium", dark ? "text-white/60" : "text-ink-2");
  const add = (t: string) => setLog((l) => [`${t} · just now`, ...l]);
  return (
    <div className={cx("space-y-3", compact && "text-[13px]")}>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={label}>Status</span>
          <select
            className={field}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              add(`Status set to ${e.target.value}`);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Owner</span>
          <select
            className={field}
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              add(`Assigned to ${e.target.value}`);
            }}
          >
            {TEAM.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Rate per post</span>
          <input
            className={field}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            onBlur={() => rate && add(`Rate noted: ${rate}`)}
            placeholder="₦ quoted or agreed"
          />
        </label>
        <label>
          <span className={label}>Email</span>
          <input className={field} defaultValue={p.email ? `${p.handle.replace("_demo", "")}@mail.example` : ""} placeholder="Add email" />
        </label>
      </div>
      <label className="block">
        <span className={label}>Add to a project</span>
        <select className={field} defaultValue="" onChange={(e) => e.target.value && add(`Added to ${e.target.value}`)}>
          <option value="">Choose a project…</option>
          {PROJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) add(`Note: ${note.trim()}`);
          setNote("");
        }}
      >
        <span className={label}>Note</span>
        <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type and press Enter" />
      </form>
      <div>
        <span className={label}>Activity</span>
        <ul className={cx("space-y-1 border-l pl-3 text-xs", dark ? "border-white/15 text-white/70" : "border-line text-ink-2")}>
          {log.slice(0, 5).map((l, i) => (
            <li key={i} className="proto-rise" style={{ animationDelay: `${i * 30}ms` }}>
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
