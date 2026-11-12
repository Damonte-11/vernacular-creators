"use client";
import { use } from "react";
import { BrandPage } from "@/components/dialect/brand-page";
import { buttonClass, EmptyState, Loading } from "@/components/ui";
import { dialectActions, useDialect } from "@/lib/data/dialect-store";
import { todayLagos } from "@/lib/projects";
import { IS_LIVE } from "@/lib/supabase/config";

/** One Dialect brand, saved in the database. */
export default function DialectProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, projects, error } = useDialect();
  const p = projects.find((x) => x.id === id);
  if (!ready) return <Loading />;
  if (!p) return <EmptyState title="Project not found" body={error ?? "It may have been deleted."} />;
  return (
    <>
      {error && (
        <p role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad ring-1 ring-bad/20">
          {error}
          <button className={buttonClass.ghost} onClick={() => dialectActions.clearError()}>
            Dismiss
          </button>
        </p>
      )}
      <BrandPage
        p={p}
        today={todayLagos()}
        ops={{
          updatePost: (postId, patch) => void dialectActions.updatePost(id, postId, patch),
          addPost: (post) => dialectActions.addPost(id, post),
          updateProject: (patch) => void dialectActions.updateProject(id, patch),
          readNow: IS_LIVE ? () => dialectActions.readNow(id) : undefined,
        }}
      />
    </>
  );
}
