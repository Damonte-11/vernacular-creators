"use client";
/** Demo mode: sample data, with the team's changes saved in this browser only. */
import { APP_DEFAULTS } from "@config/app";
import { DISCOVERY_DEFAULTS } from "@config/discovery";
import { DEFAULT_SCORE_WEIGHTS } from "@config/scoring";
import { sampleCreators, sampleNow } from "@/sample-data/creators";
import { sampleProjects } from "@/sample-data/projects";
import { searchSaved } from "../people";
import { dueCheckDay } from "../post-links";
import { guessLayout, matchRow, readRows, rowLabel, squash } from "../sheet-sync";
import { DEFAULT_COMMENT_CAP, emptyBrief, normaliseUrl, todayLagos } from "../projects";
import type { CampaignResult, Creator, CreatorEdits, Project, ProjectCreator, Settings } from "../types";
import type { AppState, Backend } from "./types";

interface DemoData {
  settings: Settings;
  edits: Record<string, CreatorEdits>;
  addedCreators: Creator[];
  campaignResults: CampaignResult[];
  projects: Project[];
}

const STORAGE_KEY = "vernacular-creators:v1";
const SAMPLE = sampleCreators(sampleNow());

export const DEFAULT_SETTINGS: Settings = { weights: { ...DEFAULT_SCORE_WEIGHTS }, ...APP_DEFAULTS, discovery: { ...DISCOVERY_DEFAULTS } };

function initialData(): DemoData {
  return {
    settings: DEFAULT_SETTINGS,
    edits: {},
    addedCreators: [],
    campaignResults: [],
    projects: sampleProjects(SAMPLE),
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
    campaignResults: d.campaignResults,
    projects: d.projects,
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

function setProject(id: string, update: (p: Project) => Project) {
  set((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? update(p) : p)) }));
}

/** Add new creators to a project and update the ones already on it. */
export function upsertCreators(list: ProjectCreator[], items: ProjectCreator[]): ProjectCreator[] {
  const byId = new Map(items.map((i) => [i.creatorId, i]));
  const kept = list.map((c) => byId.get(c.creatorId) ?? c);
  const have = new Set(list.map((c) => c.creatorId));
  return [...kept, ...items.filter((i) => !have.has(i.creatorId))];
}

/** Remember the spelling the team just confirmed (both the handle and the name written). */
export function learnFrom(aliases: Record<string, string>, label: string, creatorId: string): Record<string, string> {
  const next = { ...aliases };
  for (const part of label.split("·")) if (squash(part).length >= 2) next[squash(part)] = creatorId;
  return next;
}

