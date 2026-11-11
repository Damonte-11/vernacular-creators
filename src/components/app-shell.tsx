"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@config/brand";
import { Icon, type IconName } from "./icons";
import { Wordmark } from "./logo";
import { buttonClass, cx, Loading } from "./ui";
import { actions, useAppState } from "@/lib/data/store";
import { IS_LIVE } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

type NavItem = { href: string; label: string; icon: IconName };

/** The menu, grouped by the job each page does. */
const NAV: { title: string | null; items: NavItem[] }[] = [
  { title: null, items: [{ href: "/", label: "Home", icon: "home" }] },
  {
    title: "Creators",
    items: [
      { href: "/creators", label: "All creators", icon: "users" },
      { href: "/add", label: "Add creators", icon: "plus" },
      { href: "/discovered", label: "Discovered", icon: "star" },
      { href: "/leaderboards", label: "Leaderboards", icon: "trophy" },
    ],
  },
  {
    title: "Campaigns",
    items: [
      { href: "/projects", label: "Projects", icon: "clipboard" },
      { href: "/shortlists", label: "Lists", icon: "list" },
      { href: "/campaign-results", label: "Campaign results", icon: "chart" },
    ],
  },
];
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: "settings" };

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md text-ink" aria-label={`${BRAND.companyName} Creators home`}>
      <Wordmark className="h-5 w-auto" />
      <span className="rounded-md border border-line-strong px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-ink-2">Creators</span>
    </Link>
  );
}

/** Search box in the menu: jumps to the creators list with the search filled in. Press "/" to focus it. */
function QuickSearch({ onGo }: { onGo: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/creators?q=${encodeURIComponent(q.trim())}` : "/creators");
        // If the creators list is already open, tell it directly: the address change alone won't re-run its search.
        window.dispatchEvent(new CustomEvent("creator-search", { detail: q.trim() }));
        setQ("");
        ref.current?.blur();
        onGo();
      }}
    >
      <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search creators"
        aria-label="Search saved creators"
        className="h-8 w-full rounded-lg border border-line-strong/70 bg-surface/70 pl-8 pr-8 text-[13px] placeholder:text-muted transition-colors focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong bg-surface px-1 text-[10px] font-medium text-muted lg:block" aria-hidden>
        /
      </kbd>
    </form>
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

  const item = (n: NavItem) => {
    const active = isActive(n.href);
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 max-lg:h-10",
          active ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(23_23_21/0.06)]" : "text-ink-2 hover:bg-ink/5 hover:text-ink",
        )}
      >
        <Icon name={n.icon} size={16} className={active ? "text-accent" : "text-muted"} />
        {n.label}
      </Link>
    );
  };

  const menu = (
    <>
      <QuickSearch onGo={() => setOpen(false)} />
      <nav className="flex flex-col gap-4" aria-label="Main">
        {NAV.map((group, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {group.title && <p className="px-2.5 pb-1 text-[11px] font-medium text-muted">{group.title}</p>}
            {group.items.map(item)}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        {item(SETTINGS)}
        <AccountBox />
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Laptop side menu */}
      <aside className="no-print sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-rail px-3 py-4 lg:flex">
        <div className="px-1.5 pb-1">
          <Logo />
        </div>
        {menu}
      </aside>

      {/* Phone top bar */}
      <header className="no-print sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-rail px-4 lg:hidden">
        <Logo />
        <button className={cx(buttonClass.icon, "h-10 w-10")} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Icon name="menu" size={20} />
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="fade-enter absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="drawer-enter absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-rail p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button className={cx(buttonClass.icon, "h-10 w-10")} onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" size={20} />
              </button>
            </div>
            {menu}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {!IS_LIVE && <SampleBanner />}
        <ErrorBanner />
        <main key={pathname} className="page-enter mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
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
    <div className="border-t border-line-strong/60 px-2.5 pt-3 text-xs text-muted">
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
    <div className="no-print flex items-center justify-center gap-2 border-b border-warn/20 bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">
      <Icon name="info" size={14} className="shrink-0" />
      <span>
        <span className="font-semibold">Demo mode.</span> All creators and numbers are made-up samples. Changes are saved in this browser only.
      </span>
    </div>
  );
}
