"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreators } from "@/lib/data/creators";
import { lookupCreator } from "@/lib/data/lookup";
import type { Platform } from "@/lib/types";
import { Icon } from "./icons";
import { buttonClass, cx, inputClass } from "./ui";

export function PlatformToggle({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label="Platform">
      {(["instagram", "youtube"] as Platform[]).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cx(
            "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold",
            value === p ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-canvas",
          )}
        >
          <Icon name={p} size={16} />
          {p === "instagram" ? "Instagram" : "YouTube"}
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
    router.push(`/creators/${encodeURIComponent(result.creator.id)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <PlatformToggle value={platform} onChange={setPlatform} />
        <input
          className={inputClass}
          placeholder={platform === "instagram" ? "@handle or instagram.com/handle" : "@handle, channel link or channel ID"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Creator handle or link"
        />
        <button className={cx(buttonClass.primary, "whitespace-nowrap")} disabled={busy}>
          {busy ? "Looking up…" : "Look up"}
        </button>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      <p className="text-xs text-muted">
        Demo: any new handle creates a made-up profile. Try one with &quot;personal&quot; or &quot;notfound&quot; in it to see the error messages.
      </p>
    </form>
  );
}
