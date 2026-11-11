"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "@/components/logo";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { IS_LIVE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => googleError(params.get("error")));
  const [googleBusy, setGoogleBusy] = useState(false);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    const next = params.get("next");
    if (next) callback.searchParams.set("next", next);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setGoogleBusy(false);
      setError(/provider is not enabled/i.test(error.message) ? "Google sign-in isn't switched on yet (see docs/SETUP.md, part 1.6)." : error.message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. Check them and try again."
          : /fetch|network/i.test(error.message)
            ? "Couldn't reach the login service. Check your internet connection and try again."
            : error.message,
      );
      return;
    }
    const next = params.get("next");
    // Only go back to pages on this site.
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand side: Eerie Black with the two lines Vernacular is known by. */}
      <div className="flex flex-col justify-between gap-10 bg-brand px-6 py-6 text-rail sm:px-10 lg:py-10">
        <Wordmark className="h-7 w-auto self-start" />
        <div className="max-lg:hidden">
          <p className="max-w-md text-[40px] font-semibold leading-[1.08] tracking-tight">
            We don&apos;t market at people. We market <span className="text-accent">through communities.</span>
          </p>
          <p className="mt-5 max-w-sm text-[15px] text-rail/70">Where others buy reach, we build belief. This is where the team finds, vets and ranks the creators who carry it.</p>
        </div>
        <p className="text-xs text-rail/60 max-lg:hidden">Vernacular Creators · team access only</p>
      </div>
      <div className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center">
       <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-ink-2">For the Vernacular team. Ask an admin if you need an account.</p>
        {!IS_LIVE ? (
          <div className="mt-4 rounded-lg bg-warn-soft p-3 text-sm text-warn">
            <p>The app is in demo mode, so no sign-in is needed.</p>
            <p className="mt-3 font-semibold">Setup check (values are hidden):</p>
            <ul className="mt-1 space-y-0.5">
              <li><b>{SUPABASE_URL ? "Set" : "Missing"}:</b> NEXT_PUBLIC_SUPABASE_URL</li>
              <li><b>{SUPABASE_PUBLISHABLE_KEY ? "Set" : "Missing"}:</b> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
            </ul>
            <p className="mt-2 text-xs">
              Both need to be set for live mode. They must be set for this environment (Production or Preview) before the deployment is built.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <button type="button" onClick={signInWithGoogle} disabled={googleBusy} className={`${buttonClass.secondary} h-10 w-full text-sm`}>
              <GoogleLogo /> {googleBusy ? "Opening Google…" : "Sign in with Google"}
            </button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or use email and password <span className="h-px flex-1 bg-line" />
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className={labelClass}>Email</span>
                <input className={`${inputClass} h-10 text-sm`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Password</span>
                <input
                  className={`${inputClass} h-10 text-sm`}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                  {error}
                </p>
              )}
              <button className={`${buttonClass.primary} h-10 w-full text-sm`} disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        )}
       </div>
      </div>
    </div>
  );
}

/** Turns what Google or Supabase sent back into words the team can act on. */
function googleError(code: string | null): string | null {
  if (!code) return null;
  if (/signups? not allowed|not allowed for this instance|user not found/i.test(code)) {
    return "This Google account isn't on the team yet. Ask an admin to add your email in Supabase, then try again with the same email.";
  }
  if (/access_denied/i.test(code)) return "Google sign-in was cancelled.";
  return "Google sign-in didn't work. Please try again, or use your email and password.";
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
