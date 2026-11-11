import { z } from "zod";
import { errorResponse } from "@/lib/server/lookup-service";
import { serviceAccountEmail } from "@/lib/server/google";
import { aiAvailable } from "@/lib/server/sheet-ai";
import { confirmLayout, learnAlias, readLayout, syncSheet } from "@/lib/server/sheet-agent";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

/** GET → is the sheet agent set up (the email to share sheets with, and whether AI matching is on). Team only. */
export async function GET() {
  if (!IS_LIVE) return Response.json({ serviceEmail: null, ai: false, demo: true });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  return Response.json({ serviceEmail: serviceAccountEmail(), ai: aiAvailable() });
}

const col = z.number().int().min(0).max(500).nullable();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read-layout"), tab: z.string().max(200).nullable().optional() }),
  z.object({
    action: z.literal("confirm-layout"),
    layout: z.object({
      tab: z.string().min(1).max(200),
      headerRow: z.number().int().min(0).max(1000),
      columns: z.object({ link: col, handle: col, name: col, platform: col, date: col }),
    }),
  }),
  z.object({ action: z.literal("sync") }),
  z.object({ action: z.literal("learn"), label: z.string().min(1).max(300), creatorId: z.string().uuid() }),
]);

/** POST → read the layout, confirm it, sync now, or remember a confirmed spelling. Team only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  if (!(await currentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown project." }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That request isn't valid." }, { status: 400 });
  const db = supabaseAdmin();
  try {
    const b = parsed.data;
    if (b.action === "read-layout") return Response.json(await readLayout(db, id, fetch, b.tab ?? null));
    if (b.action === "confirm-layout") {
      await confirmLayout(db, id, b.layout);
      return Response.json(await syncSheet(db, id));
    }
    if (b.action === "learn") {
      await learnAlias(db, id, b.label, b.creatorId);
      return Response.json({ ok: true });
    }
    return Response.json(await syncSheet(db, id));
  } catch (e) {
    return errorResponse(e);
  }
}
