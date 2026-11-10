import { runDiscovery } from "@/lib/server/discovery";
import { errorResponse } from "@/lib/server/lookup-service";
import { loadSettings } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** Nightly discovery of new creators (Vercel Cron; see vercel.json). Runs before the daily refresh. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!IS_LIVE) return Response.json({ skipped: "demo mode" });
  const db = supabaseAdmin();
  try {
    if (!(await loadSettings(db)).discovery.enabled) return Response.json({ skipped: "discovery is switched off in Settings" });
    return Response.json(await runDiscovery(db, Date.now() + 240_000));
  } catch (e) {
    return errorResponse(e);
  }
}
