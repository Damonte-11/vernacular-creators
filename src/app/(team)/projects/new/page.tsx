"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/dialect/bits";
import { NewDialectForm } from "@/components/dialect/new-dialect-form";
import { Icon } from "@/components/icons";
import { ProjectForm } from "@/components/project/project-form";
import { Card, PageHeader } from "@/components/ui";
import { dialectActions, useDialect } from "@/lib/data/dialect-store";
import { actions } from "@/lib/data/store";
import { monthOf } from "@/lib/dialect";
import { todayLagos } from "@/lib/projects";

type Kind = "chorus" | "dialect";

export default function NewProjectPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("chorus");
  const { error } = useDialect();
  // ?type=dialect opens straight on Dialect.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("type") === "dialect") setKind("dialect");
  }, []);
  return (
    <>
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
        <Icon name="back" size={14} /> Projects
      </Link>
      <PageHeader
        title={kind === "chorus" ? "New Chorus project" : "New Dialect project"}
        subtitle={
          kind === "chorus"
            ? "A creator campaign. The basics now; add creators, the brief and documents on the project page next."
            : "A brand whose pages we run each month, with the targets from the client agreement."
        }
        actions={
          <Segmented
            label="Project type"
            value={kind}
            options={[
              { id: "chorus", label: "Chorus" },
              { id: "dialect", label: "Dialect" },
            ]}
            onChange={setKind}
          />
        }
      />
      {kind === "chorus" ? (
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
      ) : (
        <NewDialectForm
          startMonth={monthOf(todayLagos())}
          onCreate={async (v) => {
            const id = await dialectActions.create(v);
            if (id) router.push(`/projects/dialect/${id}`);
            return id ? null : (error ?? "Couldn't create the project. Please try again.");
          }}
        />
      )}
    </>
  );
}
