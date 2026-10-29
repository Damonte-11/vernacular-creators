"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ListImport } from "@/components/list-import";
import { ListTable } from "@/components/list-table";
import { PlatformToggle } from "@/components/lookup-form";
import { SavedMatches } from "@/components/saved-matches";
import { buttonClass, cx, EmptyState, inputClass, Loading, PageHeader, SectionHeader, StatTile } from "@/components/ui";
import { normalizeHandle, useAnalyses, useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import { actions, useAppState, useHydrated } from "@/lib/data/store";
import { formatNumber, formatRange } from "@/lib/format";
import { formatNaira } from "@/lib/lists";
import { searchSaved } from "@/lib/people";
import { platformName } from "@/lib/platforms";
import { shortlistTotals } from "@/lib/report";
import type { CreatorAnalysis, Platform, Shortlist } from "@/lib/types";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { shortlists } = useAppState();
  const all = useAnalyses();
  const creators = useCreators();
  const list = shortlists.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<"add" | "import" | null>(null);
  const [menu, setMenu] = useState(false);
  const hydrated = useHydrated();

  if (!list && !hydrated) return <Loading />;
  if (!list) {
    return (
      <EmptyState
        title="List not found"
        body="It may have been deleted, or made in a different browser."
        action={
          <Link href="/shortlists" className={buttonClass.secondary}>
            All lists
          </Link>
        }
      />
    );
  }

  const ids = new Set(list.items.map((i) => i.creatorId));
  const rows = all.filter((a): a is CreatorAnalysis => ids.has(a.creator.id));
  const totals = shortlistTotals(rows);
  const totalRate = list.items.reduce((s, i) => s + (i.rate ?? 0), 0);
  const active = list.items.filter((i) => i.status === "active").length;

  async function copyLink() {
    const url = list!.shareToken ? `${window.location.origin}/share/${list!.shareToken}` : `${window.location.origin}/reports/${list!.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <>
      <Link href="/shortlists" className={cx(buttonClass.ghost, "-ml-2.5 mb-4")}>
        <Icon name="back" size={16} /> All lists
      </Link>
      {editing ? (
        <RenameForm name={list.name} client={list.client} onSave={(n, c) => (actions.renameShortlist(list.id, n, c), setEditing(false))} onCancel={() => setEditing(false)} />
      ) : (
        <PageHeader
          title={list.name}
          subtitle={list.client ? `Client: ${list.client}` : undefined}
          actions={
            <>
              <button className={cx(buttonClass.secondary, panel === "import" && "bg-surface-2")} onClick={() => setPanel(panel === "import" ? null : "import")}>
                <Icon name="download" size={16} className="rotate-180" /> Import
              </button>
              <button className={cx(buttonClass.secondary, panel === "add" && "bg-surface-2")} onClick={() => setPanel(panel === "add" ? null : "add")}>
                <Icon name="plus" size={16} /> Add creators
              </button>
              <Link href={`/reports/${list.id}`} className={cx(buttonClass.primary, rows.length === 0 && "pointer-events-none opacity-50")}>
                <Icon name="clipboard" size={16} /> Client report
              </Link>
              <ListMenu
                open={menu}
                setOpen={setMenu}
                copied={copied}
                canShare={rows.length > 0}
                onCopy={copyLink}
                onRename={() => setEditing(true)}
                onDelete={() => {
                  if (window.confirm(`Delete the list "${list.name}"? The creators stay in the database.`)) {
                    actions.deleteShortlist(list.id);
                    router.push("/shortlists");
                  }
                }}
              />
            </>
          }
        />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Creators" value={totals.creators} hint={active ? `${active} active` : undefined} />
        <StatTile label="Combined followers" value={formatNumber(totals.followers)} hint="Added up per account" />
        <StatTile label="Expected engagements" value={formatRange(totals.engagements)} hint="If each creator posts once" />
        <StatTile label="Estimated reach" value={formatRange(totals.reach)} estimate hint="One post each; people may overlap" />
        <StatTile label="Total rate" value={formatNaira(totalRate)} hint={`${list.items.filter((i) => i.rate !== null).length} of ${list.items.length} with a rate`} />
      </div>

      {panel === "import" && (
        <div className="mb-6">
          <ListImport list={list} onClose={() => setPanel(null)} />
        </div>
      )}
      {panel === "add" && (
        <div className="mb-6">
          <AddToList list={list} onClose={() => setPanel(null)} />
        </div>
      )}

      {list.items.length === 0 && panel === null ? (
        <EmptyState
          title="This list is empty"
          body="Add creators from your database, look up new ones, or import a spreadsheet you already have."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className={buttonClass.primary} onClick={() => setPanel("add")}>
                <Icon name="plus" size={16} /> Add creators
              </button>
              <button className={buttonClass.secondary} onClick={() => setPanel("import")}>
                Import a spreadsheet
              </button>
            </div>
          }
        />
      ) : (
        list.items.length > 0 && <ListTable list={list} analyses={rows} creators={creators} />
      )}

      <p className="mt-6 flex items-start gap-1.5 text-xs text-muted">
        <Icon name="info" size={13} className="mt-px shrink-0" />
        Status, rates, emails, labels and notes are for the team only. They never appear in the client report or share link.
      </p>
    </>
  );
}

function ListMenu({
  open,
  setOpen,
  copied,
  canShare,
  onCopy,
  onRename,
  onDelete,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  copied: boolean;
  canShare: boolean;
  onCopy: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open, setOpen]);
  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50";
  return (
    <div className="relative" ref={ref}>
      <button className={cx(buttonClass.secondary, "px-3")} onClick={() => setOpen(!open)} aria-label="More actions" aria-expanded={open}>
        •••
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg" role="menu">
          <button role="menuitem" className={item} onClick={onCopy} disabled={!canShare}>
            <Icon name="link" size={16} /> {copied ? "Link copied" : "Copy client share link"}
          </button>
          <button role="menuitem" className={item} onClick={() => (onRename(), setOpen(false))}>
            <Icon name="settings" size={16} /> Rename
          </button>
          <button role="menuitem" className={cx(item, "text-bad")} onClick={onDelete}>
            <Icon name="trash" size={16} /> Delete list
          </button>
        </div>
      )}
    </div>
  );
}

/** Search the database first; if the creator isn't saved yet, look them up and add them. */
function AddToList({ list, onClose }: { list: Shortlist; onClose: () => void }) {
  const creators = useCreators();
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const onList = new Set(list.items.map((i) => i.creatorId));
  const matches = searchSaved(creators, normalizeHandle(q) || q, 8);

  async function lookUpAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    const r = await lookupCreator(platform, q, creators);
    setBusy(false);
    if (r.status === "error") return setError(r.error);
    await actions.addToList(list.id, [{ creatorId: r.creator.id }]);
    setAdded((a) => [...a, `@${r.creator.handle}`]);
    setQ("");
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_23_21/0.04)] sm:p-6">
      <SectionHeader
        title="Add creators"
        description="Search your database first. If they're not saved yet, look them up on the platform."
        action={
          <button className={buttonClass.icon} onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        }
        className="mb-4"
      />
      <form onSubmit={lookUpAndAdd} className="space-y-3">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={cx(inputClass, "pl-9")}
            placeholder="Name, @handle or profile link"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={busy}
            autoFocus
            aria-label="Search creators to add"
          />
        </div>
        <SavedMatches
          matches={matches}
          action={(c) =>
            onList.has(c.id) ? (
              <span className="flex items-center gap-1 text-xs font-medium text-good">
                <Icon name="check" size={14} /> On the list
              </span>
            ) : (
              <button type="button" className={cx(buttonClass.secondary, "px-3 py-1.5")} onClick={() => actions.addToList(list.id, [{ creatorId: c.id }])}>
                Add
              </button>
            )
          }
        />
        {q.trim() && (
          <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted sm:mr-auto">{matches.length ? "Not the one? Look it up on" : "Not in your database. Look it up on"}</p>
            <PlatformToggle value={platform} onChange={setPlatform} />
            <button className={cx(buttonClass.primary, "whitespace-nowrap")} disabled={busy}>
              {busy ? "Looking up…" : `Look up and add`}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-xs text-bad">
            {error}
          </p>
        )}
        {added.length > 0 && (
          <p className="text-xs text-good">
            Added {added.join(", ")} from {platformName(platform)}.
          </p>
        )}
      </form>
    </div>
  );
}

function RenameForm({ name, client, onSave, onCancel }: { name: string; client: string; onSave: (n: string, c: string) => void; onCancel: () => void }) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(client);
  return (
    <form
      className="mb-6 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (n.trim()) onSave(n.trim(), c.trim());
      }}
    >
      <input className={inputClass} value={n} onChange={(e) => setN(e.target.value)} aria-label="List name" />
      <input className={inputClass} value={c} onChange={(e) => setC(e.target.value)} placeholder="Client" aria-label="Client" />
      <button className={buttonClass.primary}>Save</button>
      <button type="button" className={buttonClass.secondary} onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
