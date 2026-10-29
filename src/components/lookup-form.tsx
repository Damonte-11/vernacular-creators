"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import { PLATFORMS, platformName } from "@/lib/platforms";
import type { Platform } from "@/lib/types";
import { Icon } from "./icons";
import { IS_LIVE } from "@/lib/supabase/config";
import { buttonClass, cx, inputClass } from "./ui";

export function PlatformToggle({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="flex shrink-0 rounded-lg bg-surface-2 p-1 ring-1 ring-line" role="radiogroup" aria-label="Platform">
      {PLATFORMS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
            value === p ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink",
          )}
        >
          <Icon name={p} size={16} />
          {platformName(p)}
        </button>
      ))}
    </div>
  );
}

export function LookupForm() {
  const router = useRouter();
  const creators = useCreators();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return setError("Type a handle or paste a profile link first.");
    setBusy(true);
    setError(null);
    const result = await lookupCreator(platform, input, creators);
    setBusy(false);
    if (result.status === "error") return setError(result.error);
    // A new creator: their profile also looks for their accounts on other platforms.
    router.push(`/creators/${encodeURIComponent(result.creator.id)}${result.status === "added" ? "?discover=1" : ""}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row">
        <PlatformToggle value={platform} onChange={setPlatform} />
        <div className="relative flex-1">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={cx(inputClass, "pl-9")}
            placeholder={
              { instagram: "@handle or instagram.com/handle", youtube: "@handle, channel link or channel ID", tiktok: "@handle or tiktok.com/@handle" }[
                platform
              ]
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Creator handle or link"
            disabled={busy}
          />
        </div>
        <button className={cx(buttonClass.primary, "whitespace-nowrap")} disabled={busy}>
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-ink/30 border-t-brand-ink" aria-hidden />}
          {busy ? "Looking up…" : "Look up"}
        </button>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      <p className="text-xs text-muted">
        {!IS_LIVE
          ? 'Demo: any new handle creates a made-up profile. Try one with "personal" or "notfound" in it to see the error messages.'
          : platform === "instagram"
            ? "Instagram works for business and creator accounts only. Creators already saved load instantly."
            : platform === "tiktok"
              ? "A new TikTok lookup takes up to 2 minutes and uses one of this month's TikTok lookups. Creators already saved load instantly."
              : "Creators already saved load instantly."}
      </p>
    </form>
  );
}
