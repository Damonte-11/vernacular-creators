import { errorResponse, lookupCreator } from "@/lib/server/lookup-service";
import { PLATFORMS } from "@/lib/platforms";
import { IS_LIVE } from "@/lib/supabase/config";
import type { Platform } from "@/lib/types";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

// TikTok lookups go through Apify and can take a minute or two.
export const maxDuration = 180;

/** POST { platform, handle } → look up (and save) a creator. Team only. */
export async function POST(request: Request) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode: lookups are simulated in the browser." }, { status: 400 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { platform?: string; handle?: string };
  if (!PLATFORMS.includes(body.platform as Platform)) {
    return Response.json({ error: "Choose Instagram, YouTube or TikTok." }, { status: 400 });
  }
  try {
    const result = await lookupCreator(supabaseAdmin(), body.platform as Platform, String(body.handle ?? "").trim(), user.id);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
