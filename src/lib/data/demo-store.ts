"use client";
/** Demo mode: sample data, with the team's changes saved in this browser only. */
import { newListItem } from "../lists";
import { APP_DEFAULTS } from "@config/app";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { sampleCreators, sampleNow } from "@/sample-data/creators";
import type { CampaignResult, Creator, CreatorEdits, ListItemFields, Settings, Shortlist } from "../types";
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
          newListItem("sample-tolukitchen_demo", { status: "active", rate: 350_000, labels: ["food"] }),
          newListItem("sample-chidilaughs_demo", { status: "negotiating", rate: 1_200_000, labels: ["comedy"], notes: "Asked for 2 Reels + 3 stories." }),
          newListItem("sample-amakastyles_demo", { status: "contacted", labels: ["fashion"] }),
          newListItem("sample-kunlecomedy_demo", { status: "active", rate: 250_000, labels: ["comedy"] }),
          newListItem("sample-lagostechdesk_demo", { status: "shortlisted", rate: 600_000, labels: ["tech"] }),
        ],
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
      if (!e) return c;
      const { excludedPostIds, ...fields } = e;
      const edited = { ...c, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) };
      return excludedPostIds?.length
        ? { ...edited, posts: c.posts.map((p) => (excludedPostIds.includes(p.id) ? { ...p, excluded: true } : p)) }
        : edited;
    }),
    settings: d.settings,
    // Lists saved before statuses existed get the defaults.
    shortlists: d.shortlists.map((l) => ({ ...l, items: l.items.map((i) => ({ ...newListItem(i.creatorId), ...i })) })),
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
    async setPostExcluded(creatorId, postId, excluded) {
      set((d) => {
        const current = d.edits[creatorId]?.excludedPostIds ?? [];
        const next = excluded ? [...new Set([...current, postId])] : current.filter((id) => id !== postId);
        return { ...d, edits: { ...d.edits, [creatorId]: { ...d.edits[creatorId], excludedPostIds: next } } };
      });
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
    async addToList(listId, items) {
      set((d) => ({ ...d, shortlists: d.shortlists.map((l) => (l.id === listId ? mergeItems(l, items) : l)) }));
    },
    async updateListItems(listId, creatorIds, fields) {
      const ids = new Set(creatorIds);
      set((d) => ({
        ...d,
        shortlists: d.shortlists.map((l) => (l.id === listId ? { ...l, items: l.items.map((i) => (ids.has(i.creatorId) ? { ...i, ...fields } : i)) } : l)),
      }));
    },
    async removeFromList(listId, creatorIds) {
      const ids = new Set(creatorIds);
      set((d) => ({ ...d, shortlists: d.shortlists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => !ids.has(i.creatorId)) } : l)) }));
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
    items: has ? l.items.filter((i) => i.creatorId !== creatorId) : [...l.items, newListItem(creatorId)],
  };
}

/** Adds new creators to a list, and updates the given fields of ones already on it. */
export function mergeItems(l: Shortlist, items: { creatorId: string; fields?: ListItemFields }[]): Shortlist {
  const next = [...l.items];
  for (const { creatorId, fields } of items) {
    const i = next.findIndex((x) => x.creatorId === creatorId);
    if (i >= 0) next[i] = { ...next[i], ...fields };
    else next.push(newListItem(creatorId, fields));
  }
  return { ...l, items: next };
}
