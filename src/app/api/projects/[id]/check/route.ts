import { errorResponse } from "@/lib/server/lookup-service";
import { runPostChecks } from "@/lib/server/post-checks";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → read the latest numbers of every post on this project now ("Check numbers now"). Team only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  try {
    return Response.json(await runPostChecks(supabaseAdmin(), { projectId: id, deadline: Date.now() + 240_000, force: true, igCalls: 60 }));
  } catch (e) {
    return errorResponse(e);
  }
}
