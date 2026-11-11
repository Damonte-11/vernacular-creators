"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { ProjectForm } from "@/components/project/project-form";
import { Card, PageHeader } from "@/components/ui";
import { actions } from "@/lib/data/store";

export default function NewProjectPage() {
  const router = useRouter();
  return (
    <>
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
        <Icon name="back" size={14} /> Projects
      </Link>
      <PageHeader title="New Chorus project" subtitle="The basics now. Add creators, the brief and documents on the project page next." />
      <Card className="max-w-3xl p-4 sm:p-5">
        <ProjectForm
          submitLabel="Create project"
          onSubmit={async (v) => {
            const id = await actions.createProject(v);
            if (id) router.push(`/projects/${id}?tab=creators`);
          }}
          onCancel={() => router.push("/projects")}
        />
      </Card>
    </>
  );
}
