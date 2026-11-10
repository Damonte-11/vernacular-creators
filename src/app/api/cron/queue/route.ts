import { errorResponse } from "@/lib/server/lookup-service";
import { processQueue } from "@/lib/server/queue";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/**
 * Hourly: work through the background import queue. Called by Supabase's
 * scheduler (see docs/SETUP.md, "Background imports") with the CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!IS_LIVE) return Response.json({ skipped: "demo mode" });
  try {
    return Response.json(await processQueue(supabaseAdmin(), Date.now() + 240_000));
  } catch (e) {
    return errorResponse(e);
  }
}
