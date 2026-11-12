"use client";
/**
 * Dialect projects in the browser. Live mode reads and saves them in the
 * shared database; demo mode keeps the made-up sample brand in memory.
 */
import { useEffect, useSyncExternalStore } from "react";
import { splitTargets, type DialectPost, type DialectProject } from "../dialect";
import {
  DIALECT_SELECT,
  dialectPostFromRow,
  dialectPostToRow,
  dialectProjectFromRow,
  dialectProjectToRow,
  type DialectPostRow,
  type DialectProjectRow,
} from "../dialect-rows";
import { sampleDialectProject } from "../dialect-sample";
import { supabaseBrowser } from "../supabase/browser";
import { IS_LIVE } from "../supabase/config";

export interface DialectState {
  ready: boolean;
  projects: DialectProject[];
  error: string | null;
}

export type NewDialect = Pick<DialectProject, "brand" | "client" | "platforms" | "startMonth" | "months" | "totals" | "competitors">;

let state: DialectState = { ready: false, projects: [], error: null };
const listeners = new Set<() => void>();
const SERVER: DialectState = { ready: false, projects: [], error: null };
function set(next: Partial<DialectState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function setProject(id: string, f: (p: DialectProject) => DialectProject) {
  set({ projects: state.projects.map((p) => (p.id === id ? f(p) : p)) });
}
const db = () => supabaseBrowser();
const message = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e));
const missingTable = (e: unknown) => /dialect_(projects|posts)/.test(message(e)) && /exist|schema cache|relation/i.test(message(e));

let loading: Promise<void> | null = null;
async function load() {
  if (!IS_LIVE) {
    if (!state.ready) set({ ready: true, projects: [sampleDialectProject()] });
    return;
  }
  const { data, error } = await db().from("dialect_projects").select(DIALECT_SELECT).order("created_at");
  if (error) {
    set({
      ready: true,
      error: missingTable(error) ? "Run database update 0018_dialect.sql in Supabase first." : `Couldn't load Dialect projects: ${message(error)}`,
    });
    return;
  }
  set({ ready: true, error: null, projects: (data as DialectProjectRow[]).map(dialectProjectFromRow) });
}
async function reloadOne(id: string) {
  if (!IS_LIVE) return;
  const { data } = await db().from("dialect_projects").select(DIALECT_SELECT).eq("id", id).single<DialectProjectRow>();
  if (data) setProject(id, () => dialectProjectFromRow(data));
}

export function useDialect(): DialectState {
  useEffect(() => {
    loading ??= load().finally(() => (loading = null));
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}

async function save(what: string, run: () => PromiseLike<{ error: unknown }>) {
  if (!IS_LIVE) return true;
  const { error } = await run();
  if (error) {
    set({ error: `Couldn't save ${what}: ${message(error)}` });
    return false;
  }
  return true;
}

export const dialectActions = {
  clearError() {
    set({ error: null });
  },

  async create(v: NewDialect): Promise<string | null> {
    const monthTargets = splitTargets(v.totals, v.startMonth, v.months);
    if (!IS_LIVE) {
      const id = `demo-${Date.now()}`;
      const base = sampleDialectProject();
      set({
        projects: [...state.projects, { ...base, ...v, id, monthTargets, posts: [], followerReads: [], followersManual: {}, reports: {}, commitments: {} }],
      });
      return id;
    }
    const { data, error } = await db()
      .from("dialect_projects")
      .insert({ ...dialectProjectToRow({ ...v, monthTargets }), content_types: [] })
      .select(DIALECT_SELECT)
      .single<DialectProjectRow>();
    if (error || !data) {
      set({ error: missingTable(error) ? "Run database update 0018_dialect.sql in Supabase first." : `Couldn't create the project: ${message(error)}` });
      return null;
    }
    set({ projects: [...state.projects, dialectProjectFromRow(data)] });
    return data.id;
  },

  async updateProject(id: string, patch: Partial<DialectProject>) {
    setProject(id, (p) => ({ ...p, ...patch }));
    await save("the project", () => db().from("dialect_projects").update(dialectProjectToRow(patch)).eq("id", id));
  },

  async remove(id: string) {
    set({ projects: state.projects.filter((p) => p.id !== id) });
    await save("the project", () => db().from("dialect_projects").delete().eq("id", id));
  },

  /** Log a post; its numbers are read straight away. */
  async addPost(projectId: string, post: DialectPost): Promise<string | null> {
    const p = state.projects.find((x) => x.id === projectId);
    if (p?.posts.some((x) => x.url.trim() === post.url.trim())) return "That link is already logged.";
    if (!IS_LIVE) {
      setProject(projectId, (x) => ({ ...x, posts: [...x.posts, post] }));
      return null;
    }
    const { data, error } = await db()
      .from("dialect_posts")
      .insert({ ...dialectPostToRow(post), project_id: projectId })
      .select("*")
      .single<DialectPostRow>();
    if (error || !data) return `Couldn't log the post: ${message(error)}`;
    setProject(projectId, (x) => ({ ...x, posts: [...x.posts, dialectPostFromRow(data)] }));
    void fetch(`/api/dialect/${projectId}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: data.id }) })
      .then(() => reloadOne(projectId))
      .catch(() => undefined);
    return null;
  },

  async updatePost(projectId: string, postId: string, patch: Partial<DialectPost>) {
    setProject(projectId, (p) => ({ ...p, posts: p.posts.map((x) => (x.id === postId ? { ...x, ...patch } : x)) }));
    await save("the post", () => db().from("dialect_posts").update(dialectPostToRow(patch)).eq("id", postId));
  },

  async removePost(projectId: string, postId: string) {
    setProject(projectId, (p) => ({ ...p, posts: p.posts.filter((x) => x.id !== postId) }));
    await save("the post", () => db().from("dialect_posts").delete().eq("id", postId));
  },

  /** Read every post of this month (and anything never read) now. */
  async readNow(projectId: string): Promise<string> {
    if (!IS_LIVE) return "Demo: the live app reads the latest numbers from Instagram, TikTok, X and YouTube.";
    const res = await fetch(`/api/dialect/${projectId}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    await reloadOne(projectId);
    return res.ok ? (body.message ?? "Done.") : (body.error ?? "Reading didn't finish. Please try again.");
  },
};
