"use client";
import { PageHeader } from "@/components/ui";
import { PreviewBanner, ProjectRow } from "@/components/project-preview";
import { SAMPLE_PROJECTS } from "@/lib/projects-sample";

/** Design preview of Projects (Chorus campaigns). Sample data only. */
export default function ProjectsPage() {
  const live = SAMPLE_PROJECTS.filter((p) => p.today > 0 && p.today < p.days);
  const upcoming = SAMPLE_PROJECTS.filter((p) => p.today === 0);
  const finished = SAMPLE_PROJECTS.filter((p) => p.today >= p.days);
  const groups = [
    { title: "Running now", items: live },
    { title: "Starting soon", items: upcoming },
    { title: "Finished", items: finished },
  ].filter((g) => g.items.length);
  return (
    <>
      <PreviewBanner />
      <PageHeader title="Projects" subtitle="Every Chorus campaign, with its views guarantee. Open one to see who has posted and what to chase." />
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title}`}>
            <h2 id={`g-${g.title}`} className="mb-3 text-base font-semibold">
              {g.title} <span className="font-normal text-muted">{g.items.length}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {g.items.map((p) => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
