"use client";

/** "12:05" from seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Waits `seconds`, calling `tick` with the seconds left every second so the
 * page can show a countdown. Returns early (false) if `stopped()` turns true.
 */
export async function waitWithCountdown(seconds: number, tick: (left: number) => void, stopped: () => boolean): Promise<boolean> {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (stopped()) return false;
    tick((end - Date.now()) / 1000);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return !stopped();
}

/** How long to wait after a "slow down": what the platform said, kept between 30 seconds and an hour. */
export function slowDownSeconds(retryAfterSeconds: number | null | undefined): number {
  return Math.min(3600, Math.max(30, retryAfterSeconds ?? 600));
}
