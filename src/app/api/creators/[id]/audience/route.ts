import { readAudience } from "@/lib/server/audience";
import { errorResponse } from "@/lib/server/lookup-service";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → read the comments on a creator's latest posts and work out their audience signals. Team only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  try {
    return Response.json({ audience: await readAudience(supabaseAdmin(), decodeURIComponent(id)) });
  } catch (e) {
    return errorResponse(e);
  }
}
