import { errorResponse } from "@/lib/server/lookup-service";
import { processQueue } from "@/lib/server/queue";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → work through some of the background import queue now ("Run now"). Team only. */
export async function POST() {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  try {
    return Response.json(await processQueue(supabaseAdmin(), Date.now() + 240_000));
  } catch (e) {
    return errorResponse(e);
  }
}
