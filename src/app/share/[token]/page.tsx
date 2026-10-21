import type { Metadata } from "next";
import { StatusPage } from "@/components/ui";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { loadShareReport } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Creator shortlist · Vernacular", robots: { index: false, follow: false } };

/** Public, view-only client report. Anyone with the secret link can open it; no login. */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  if (!IS_LIVE) notFound();
  const { token } = await params;
  let data: Awaited<ReturnType<typeof loadShareReport>>;
  try {
    data = await loadShareReport(supabaseAdmin(), token);
  } catch (e) {
    console.error(e);
    return (
      <StatusPage title="This report can't be shown right now" body="Please try again in a few minutes." />
    );
  }
  if (!data) notFound();
  return <ReportView name={data.list.name} client={data.list.client} rows={data.rows} date={Date.now()} />;
}
