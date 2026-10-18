import { errorResponse, lookupCreator } from "@/lib/server/lookup-service";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

/** POST { platform, handle } → look up (and save) a creator. Team only. */
export async function POST(request: Request) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode: lookups are simulated in the browser." }, { status: 400 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { platform?: string; handle?: string };
  if (body.platform !== "instagram" && body.platform !== "youtube") {
    return Response.json({ error: "Choose Instagram or YouTube." }, { status: 400 });
  }
  try {
    const result = await lookupCreator(supabaseAdmin(), body.platform, String(body.handle ?? "").trim(), user.id);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
