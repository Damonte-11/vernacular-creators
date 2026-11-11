import { errorResponse } from "@/lib/server/lookup-service";
import { runPostChecks } from "@/lib/server/post-checks";
import { syncAllSheets } from "@/lib/server/sheet-agent";
import { processQueue, QUEUE_LOOKUPS_PER_RUN } from "@/lib/server/queue";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/**
 * Hourly (called by Supabase's scheduler with the CRON_SECRET, see docs/SETUP.md):
 * first sync projects' Google Sheets (new links in), then read the numbers of
 * campaign posts that are due a check, then write them back to the sheets,
 * then work through the background import queue with what's left of Instagram's hourly allowance.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!IS_LIVE) return Response.json({ skipped: "demo mode" });
  const db = supabaseAdmin();
  const start = Date.now();
  let sheets = null;
  try {
    sheets = await syncAllSheets(db, start + 60_000);
  } catch (e) {
    sheets = { error: e instanceof Error ? e.message : String(e) };
  }
  let postChecks = null;
  try {
    postChecks = await runPostChecks(db, { deadline: start + 110_000 });
  } catch (e) {
    // Projects not set up yet (or another problem): imports still run.
    postChecks = { error: e instanceof Error ? e.message : String(e) };
  }
  // Fresh numbers go back into the sheets straight away rather than next hour.
  if (postChecks && "checked" in postChecks && postChecks.checked > 0) {
    try {
      await syncAllSheets(db, Date.now() + 40_000);
    } catch {
      // Next hour's run writes them.
    }
  }
  try {
    const igUsed = postChecks && "instagramCalls" in postChecks ? postChecks.instagramCalls : 0;
    const queue = await processQueue(db, start + 270_000, Math.max(0, QUEUE_LOOKUPS_PER_RUN - igUsed));
    return Response.json({ ...queue, postChecks, sheets });
  } catch (e) {
    return errorResponse(e);
  }
}
