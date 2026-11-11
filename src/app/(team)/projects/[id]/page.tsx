"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarView, LanesView, PasteLinks, PostsView, PreviewBanner, ProjectSummary } from "@/components/project-preview";
import { cx, EmptyState } from "@/components/ui";
import { dayDate, sampleProject } from "@/lib/projects-sample";

const LAYOUTS = [
  { key: "lanes", label: "Lanes" },
  { key: "calendar", label: "Calendar" },
  { key: "posts", label: "Posts" },
] as const;
type Layout = (typeof LAYOUTS)[number]["key"];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const p = sampleProject(id);
  const [layout, setLayout] = useState<Layout>("lanes");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("projects-preview-layout") as Layout | null;
      if (saved && LAYOUTS.some((l) => l.key === saved)) setLayout(saved);
    } catch {}
  }, []);
  function pick(l: Layout) {
    setLayout(l);
    try {
      localStorage.setItem("projects-preview-layout", l);
    } catch {}
  }
  if (!p) return <EmptyState title="Project not found" body={<Link href="/projects" className="underline">Back to Projects</Link>} />;
  const status = p.today === 0 ? `Starts ${dayDate(p, 1)}` : p.today >= p.days ? "Finished" : `Day ${p.today} of ${p.days}`;

  return (
    <>
      <PreviewBanner>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Try a layout:</span>
          <div className="flex rounded-lg bg-surface p-0.5 ring-1 ring-info/30" role="group" aria-label="Layout to try">
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                onClick={() => pick(l.key)}
                aria-pressed={layout === l.key}
                className={cx("rounded-md px-2.5 py-1 text-xs font-semibold", layout === l.key ? "bg-info text-white" : "text-info hover:bg-info-soft")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </PreviewBanner>

      <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
        <Icon name="back" size={14} /> Projects
      </Link>
      <div className="mb-5 flex flex-col gap-1 border-b border-line pb-4">
        <h1 className="text-xl font-semibold leading-7 tracking-tight">{p.name}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
          <span>{p.client}</span>
          <span className="text-line-strong" aria-hidden>·</span>
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-ink">Chorus {p.type}</span>
          <span className="text-line-strong" aria-hidden>·</span>
          <span>{p.vertical}</span>
          <span className="text-line-strong" aria-hidden>·</span>
          <span>
            {dayDate(p, 1)} – {dayDate(p, p.days)} ({status})
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <ProjectSummary p={p} />
        {p.today < p.days && <PasteLinks p={p} />}
        <section aria-label="Creators and posts" className="mt-2">
          <h2 className="mb-3 text-sm font-semibold">{layout === "posts" ? "Posts" : "Creators"}</h2>
          {layout === "lanes" && <LanesView p={p} />}
          {layout === "calendar" && <CalendarView p={p} />}
          {layout === "posts" && <PostsView p={p} />}
        </section>
      </div>
    </>
  );
}
