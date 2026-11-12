"use client";
import { useState } from "react";
import { Segmented } from "@/components/dialect/bits";
import { BrandPage } from "@/components/dialect/brand-page";
import { NewDialectForm } from "@/components/dialect/new-dialect-form";
import { PageHeader } from "@/components/ui";
import { monthOf } from "@/lib/dialect";
import { SAMPLE_TODAY, sampleDialectProject } from "@/lib/dialect-sample";

type View = "brand" | "new";

/** Design preview of Dialect projects, on made-up data. Nothing here is saved. */
export default function DialectPreviewPage() {
  const [project, setProject] = useState(() => sampleDialectProject());
  const [view, setView] = useState<View>("brand");
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn ring-1 ring-warn/20">
        <span>
          <b className="font-semibold">Design preview.</b> Dialect on a made-up brand with sample numbers. Changes stay on this page until you leave it.
        </span>
        <Segmented
          label="Preview"
          value={view}
          options={[
            { id: "brand", label: "Brand page" },
            { id: "new", label: "New Dialect project" },
          ]}
          onChange={(v) => {
            setView(v);
            setNote(null);
          }}
        />
      </div>
      {note && (
        <p role="status" className="mb-4 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
          {note}
        </p>
      )}
      {view === "brand" ? (
        <BrandPage
          p={project}
          today={SAMPLE_TODAY}
          preview
          ops={{
            updatePost: (id, patch) => setProject((x) => ({ ...x, posts: x.posts.map((y) => (y.id === id ? { ...y, ...patch } : y)) })),
            addPost: async (post) => {
              setProject((x) => ({ ...x, posts: [...x.posts, post] }));
              return null;
            },
            updateProject: (patch) => setProject((x) => ({ ...x, ...patch })),
          }}
        />
      ) : (
        <>
          <PageHeader title="New Dialect project" subtitle="A brand whose pages we run each month, with the targets from the client agreement." />
          <NewDialectForm
            startMonth={monthOf(SAMPLE_TODAY)}
            onCreate={async (v) => {
              setNote(`Design preview: "${v.brand}" would be created with ${v.months} months of targets. Showing the sample brand instead.`);
              setView("brand");
              return null;
            }}
          />
        </>
      )}
    </>
  );
}
