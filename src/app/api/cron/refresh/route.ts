import { LookupError } from "@/lib/server/errors";
import { fetchFromPlatform } from "@/lib/server/lookup-service";
import { loadSettings, saveFetchedCreator, staleCreators } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** Most creators refreshed per run, and the time budget for one run. */
const BATCH = 60;
const TIME_BUDGET_MS = 240_000;

/**
 * Scheduled refresh (Vercel Cron, once a day; see vercel.json). Refreshes
 * creators whose data is older than the refresh interval, one at a time,
 * and stops early if a platform asks us to slow down or the allowance runs out.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!IS_LIVE) return Response.json({ skipped: "demo mode" });

  const started = Date.now();
  const db = supabaseAdmin();
  const settings = await loadSettings(db);
  const due = await staleCreators(db, settings.refreshIntervalHours, BATCH);
  const stoppedPlatforms = new Set<string>();
  const summary = { due: due.length, refreshed: 0, failed: 0, skipped: 0, notes: [] as string[] };

  for (const c of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    if (stoppedPlatforms.has(c.platform)) {
      summary.skipped++;
      continue;
    }
    try {
      const fetched = await fetchFromPlatform(c.platform, c.platform === "youtube" ? c.platform_id : c.handle, 1);
      await saveFetchedCreator(db, fetched, settings, null);
      summary.refreshed++;
    } catch (e) {
      summary.failed++;
      if (e instanceof LookupError) {
        summary.notes.push(`${c.platform} @${c.handle}: ${e.code}`);
        if (["rate_limited", "quota", "auth", "config"].includes(e.code)) stoppedPlatforms.add(c.platform);
      } else {
        summary.notes.push(`${c.platform} @${c.handle}: error`);
        console.error(e);
      }
    }
    await new Promise((r) => setTimeout(r, 1_000)); // gentle pace
  }
  return Response.json(summary);
}
