"use client";
import { useRef, useState } from "react";
import { actions } from "@/lib/data/store";
import { formatDate } from "@/lib/format";
import { IS_LIVE } from "@/lib/supabase/config";
import type { DocumentKind, Project, ProjectDocument } from "@/lib/types";
import { Icon } from "../icons";
import { buttonClass, Card, cx, EmptyState, inputClass, labelClass } from "../ui";

export const DOC_KINDS: { id: DocumentKind; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "contract", label: "Contract" },
  { id: "guidelines", label: "Creative guidelines" },
  { id: "deck", label: "Client deck" },
  { id: "other", label: "Other" },
];

/** Biggest upload allowed, to keep storage sensible. */
const MAX_MB = 25;

function kindLabel(k: DocumentKind) {
  return DOC_KINDS.find((d) => d.id === k)?.label ?? k;
}

function where(doc: ProjectDocument): string {
  if (doc.filePath) return "Uploaded file";
  if (/docs\.google\.com\/presentation/.test(doc.url)) return "Google Slides";
  if (/docs\.google\.com\/document/.test(doc.url)) return "Google Docs";
  if (/docs\.google\.com\/spreadsheets/.test(doc.url)) return "Google Sheets";
  if (/drive\.google\.com/.test(doc.url)) return "Google Drive";
  return "Link";
}

export function DocumentsView({ p }: { p: Project }) {
  const [kind, setKind] = useState<DocumentKind>("brief");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file && !/^https?:\/\//.test(url.trim())) return setError("Paste a link starting with https://, or choose a file.");
    if (file && file.size > MAX_MB * 1024 * 1024) return setError(`That file is over ${MAX_MB} MB.`);
    setBusy(true);
    await actions.addProjectDocument(p.id, { kind, title: title.trim() || file?.name || kindLabel(kind), url: file ? "" : url.trim() }, file ?? undefined);
    setBusy(false);
    setTitle("");
    setUrl("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function open(doc: ProjectDocument) {
    const link = await actions.documentLink(doc);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end">
          <label>
            <span className={labelClass}>Type</span>
            <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
              {DOC_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Name (optional)</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Campaign brief v2" />
          </label>
          <div>
            <span className={labelClass}>Google Slides, Docs or Drive link{IS_LIVE ? ", or a file" : ""}</span>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                disabled={!!file}
                aria-label="Document link"
              />
              {IS_LIVE && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="sr-only"
                    id={`file-${p.id}`}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <label htmlFor={`file-${p.id}`} className={cx(buttonClass.secondary, "cursor-pointer")}>
                    <Icon name="download" size={14} className="rotate-180" /> {file ? "Change" : "File"}
                  </label>
                </>
              )}
            </div>
            {file && <p className="mt-1 truncate text-xs text-ink-2">{file.name}</p>}
          </div>
          <button className={buttonClass.primary} disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-xs text-bad">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Documents are for the team only. For Google links, share the file with the app&apos;s Google account so the brief reader can open it.
          {!IS_LIVE && " Uploading files works on the live site; the demo keeps links only."}
        </p>
      </Card>

      {p.documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Add the brief, contract, creative guidelines or client deck, so everything about the campaign is in one place."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {p.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <button onClick={() => open(d)} className="flex min-w-0 items-center gap-3 text-left hover:underline">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted ring-1 ring-line">
                  <Icon name={d.filePath ? "clipboard" : "link"} size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{d.title}</span>
                  <span className="block text-xs text-muted">
                    {kindLabel(d.kind)} · {where(d)} · added {formatDate(d.addedAt)}
                  </span>
                </span>
              </button>
              <button
                className={buttonClass.icon}
                aria-label={`Remove ${d.title}`}
                onClick={() => window.confirm(`Remove "${d.title}"?`) && actions.removeProjectDocument(p.id, d.id)}
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
