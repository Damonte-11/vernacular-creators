"use client";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/dialect/bits";
import { BrandPage } from "@/components/dialect/brand-page";
import { NewDialectForm } from "@/components/dialect/new-dialect-form";
import { PageHeader } from "@/components/ui";
import { monthOf } from "@/lib/dialect";
import { SAMPLE_TODAY, sampleDialectProject } from "@/lib/dialect-sample";

type View = "brand" | "new";

/** Design preview of Dialect projects, on made-up data. Nothing here is saved. */
export default function DialectPreviewPage() {
  const project = useMemo(() => sampleDialectProject(), []);
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
        <BrandPage initial={project} today={SAMPLE_TODAY} />
      ) : (
        <>
          <PageHeader title="New Dialect project" subtitle="A brand whose pages we run each month, with the targets from the client agreement." />
          <NewDialectForm
            startMonth={monthOf(SAMPLE_TODAY)}
            onCreate={(n) => {
              setNote(n);
              setView("brand");
            }}
          />
        </>
      )}
    </>
  );
}
