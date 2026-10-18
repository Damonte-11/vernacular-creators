import { LookupError } from "@/lib/server/errors";
import { errorResponse, fetchFromPlatform } from "@/lib/server/lookup-service";
import { getCreator, loadSettings, saveFetchedCreator } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

/** POST → fetch fresh data for one creator now, whatever its age. Team only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();
  try {
    const saved = await getCreator(db, id);
    if (!saved) throw new LookupError("not_found", "This creator is no longer in the database.");
    const fetched = await fetchFromPlatform(saved.platform, saved.platform === "youtube" ? saved.platformId : saved.handle);
    const creator = await saveFetchedCreator(db, fetched, await loadSettings(db), user.id);
    return Response.json({ status: "refreshed", creator });
  } catch (e) {
    return errorResponse(e);
  }
}
