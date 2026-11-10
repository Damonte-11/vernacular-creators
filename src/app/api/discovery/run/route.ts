import { runDiscovery } from "@/lib/server/discovery";
import { errorResponse } from "@/lib/server/lookup-service";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → run discovery now (the "Run discovery now" button). Team only. */
export async function POST() {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  try {
    return Response.json(await runDiscovery(supabaseAdmin(), Date.now() + 240_000));
  } catch (e) {
    return errorResponse(e);
  }
}
