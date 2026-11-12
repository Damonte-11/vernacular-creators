"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { AddLinks } from "@/components/project/add-links";
import { BriefView } from "@/components/project/brief-view";
import { CreatorsView } from "@/components/project/creators-view";
import { DocumentsView } from "@/components/project/documents-view";
import { PostsView } from "@/components/project/posts-view";
import { ProjectForm } from "@/components/project/project-form";
import { ReportView } from "@/components/project/report-view";
import { SheetView } from "@/components/project/sheet-view";
import { ProjectSummary } from "@/components/project/summary";
import { buttonClass, Card, cx, EmptyState, Loading, tabClass, tabCountClass, tabListClass } from "@/components/ui";
import { useCreators } from "@/lib/data/creators";
import { actions, useAppState, useHydrated } from "@/lib/data/store";
import { chorusLabel, OBJECTIVES, projectPhase, projectWindow, shortDate, todayLagos, type AttentionItem } from "@/lib/projects";

type Tab = "overview" | "creators" | "posts" | "sheet" | "brief" | "documents" | "report";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { projects } = useAppState();
  const hydrated = useHydrated();
  const creators = useCreators();
  const byId = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);
  const p = projects.find((x) => x.id === id);
  const today = todayLagos();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [focusPost, setFocusPost] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);

  // Deep links like ?tab=creators (used right after creating a project).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && ["overview", "creators", "posts", "sheet", "brief", "documents", "report"].includes(t)) setTab(t);
  }, []);

  if (!p && !hydrated) return <Loading />;
  if (!p)
    return (
      <EmptyState
        title="Project not found"
        body="It may have been deleted."
        action={
          <Link href="/projects" className={buttonClass.secondary}>
            Back to projects
          </Link>
        }
      />
    );

  const phase = projectPhase(p, today);
  const w = projectWindow(p, today);
  const status = phase === "upcoming" ? `starts ${shortDate(p.startDate)}` : phase === "finished" ? "finished" : `day ${w.today} of ${w.days}`;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "creators", label: "Creators", count: p.creators.length },
    { id: "posts", label: "Posts", count: p.posts.length },
    { id: "sheet", label: "Sheet" },
    { id: "brief", label: "Brief" },
    { id: "documents", label: "Documents", count: p.documents.length },
    { id: "report", label: "Report" },
  ];
  const openAttention = (a: AttentionItem) => {
    if (a.postId) {
      setFocusPost(a.postId);
      setTab("posts");
    } else setTab("creators");
  };

  return (
    <>
      <Link href="/projects" className="no-print mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
        <Icon name="back" size={14} /> Projects
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-7 tracking-tight">{p.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
            <span>{p.client || "No client set"}</span>
            <span className="text-line-strong" aria-hidden>
              ·
            </span>
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-ink">Chorus {chorusLabel(p.chorusType)}</span>
            <span className="text-line-strong" aria-hidden>
              ·
            </span>
            <span>{OBJECTIVES.find((o) => o.id === p.objective)?.label}</span>
            {p.vertical && (
              <>
                <span className="text-line-strong" aria-hidden>
                  ·
                </span>
                <span>{p.vertical}</span>
              </>
            )}
            <span className="text-line-strong" aria-hidden>
              ·
            </span>
            <span>
              {shortDate(p.startDate)} – {shortDate(p.endDate)} ({status})
            </span>
          </p>
        </div>
        <div className="no-print flex shrink-0 gap-2">
          {p.posts.length > 0 && (
            <button
              className={buttonClass.secondary}
              disabled={checking}
              title="Reads the latest numbers of every post now. They're also read automatically on each post's day 1, 3 and 7."
              onClick={async () => {
                setChecking(true);
                setCheckNote(null);
                setCheckNote(await actions.checkPostNumbers(p.id));
                setChecking(false);
              }}
            >
              {checking ? "Reading numbers…" : "Check numbers now"}
            </button>
          )}
          <button className={buttonClass.secondary} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
            {editing ? "Close" : "Edit project"}
          </button>
        </div>
      </div>

      {checkNote && (
        <p
          role="status"
          className="fade-enter mt-3 flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line"
        >
          <span>{checkNote}</span>
          <button className="shrink-0 text-xs font-medium underline" onClick={() => setCheckNote(null)}>
            Dismiss
          </button>
        </p>
      )}

      {editing && (
        <Card className="fade-enter mt-4 p-4 sm:p-5">
          <ProjectForm
            initial={p}
            submitLabel="Save changes"
            onSubmit={async (v) => {
              await actions.updateProject(p.id, v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
          <div className="mt-5 border-t border-line pt-4">
            <button
              className={buttonClass.danger}
              onClick={async () => {
                if (!window.confirm(`Delete "${p.name}" with all its links, numbers and documents? This can't be undone.`)) return;
                await actions.deleteProject(p.id);
                router.push("/projects");
              }}
            >
              Delete project
            </button>
          </div>
        </Card>
      )}

      <div className={cx(tabListClass, "no-print mb-5 mt-4")} role="tablist" aria-label="Project sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={tabClass(tab === t.id)}
          >
            {t.label}
            {t.count !== undefined && <span className={tabCountClass}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="fade-enter space-y-4" key={tab}>
        {tab === "overview" && (
          <>
            <ProjectSummary p={p} today={today} creators={byId} onOpen={openAttention} />
            {phase !== "finished" && <AddLinks p={p} creators={creators} />}
          </>
        )}
        {tab === "creators" && <CreatorsView p={p} today={today} byId={byId} allCreators={creators} />}
        {tab === "posts" && (
          <>
            {phase !== "finished" && <AddLinks p={p} creators={creators} />}
            <PostsView p={p} today={today} byId={byId} focusPostId={focusPost} />
          </>
        )}
        {tab === "sheet" && <SheetView p={p} />}
        {tab === "brief" && <BriefView p={p} />}
        {tab === "documents" && <DocumentsView p={p} />}
        {tab === "report" && <ReportView p={p} />}
      </div>
    </>
  );
}
