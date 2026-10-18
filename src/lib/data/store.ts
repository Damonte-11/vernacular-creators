"use client";
/**
 * Stage 1 data layer. Saves the team's changes (shortlists, notes, settings,
 * added creators) in this browser. In Stage 2 these functions will read and
 * write the Supabase database instead; the screens won't need to change.
 */
import { useSyncExternalStore } from "react";
import { APP_DEFAULTS } from "@config/app";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import type { CampaignResult, Creator, CreatorEdits, Settings, Shortlist } from "../types";

export interface AppState {
  settings: Settings;
  edits: Record<string, CreatorEdits>;
  addedCreators: Creator[];
  shortlists: Shortlist[];
  campaignResults: CampaignResult[];
}

const STORAGE_KEY = "vernacular-creators:v1";

export const DEFAULT_SETTINGS: Settings = {
  weights: { ...DEFAULT_SCORE_WEIGHTS },
  ...APP_DEFAULTS,
};

function initialState(): AppState {
  return {
    settings: DEFAULT_SETTINGS,
    edits: {},
    addedCreators: [],
    shortlists: [
      {
        id: "sample-december-push",
        name: "inDrive December push (sample)",
        client: "inDrive",
        createdAt: new Date().toISOString(),
        items: [
          "sample-tolukitchen_demo",
          "sample-chidilaughs_demo",
          "sample-amakastyles_demo",
          "sample-kunlecomedy_demo",
          "sample-lagostechdesk_demo",
        ].map((creatorId) => ({ creatorId, addedAt: new Date().toISOString() })),
      },
    ],
    campaignResults: [],
  };
}

const SERVER_STATE = initialState();
let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  const fresh = initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<AppState>;
    return {
      ...fresh,
      ...saved,
      settings: { ...fresh.settings, ...saved.settings, weights: { ...fresh.settings.weights, ...saved.settings?.weights } },
    };
  } catch {
    return fresh;
  }
}

function getState(): AppState {
  if (state === null) state = load();
  return state;
}

function setState(update: (s: AppState) => AppState) {
  state = update(getState());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: changes still apply until the page reloads.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  resetSettings() {
    setState((s) => ({ ...s, settings: DEFAULT_SETTINGS }));
  },
  editCreator(id: string, patch: CreatorEdits) {
    setState((s) => ({ ...s, edits: { ...s.edits, [id]: { ...s.edits[id], ...patch } } }));
  },
  addCreator(creator: Creator) {
    setState((s) =>
      s.addedCreators.some((c) => c.id === creator.id) ? s : { ...s, addedCreators: [...s.addedCreators, creator] },
    );
  },
  createShortlist(name: string, client: string): string {
    const id = newId();
    setState((s) => ({
      ...s,
      shortlists: [...s.shortlists, { id, name, client, createdAt: new Date().toISOString(), items: [] }],
    }));
    return id;
  },
  renameShortlist(id: string, name: string, client: string) {
    setState((s) => ({ ...s, shortlists: s.shortlists.map((l) => (l.id === id ? { ...l, name, client } : l)) }));
  },
  deleteShortlist(id: string) {
    setState((s) => ({ ...s, shortlists: s.shortlists.filter((l) => l.id !== id) }));
  },
  toggleInShortlist(listId: string, creatorId: string) {
    setState((s) => ({
      ...s,
      shortlists: s.shortlists.map((l) => {
        if (l.id !== listId) return l;
        const has = l.items.some((i) => i.creatorId === creatorId);
        return {
          ...l,
          items: has
            ? l.items.filter((i) => i.creatorId !== creatorId)
            : [...l.items, { creatorId, addedAt: new Date().toISOString() }],
        };
      }),
    }));
  },
  logCampaignResult(result: Omit<CampaignResult, "id" | "loggedAt">) {
    setState((s) => ({
      ...s,
      campaignResults: [...s.campaignResults, { ...result, id: newId(), loggedAt: new Date().toISOString() }],
    }));
  },
  deleteCampaignResult(id: string) {
    setState((s) => ({ ...s, campaignResults: s.campaignResults.filter((r) => r.id !== id) }));
  },
  resetEverything() {
    setState(() => initialState());
  },
};

const noop = () => () => {};

/** False during the first render, before this browser's saved data is loaded. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
