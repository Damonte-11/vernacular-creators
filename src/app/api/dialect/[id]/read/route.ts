import { readDialectNumbers } from "@/lib/server/dialect-reads";
import { errorResponse } from "@/lib/server/lookup-service";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** POST → read a Dialect project's numbers now: one new post ({ postId }), or this month's posts. Team only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { postId?: unknown };
  const postId = typeof body.postId === "string" && /^[0-9a-f-]{36}$/i.test(body.postId) ? body.postId : undefined;
  try {
    const s = await readDialectNumbers(supabaseAdmin(), { projectId: id, postId, force: !postId, deadline: Date.now() + 240_000 });
    return Response.json(s);
  } catch (e) {
    return errorResponse(e);
  }
}
