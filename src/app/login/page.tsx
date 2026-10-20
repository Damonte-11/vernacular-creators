"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "@/components/logo";
import { buttonClass, Card, inputClass, labelClass } from "@/components/ui";
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
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <Wordmark className="h-7 w-auto text-ink" />
        <h1 className="mt-6 text-xl font-semibold">Sign in to Creators</h1>
        <p className="mt-1 text-sm text-ink-2">For the Vernacular team. Ask an admin if you need an account.</p>
        {!IS_LIVE ? (
          <div className="mt-4 rounded-lg bg-warn-soft p-3 text-sm text-warn">
            <p>The app is in demo mode, so no sign-in is needed.</p>
            <p className="mt-3 font-semibold">Setup check (values are hidden):</p>
            <ul className="mt-1 space-y-0.5">
              <li>{SUPABASE_URL ? "✅" : "❌"} NEXT_PUBLIC_SUPABASE_URL</li>
              <li>{SUPABASE_PUBLISHABLE_KEY ? "✅" : "❌"} NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
            </ul>
            <p className="mt-2 text-xs">
              Both need ✅ for live mode. They must be set for this environment (Production or Preview) before the deployment is built.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className={labelClass}>Email</span>
              <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Password</span>
              <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <button className={`${buttonClass.primary} w-full`} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
