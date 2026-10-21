import { NextResponse, type NextRequest } from "next/server";
import { supabaseForUser } from "@/lib/supabase/server";

/**
 * Google sends people back here after "Sign in with Google". Swaps the
 * one-time code for a session cookie, then opens the page they asked for.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const fail = (reason: string) => {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", reason);
    if (next !== "/") to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  };

  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (oauthError) return fail(oauthError);
  const code = url.searchParams.get("code");
  if (!code) return fail("missing_code");

  const { error } = await (await supabaseForUser()).auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);
  return NextResponse.redirect(new URL(next, url.origin));
}

/** Only go back to pages on this site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
