import { errorResponse } from "@/lib/server/lookup-service";
import { reviewVideos } from "@/lib/server/video-review";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → Gemini watches the next few of the project's posts and checks them against the brief. Team only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { again?: boolean; since?: string };
  try {
    return Response.json(
      await reviewVideos(supabaseAdmin(), id, {
        again: body.again === true,
        since: typeof body.since === "string" ? body.since : undefined,
        deadline: Date.now() + 200_000,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
