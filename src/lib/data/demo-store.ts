"use client";
/** Demo mode: sample data, with the team's changes saved in this browser only. */
import { APP_DEFAULTS } from "@config/app";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { sampleCreators, sampleNow } from "@/sample-data/creators";
import type { CampaignResult, Creator, CreatorEdits, Settings, Shortlist } from "../types";
import type { AppState, Backend } from "./types";

interface DemoData {
  settings: Settings;
  edits: Record<string, CreatorEdits>;
  addedCreators: Creator[];
  shortlists: Shortlist[];
  campaignResults: CampaignResult[];
}

const STORAGE_KEY = "vernacular-creators:v1";
const SAMPLE = sampleCreators(sampleNow());

export const DEFAULT_SETTINGS: Settings = { weights: { ...DEFAULT_SCORE_WEIGHTS }, ...APP_DEFAULTS };

function initialData(): DemoData {
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

function load(): DemoData {
  const fresh = initialData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<DemoData>;
    return {
      ...fresh,
      ...saved,
      settings: { ...fresh.settings, ...saved.settings, weights: { ...fresh.settings.weights, ...saved.settings?.weights } },
    };
  } catch {
    return fresh;
  }
}

function toState(d: DemoData, ready: boolean): AppState {
  return {
    ready,
    error: null,
    creators: [...SAMPLE, ...d.addedCreators].map((c) => {
      const e = d.edits[c.id];
      return e ? { ...c, ...Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)) } : c;
    }),
    settings: d.settings,
    shortlists: d.shortlists,
    campaignResults: d.campaignResults,
  };
}

const SERVER_STATE = toState(initialData(), false);
let data: DemoData | null = null;
let snapshot: AppState | null = null;
const listeners = new Set<() => void>();

function getData(): DemoData {
  data ??= load();
  return data;
}

function set(update: (d: DemoData) => DemoData) {
  data = update(getData());
  snapshot = null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: changes still apply until the page reloads.
  }
  listeners.forEach((l) => l());
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const demoBackend: Backend = {
  subscribe(listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        data = load();
        snapshot = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot() {
    snapshot ??= toState(getData(), true);
    return snapshot;
  },
  getServerSnapshot: () => SERVER_STATE,
  actions: {
    updateSettings(patch) {
      set((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },
    resetSettings() {
      set((d) => ({ ...d, settings: DEFAULT_SETTINGS }));
    },
    async editCreator(id, patch) {
      set((d) => ({ ...d, edits: { ...d.edits, [id]: { ...d.edits[id], ...patch } } }));
    },
    upsertCreator(creator) {
      set((d) => ({ ...d, addedCreators: [...d.addedCreators.filter((c) => c.id !== creator.id), creator] }));
    },
    async createShortlist(name, client) {
      const id = newId();
      set((d) => ({ ...d, shortlists: [...d.shortlists, { id, name, client, createdAt: new Date().toISOString(), items: [] }] }));
      return id;
    },
    async renameShortlist(id, name, client) {
      set((d) => ({ ...d, shortlists: d.shortlists.map((l) => (l.id === id ? { ...l, name, client } : l)) }));
    },
    async deleteShortlist(id) {
      set((d) => ({ ...d, shortlists: d.shortlists.filter((l) => l.id !== id) }));
    },
    async toggleInShortlist(listId, creatorId) {
      set((d) => ({ ...d, shortlists: d.shortlists.map((l) => (l.id === listId ? toggleItem(l, creatorId) : l)) }));
    },
    async logCampaignResult(result) {
      set((d) => ({ ...d, campaignResults: [...d.campaignResults, { ...result, id: newId(), loggedAt: new Date().toISOString() }] }));
    },
    async deleteCampaignResult(id) {
      set((d) => ({ ...d, campaignResults: d.campaignResults.filter((r) => r.id !== id) }));
    },
    clearError() {},
    resetEverything() {
      set(() => initialData());
    },
  },
};

export function toggleItem(l: Shortlist, creatorId: string): Shortlist {
  const has = l.items.some((i) => i.creatorId === creatorId);
  return {
    ...l,
    items: has ? l.items.filter((i) => i.creatorId !== creatorId) : [...l.items, { creatorId, addedAt: new Date().toISOString() }],
  };
}
