"use client";
import { useParams } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { Loading, StatusPage } from "@/components/ui";
import { NOW, useAnalyses } from "@/lib/data/creators";
import { useAppState } from "@/lib/data/store";
import { IS_LIVE } from "@/lib/supabase/config";
import type { CreatorAnalysis } from "@/lib/types";

/** Team view of a client report (the public version lives at /share/[token]). */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { shortlists, ready } = useAppState();
  const all = useAnalyses();
  const list = shortlists.find((l) => l.id === id);

  if (!ready) return <Loading />;
  if (!list) {
    return (
      <StatusPage
        title="Report not available"
        body={IS_LIVE ? "This list may have been deleted." : "In the demo, report links only open in the browser where the list was made."}
      />
    );
  }

  const rows = list.items
    .map((i) => all.find((a) => a.creator.id === i.creatorId))
    .filter((a): a is CreatorAnalysis => !!a);
  return <ReportView name={list.name} client={list.client} rows={rows} date={NOW} backHref={`/shortlists/${list.id}`} />;
}
