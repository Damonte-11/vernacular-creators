import { addCandidate } from "@/lib/server/discovery";
import { errorResponse } from "@/lib/server/lookup-service";
import { getCreator } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

/** POST { action: "add" | "ignore" } → act on a "Worth a look" suggestion. Team only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Unknown suggestion." }, { status: 400 });
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };
  const db = supabaseAdmin();
  try {
    if (action === "ignore") {
      const { error } = await db.from("discovery_candidates").update({ status: "ignored", reason: "Ignored by the team", decided_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return Response.json({ status: "ignored" });
    }
    if (action === "add") {
      const creatorId = await addCandidate(db, id, user.id);
      return Response.json({ status: "added", creator: await getCreator(db, creatorId) });
    }
    return Response.json({ error: "Choose add or ignore." }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
