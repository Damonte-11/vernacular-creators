import type { Metadata } from "next";
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
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-bold">This report can&apos;t be shown right now</p>
        <p className="mt-2 text-sm text-ink-2">Please try again in a few minutes.</p>
      </div>
    );
  }
  if (!data) notFound();
  return <ReportView name={data.list.name} client={data.list.client} rows={data.rows} date={Date.now()} />;
}
