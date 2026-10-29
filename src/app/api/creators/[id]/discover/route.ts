import { discoveryPlan, type DiscoveryResult } from "@/lib/discover";
import { LookupError } from "@/lib/server/errors";
import { errorResponse, fetchFromPlatform } from "@/lib/server/lookup-service";
import { findCreator, getCreator } from "@/lib/server/repository";
import { IS_LIVE } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";
import type { Platform } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST → possible accounts of the same person on the other platforms. Checks
 * Instagram and YouTube (free), and only the database for TikTok. Saves nothing.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!IS_LIVE) return Response.json({ error: "Demo mode." }, { status: 400 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();
  try {
    const creator = await getCreator(db, id);
    if (!creator) throw new LookupError("not_found", "This creator is no longer in the database.");

    const results: DiscoveryResult[] = [];
    const done = new Set<Platform>();
    for (const m of discoveryPlan(creator.bio, creator.handle, creator.platform)) {
      if (done.has(m.platform)) continue; // first hit per platform is enough
      const saved = await findCreator(db, m.platform, m.handle);
      if (saved) {
        if (saved.id !== creator.id && !(creator.personId && saved.personId === creator.personId)) {
          results.push({ ...m, handle: saved.handle, savedId: saved.id });
        }
        done.add(m.platform);
        continue;
      }
      if (m.platform === "tiktok") {
        // Only offer TikTok when the bio names it; guessing would spend credit on strangers.
        if (m.source === "bio") results.push({ ...m, unchecked: true });
        done.add(m.platform);
        continue;
      }
      try {
        const f = await fetchFromPlatform(m.platform, m.handle, 1);
        results.push({ ...m, handle: f.handle, preview: { name: f.name, followers: f.followers, photoUrl: f.photoUrl, bio: f.bio.slice(0, 300), platformId: f.platformId } });
        done.add(m.platform);
      } catch (e) {
        // Not found is normal for a guess; anything else (limits, keys) stops this platform quietly.
        if (!(e instanceof LookupError) || e.code !== "not_found" && e.code !== "not_professional") done.add(m.platform);
      }
    }
    return Response.json({ results });
  } catch (e) {
    return errorResponse(e);
  }
}
