"use client";
/**
 * The app's data. Demo mode keeps sample data in this browser; live mode
 * (once Supabase is set up) loads and saves everything in the shared database.
 * Screens use the same hooks either way.
 */
import { useSyncExternalStore } from "react";
import { IS_LIVE } from "../supabase/config";
import { demoBackend } from "./demo-store";
import { liveBackend } from "./live-store";
import type { AppState } from "./types";

export type { AppState } from "./types";
export { DEFAULT_SETTINGS } from "./demo-store";

const backend = IS_LIVE ? liveBackend : demoBackend;

export const actions = backend.actions;

export function useAppState(): AppState {
  return useSyncExternalStore(backend.subscribe, backend.getSnapshot, backend.getServerSnapshot);
}

/** False until this browser's data has loaded. */
export function useHydrated(): boolean {
  return useAppState().ready;
}
