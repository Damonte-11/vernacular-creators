"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@config/brand";
import { Icon, type IconName } from "./icons";
import { Wordmark } from "./logo";
import { buttonClass, cx, Loading } from "./ui";
import { actions, useAppState } from "@/lib/data/store";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/creators", label: "Creators", icon: "users" },
  { href: "/add", label: "Add creators", icon: "plus" },
  { href: "/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/shortlists", label: "Lists", icon: "list" },
  { href: "/campaign-results", label: "Campaign results", icon: "chart" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md text-ink" aria-label={`${BRAND.companyName} Creators home`}>
      <Wordmark className="h-6 w-auto" />
      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted ring-1 ring-line">Creators</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-canvas text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" aria-hidden />}
            <Icon name={n.icon} className={active ? "text-accent-ink" : "text-muted"} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        {links}
        <div className="mt-auto">
          <AccountBox />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <button className={buttonClass.icon} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Icon name="menu" size={22} />
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button className={buttonClass.icon} onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" size={22} />
              </button>
            </div>
            {links}
            <div className="mt-auto">
              <AccountBox />
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {!IS_LIVE && <SampleBanner />}
        <ErrorBanner />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Ready>{children}</Ready>
        </main>
      </div>
    </div>
  );
}

/** Shows the page once this browser has loaded the data. */
function Ready({ children }: { children: React.ReactNode }) {
  const { ready } = useAppState();
  return ready ? <>{children}</> : <Loading />;
}

function ErrorBanner() {
  const { error } = useAppState();
  if (!error) return null;
  return (
    <div role="alert" className="no-print flex items-start justify-between gap-3 border-b border-bad/20 bg-bad-soft px-4 py-2 text-sm text-bad">
      <span className="flex items-start gap-2">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error}
      </span>
      <button className="shrink-0 font-semibold underline" onClick={() => actions.clearError()}>
        Dismiss
      </button>
    </div>
  );
}

/** Live mode: who's signed in, and a sign-out button. */
function AccountBox() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!IS_LIVE) return;
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  if (!IS_LIVE) return null;
  return (
    <div className="border-t border-line px-1 pt-4 text-xs text-muted">
      {email && <p className="truncate" title={email}>Signed in as <span className="font-medium text-ink-2">{email}</span></p>}
      <button
        className="mt-1.5 font-semibold text-ink-2 hover:text-ink hover:underline"
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          window.location.href = "/login";
        }}
      >
        Sign out
      </button>
    </div>
  );
}

export function SampleBanner() {
  return (
    <div className="no-print flex items-center justify-center gap-2 border-b border-warn/20 bg-warn-soft px-4 py-2 text-center text-xs text-warn">
      <Icon name="info" size={14} className="shrink-0" />
      <span>
        <span className="font-semibold">Demo mode.</span> All creators and numbers are made-up samples. Changes are saved in this browser only.
      </span>
    </div>
  );
}
