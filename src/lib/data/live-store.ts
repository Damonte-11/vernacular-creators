"use client";
/**
 * Live mode: everything is stored in Supabase and shared by the whole team.
 * Changes show straight away in this browser and are saved in the background;
 * if a save fails, the error is shown and the data is reloaded.
 */
import { supabaseBrowser } from "../supabase/browser";
import {
  campaignResultFromRow,
  CREATOR_SELECT,
  creatorFromRow,
  settingsFromRow,
  settingsToRow,
  shortlistFromRow,
  SHORTLIST_SELECT,
  type CampaignResultRow,
  type CreatorRow,
  type SettingsRow,
  type ShortlistRow,
} from "../supabase/mappers";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS, toggleItem } from "./demo-store";
import type { AppState, Backend } from "./types";

const EMPTY: AppState = { ready: false, error: null, creators: [], settings: DEFAULT_SETTINGS, shortlists: [], campaignResults: [] };
/** Creators are loaded in pages of this size. */
const PAGE = 500;

let state: AppState = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const db = () => supabaseBrowser();

async function loadAll() {
  try {
    const creators = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db().from("creators").select(CREATOR_SELECT).order("created_at").range(from, from + PAGE - 1);
      if (error) throw error;
      creators.push(...(data as CreatorRow[]).map(creatorFromRow));
      if (data.length < PAGE) break;
    }
    const [settings, shortlists, results] = await Promise.all([
      db().from("settings").select("*").eq("id", 1).maybeSingle<SettingsRow>(),
      db().from("shortlists").select(SHORTLIST_SELECT).order("created_at"),
      db().from("campaign_results").select("*").order("logged_at"),
    ]);
    for (const r of [settings, shortlists, results]) if (r.error) throw r.error;
    set({
      ready: true,
      error: null,
      creators,
      settings: settingsFromRow(settings.data),
      shortlists: ((shortlists.data ?? []) as ShortlistRow[]).map(shortlistFromRow),
      campaignResults: ((results.data ?? []) as CampaignResultRow[]).map(campaignResultFromRow),
    });
  } catch (e) {
    set({ ready: true, error: `Couldn't load data: ${message(e)}` });
  }
}

function reload() {
  loading = loadAll();
  return loading;
}

/** Run a save; on failure show the error and reload the true state. */
async function save(what: string, run: () => PromiseLike<{ error: unknown }>) {
  const { error } = await run();
  if (error) {
    set({ error: `Couldn't save ${what}: ${message(error)}` });
    await reload();
  }
}

function message(e: unknown): string {
  const text = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/column/i.test(text) && /excluded|min_post_age_hours_youtube/.test(text)) {
    return "the database needs a small update first. Run the files 0002 and 0003 from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
  }
  return text;
}

let settingsTimer: ReturnType<typeof setTimeout> | null = null;
function saveSettingsSoon(s: Settings) {
  // Sliders fire many changes a second; save once they stop moving.
  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    void save("settings", () => db().from("settings").update({ ...settingsToRow(s), updated_at: new Date().toISOString() }).eq("id", 1));
  }, 600);
}

export const liveBackend: Backend = {
  subscribe(listener) {
    listeners.add(listener);
    loading ??= loadAll();
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => EMPTY,
  actions: {
    updateSettings(patch) {
      const settings = { ...state.settings, ...patch };
      set({ settings });
      saveSettingsSoon(settings);
    },
    resetSettings() {
      set({ settings: DEFAULT_SETTINGS });
      saveSettingsSoon(DEFAULT_SETTINGS);
    },
    async editCreator(id, patch) {
      set({ creators: state.creators.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
      const row: Record<string, unknown> = {};
      if (patch.niche !== undefined) row.niche = patch.niche;
      if (patch.city !== undefined) row.city = patch.city;
      if (patch.country !== undefined) row.country = patch.country;
      if (patch.notes !== undefined) row.notes = patch.notes;
      if (patch.tags !== undefined) row.tags = patch.tags;
      await save("the creator", () => db().from("creators").update(row).eq("id", id));
    },
    async setPostExcluded(creatorId, postId, excluded) {
      const creator = state.creators.find((c) => c.id === creatorId);
      const post = creator?.posts.find((p) => p.id === postId);
      if (!creator || !post) return;
      set({
        creators: state.creators.map((c) =>
          c.id === creatorId ? { ...c, posts: c.posts.map((p) => (p.id === postId ? { ...p, excluded } : p)) } : c,
        ),
      });
      await save("the post", () =>
        db().from("posts").update({ excluded }).eq("creator_id", creatorId).eq("platform_post_id", post.platformPostId),
      );
    },
    upsertCreator(creator) {
      const exists = state.creators.some((c) => c.id === creator.id);
      set({ creators: exists ? state.creators.map((c) => (c.id === creator.id ? creator : c)) : [...state.creators, creator] });
    },
    async createShortlist(name, client) {
      const { data, error } = await db().from("shortlists").insert({ name, client }).select(SHORTLIST_SELECT).single<ShortlistRow>();
      if (error) {
        set({ error: `Couldn't create the shortlist: ${message(error)}` });
        return "";
      }
      const list = shortlistFromRow(data);
      set({ shortlists: [...state.shortlists, list] });
      return list.id;
    },
    async renameShortlist(id, name, client) {
      set({ shortlists: state.shortlists.map((l) => (l.id === id ? { ...l, name, client } : l)) });
      await save("the shortlist", () => db().from("shortlists").update({ name, client }).eq("id", id));
    },
    async deleteShortlist(id) {
      set({ shortlists: state.shortlists.filter((l) => l.id !== id) });
      await save("the shortlist", () => db().from("shortlists").delete().eq("id", id));
    },
    async toggleInShortlist(listId, creatorId) {
      const list = state.shortlists.find((l) => l.id === listId);
      if (!list) return;
      const has = list.items.some((i) => i.creatorId === creatorId);
      set({ shortlists: state.shortlists.map((l) => (l.id === listId ? toggleItem(l, creatorId) : l)) });
      await save("the shortlist", () =>
        has
          ? db().from("shortlist_items").delete().eq("shortlist_id", listId).eq("creator_id", creatorId)
          : db().from("shortlist_items").insert({ shortlist_id: listId, creator_id: creatorId }),
      );
    },
    async logCampaignResult(result) {
      const { data, error } = await db()
        .from("campaign_results")
        .insert({
          creator_id: result.creatorId,
          post_url: result.postUrl,
          reach: result.reach,
          impressions: result.impressions,
          views: result.views,
          logged_by: result.loggedBy,
        })
        .select("*")
        .single<CampaignResultRow>();
      if (error) {
        set({ error: `Couldn't save the result: ${message(error)}` });
        return;
      }
      set({ campaignResults: [...state.campaignResults, campaignResultFromRow(data)] });
    },
    async deleteCampaignResult(id) {
      set({ campaignResults: state.campaignResults.filter((r) => r.id !== id) });
      await save("the result", () => db().from("campaign_results").delete().eq("id", id));
    },
    clearError() {
      set({ error: null });
    },
    resetEverything() {},
  },
};
