import { errorResponse } from "@/lib/server/lookup-service";
import { generateReport } from "@/lib/server/report-agent";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → make (or remake) the project's end-of-campaign report: read comments, analyse them, draft the text. Team only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  try {
    return Response.json({ report: await generateReport(supabaseAdmin(), id) });
  } catch (e) {
    return errorResponse(e);
  }
}