/** A messy demo sheet: misspelled handles, first names, a title row, a link with no creator. */
function demoSheet(p: Project, creators: Creator[]): string[][] {
  const booked = p.creators.map((pc) => creators.find((c) => c.id === pc.creatorId)).filter((c): c is Creator => !!c).slice(0, 6);
  const rows: string[][] = [["Links tracker (sample)"], ["S/N", "Influencer", "Handle", "Platform", "Date live", "Post link"]];
  booked.forEach((c, i) => {
    const handle = i % 3 === 0 ? `@${c.handle.toUpperCase()}` : i % 3 === 1 ? c.handle.replace(/_/g, "").slice(0, -1) : "";
    const name = i % 3 === 2 ? c.name.split(" ")[0] : c.name;
    const url = c.platform === "tiktok" ? `https://www.tiktok.com/@${c.handle}/video/8${i}1234` : c.platform === "youtube" ? `https://youtu.be/demo${i}abcdef` : `https://www.instagram.com/reel/Csheet${i}x/`;
    rows.push([String(i + 1), name, handle, c.platform === "tiktok" ? "TT" : c.platform === "youtube" ? "YouTube" : "IG", `${10 - i}/11/2026`, url]);
  });
  rows.push([String(booked.length + 1), "Unknown person", "@not_booked", "IG", "", "https://www.instagram.com/reel/Cnobody1/"]);
  return rows;
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
    async createProject(fields) {
      const id = newId();
      const project: Project = {
        id,
        client: "",
        chorusType: "seedlings",
        vertical: "",
        guarantee: null,
        objective: "awareness",
        brief: emptyBrief(),
        sheetUrl: null,
        commentCap: DEFAULT_COMMENT_CAP,
        ...fields,
        createdAt: new Date().toISOString(),
        creators: [],
        posts: [],
        documents: [],
      };
      set((d) => ({ ...d, projects: [...d.projects, project] }));
      return id;
    },
    async updateProject(id, fields) {
      setProject(id, (p) => ({ ...p, ...fields }));
    },
    async deleteProject(id) {
      set((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
    },
    async upsertProjectCreators(projectId, items) {
      setProject(projectId, (p) => ({ ...p, creators: upsertCreators(p.creators, items) }));
    },
    async removeProjectCreators(projectId, creatorIds) {
      const gone = new Set(creatorIds);
      setProject(projectId, (p) => ({
        ...p,
        creators: p.creators.filter((c) => !gone.has(c.creatorId)),
        posts: p.posts.map((x) => (x.creatorId && gone.has(x.creatorId) ? { ...x, creatorId: null } : x)),
      }));
    },
    async addProjectPosts(projectId, posts) {
      let added = 0;
      setProject(projectId, (p) => {
        const have = new Set(p.posts.map((x) => normaliseUrl(x.url)));
        const fresh = posts.filter((x) => {
          const k = normaliseUrl(x.url);
          if (have.has(k)) return false;
          have.add(k);
          return true;
        });
        added = fresh.length;
        return { ...p, posts: [...p.posts, ...fresh.map((x) => ({ ...x, id: newId(), addedAt: new Date().toISOString(), checks: [], problem: null, postedDate: x.postedDate ?? todayLagos() }))] };
      });
      return added;
    },
    async updateProjectPost(projectId, postId, patch) {
      setProject(projectId, (p) => {
        const post = p.posts.find((x) => x.id === postId);
        const learned = patch.creatorId && post?.sheetLabel ? learnFrom(p.sheetState?.aliases ?? {}, post.sheetLabel, patch.creatorId) : null;
        return {
          ...p,
          sheetState: learned ? { ...(p.sheetState ?? {}), aliases: learned } : p.sheetState,
          posts: p.posts.map((x) => (x.id === postId ? { ...x, ...patch, ...(patch.creatorId ? { suggestedCreatorId: null, matchNote: null } : {}) } : x)),
        };
      });
    },
    async addPostCheck(projectId, postId, check) {
      setProject(projectId, (p) => ({
        ...p,
        posts: p.posts.map((x) => (x.id === postId ? { ...x, problem: null, checks: [...x.checks.filter((c) => c.day !== check.day), check] } : x)),
      }));
    },
    async removeProjectPosts(projectId, postIds) {
      const gone = new Set(postIds);
      setProject(projectId, (p) => ({ ...p, posts: p.posts.filter((x) => !gone.has(x.id)) }));
    },
    async addProjectDocument(projectId, doc) {
      // Demo mode keeps links only; uploading files needs the live database.
      setProject(projectId, (p) => ({ ...p, documents: [...p.documents, { ...doc, id: newId(), filePath: null, addedAt: new Date().toISOString() }] }));
    },
    async removeProjectDocument(projectId, docId) {
      setProject(projectId, (p) => ({ ...p, documents: p.documents.filter((x) => x.id !== docId) }));
    },
    async documentLink(doc) {
      return doc.url || null;
    },
    async sheetAgent(projectId, request) {
      // Demo: a made-up messy sheet built from the project's own creators, run through the real rules.
      const p = getData().projects.find((x) => x.id === projectId);
      if (!p) return { message: "Project not found." };
      const rows = demoSheet(p, demoBackend.getSnapshot().creators);
      const state = p.sheetState ?? {};
      if (request.action === "read-layout" || (!state.layout && request.action === "sync")) {
        const layout = guessLayout("Links tracker (sample)", rows);
        setProject(projectId, (x) => ({ ...x, sheetState: { ...state, proposed: layout, tabs: ["Links tracker (sample)"], headers: rows[layout.headerRow] ?? [] } }));
        return { message: "Read the sample sheet. Check which column is which, then confirm.", needsLayout: true };
      }
      const layout = request.action === "confirm-layout" ? request.layout : state.layout!;
      const creators = demoBackend.getSnapshot().creators;
      const known = new Set(p.posts.map((x) => normaliseUrl(x.url)));
      const fresh = readRows(rows, layout).filter((r) => !known.has(r.urlKey));
      const added = fresh.map((r) => {
        const m = matchRow(r, p, creators, state.aliases ?? {});
        return {
          id: newId(),
          creatorId: m.creatorId,
          url: r.url,
          platform: r.platform,
          postedDate: r.date ?? todayLagos(),
          addedAt: new Date().toISOString(),
          source: "sheet" as const,
          checks: [],
          problem: null,
          suggestedCreatorId: m.creatorId ? null : m.suggestion,
          matchNote: m.creatorId ? null : m.suggestion ? "Close spelling of a booked creator's handle." : "No booked creator matches what's written in the sheet.",
          sheetLabel: rowLabel(r) || null,
        };
      });
      const sure = added.filter((x) => x.creatorId).length;
      const message = `${added.length ? `Added ${added.length} new links` : "No new links"}${sure ? `, ${sure} matched` : ""}${added.length - sure ? `, ${added.length - sure} to check` : ""}. (Demo: the live app also writes numbers back into the sheet.)`;
      setProject(projectId, (x) => ({
        ...x,
        posts: [...x.posts, ...added],
        sheetState: { ...state, layout, proposed: null, lastSyncAt: new Date().toISOString(), lastResult: message, log: [{ at: new Date().toISOString(), text: message }, ...(state.log ?? [])].slice(0, 50) },
      }));
      return { message };
    },
    async searchCreators(query) {
      return searchSaved(demoBackend.getSnapshot().creators, query, 8);
    },
    async checkPostNumbers(projectId) {
      // Demo: made-up numbers for posts that are due, as the live job would read them.
      const today = todayLagos();
      let n = 0;
      setProject(projectId, (p) => ({
        ...p,
        posts: p.posts.map((x) => {
          const day = dueCheckDay(x, today, null, Date.now());
          if (day === null) return x;
          n++;
          const base = [...x.url].reduce((a, c) => a + c.charCodeAt(0), 0);
          const views = Math.round((8_000 + (base % 40) * 1_500) * (day >= 7 ? 1 : day >= 3 ? 0.84 : 0.62));
          const check = { day, checkedAt: new Date().toISOString(), views, likes: Math.round(views * 0.05), comments: Math.round(views * 0.005), shares: x.platform === "tiktok" ? Math.round(views * 0.002) : null, source: "auto" as const };
          return { ...x, problem: null, checks: [...x.checks.filter((c) => c.day !== day), check] };
        }),
      }));
      return n ? `Read ${n} ${n === 1 ? "post" : "posts"} (made-up numbers in the demo).` : "Nothing is due a check right now. Posts are read on day 1, 3 and 7.";
    },
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
    async removeCreators(ids) {
      const gone = new Set(ids);
      // Demo: only creators added in this browser can be removed; the samples stay.
      set((d) => ({
        ...d,
        addedCreators: d.addedCreators.filter((c) => !gone.has(c.id)),
      }));
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


/** Adds new creators to a list, and updates the given fields of ones already on it. */
