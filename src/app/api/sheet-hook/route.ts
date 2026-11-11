import { z } from "zod";
import { handleHook } from "@/lib/server/sheet-agent";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 120;

const Body = z.object({
  token: z.string().min(20).max(100),
  tabs: z.array(z.string().max(200)).max(100),
  tab: z.string().max(200).optional(),
  rows: z
    .array(z.array(z.string().max(5000)).max(200))
    .max(10000)
    .optional(),
});

/**
 * Called by the script inside a team's Google Sheet (see the project's Sheet
 * tab). It has no login; the secret project code in the body is what lets it in.
 */
export async function POST(request: Request) {
  if (!IS_LIVE) return Response.json({ error: "The app is in demo mode." }, { status: 400 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "The sheet sent something the app doesn't understand. Copy the script again from the app." }, { status: 400 });
  try {
    const reply = await handleHook(supabaseAdmin(), parsed.data);
    if (!reply) return Response.json({ error: "That project code isn't valid any more. Copy the script again from the project's Sheet tab." }, { status: 404 });
    return Response.json(reply);
  } catch (e) {
    console.error("Sheet hook failed", e);
    return Response.json({ error: "The app had a problem. It tries again next hour." }, { status: 500 });
  }
}
