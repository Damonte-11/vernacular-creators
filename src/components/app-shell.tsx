"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@config/brand";
import { Icon, type IconName } from "./icons";
import { cx } from "./ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/creators", label: "Creators", icon: "users" },
  { href: "/add", label: "Add creators", icon: "plus" },
  { href: "/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/shortlists", label: "Shortlists", icon: "list" },
  { href: "/campaign-results", label: "Campaign results", icon: "chart" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      {BRAND.logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={BRAND.logoPath} alt={BRAND.companyName} className="h-7 w-auto" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-ink">V</span>
      )}
      <span className="leading-tight">
        <span className="block text-sm font-bold">{BRAND.companyName}</span>
        <span className="block text-xs text-muted">Creators</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
            isActive(n.href) ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-canvas",
          )}
        >
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 lg:flex">
        <Logo />
        {links}
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Logo />
        <button className="rounded-lg p-2 hover:bg-canvas" onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={22} />
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col gap-6 bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button className="rounded-lg p-2 hover:bg-canvas" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" size={22} />
              </button>
            </div>
            {links}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <SampleBanner />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function SampleBanner() {
  return (
    <div className="no-print border-b border-warn/20 bg-warn-soft px-4 py-2 text-center text-xs font-semibold text-warn">
      Demo mode: all creators and numbers are made-up sample data. Changes are saved in this browser only.
    </div>
  );
}
