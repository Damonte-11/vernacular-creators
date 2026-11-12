import { readBriefDocs } from "@/lib/server/brief-docs";
import { errorResponse } from "@/lib/server/lookup-service";
import { generateReport } from "@/lib/server/report-agent";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/**
 * POST → make (or remake) the project's end-of-campaign report: read comments, analyse them, draft the text.
 * With { step: "brief" } it first reads the attached documents into the brief. Team only.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { step?: string; notes?: unknown };
  try {
    if (body.step === "brief") return Response.json(await readBriefDocs(supabaseAdmin(), id));
    const notes = Array.isArray(body.notes)
      ? body.notes
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.slice(0, 600))
          .slice(0, 4)
      : [];
    return Response.json({ report: await generateReport(supabaseAdmin(), id, Date.now(), notes) });
  } catch (e) {
    return errorResponse(e);
  }
}
