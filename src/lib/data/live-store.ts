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
  PROJECT_SELECT,
  projectFieldsToRow,
  projectFromRow,
  shortlistFromRow,
  SHORTLIST_SELECT,
  type ProjectRow,
  type CampaignResultRow,
  type CreatorRow,
  type SettingsRow,
  type ShortlistRow,
} from "../supabase/mappers";
import { DEFAULT_COMMENT_CAP, emptyBrief, normaliseUrl, todayLagos } from "../projects";
import type { ListItemFields, Project, ProjectPost, Settings } from "../types";
import { DEFAULT_SETTINGS, mergeItems, toggleItem, upsertCreators } from "./demo-store";
import type { AppState, Backend } from "./types";

const EMPTY: AppState = { ready: false, error: null, creators: [], settings: DEFAULT_SETTINGS, shortlists: [], campaignResults: [], projects: [] };
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
    const [settings, shortlists, results, projects] = await Promise.all([
      db().from("settings").select("*").eq("id", 1).maybeSingle<SettingsRow>(),
      db().from("shortlists").select(SHORTLIST_SELECT).order("created_at"),
      db().from("campaign_results").select("*").order("logged_at"),
      db().from("projects").select(PROJECT_SELECT).order("created_at"),
    ]);
    for (const r of [settings, shortlists, results]) if (r.error) throw r.error;
    // Projects need migration 0012; until it's run, the rest of the app still works.
    const projectsMissing = !!projects.error && /project/.test(projects.error.message);
    if (projects.error && !projectsMissing) throw projects.error;
    set({
      ready: true,
      creators,
      settings: settingsFromRow(settings.data),
      shortlists: ((shortlists.data ?? []) as ShortlistRow[]).map(shortlistFromRow),
      campaignResults: ((results.data ?? []) as CampaignResultRow[]).map(campaignResultFromRow),
      projects: projectsMissing ? [] : ((projects.data ?? []) as ProjectRow[]).map(projectFromRow),
      error: projectsMissing ? `Projects need a small database update: ${message(projects.error)}` : null,
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
  if (/column/i.test(text) && /\b(status|rate|labels|notes|email)\b/.test(text)) {
    return "the database needs a small update first. Run 0009_lists.sql from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
  }
  if (/discovery|discovered_/.test(text)) {
    return "the database needs a small update first. Run 0010_discovery.sql from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
  }
  if (/auto_link_from_bio/.test(text)) {
    return "the database needs a small update first. Run 0008_auto_link.sql from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
  }
  if (/project/.test(text) && /(relation|table|schema cache|does not exist|could not find)/i.test(text)) {
    return "run 0012_projects.sql from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
  }
  if (/person_id/.test(text)) {
    return "the database needs a small update first. Run 0007_linked_accounts.sql from supabase/migrations in Supabase's SQL Editor (see docs/SETUP.md).";
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
      if (patch.personId !== undefined) row.person_id = patch.personId;
      if (patch.email !== undefined) row.email = patch.email;
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
    async addToList(listId, items) {
      const list = state.shortlists.find((l) => l.id === listId);
      if (!list || items.length === 0) return;
      const have = new Set(list.items.map((i) => i.creatorId));
      set({ shortlists: state.shortlists.map((l) => (l.id === listId ? mergeItems(l, items) : l)) });
      const fresh = items.filter((i) => !have.has(i.creatorId)).map((i) => ({ shortlist_id: listId, creator_id: i.creatorId, ...itemRow(i.fields ?? {}) }));
      if (fresh.length) await save("the list", () => db().from("shortlist_items").insert(fresh));
      // Creators already on the list: only the fields that came with them change.
      for (const i of items.filter((x) => have.has(x.creatorId) && x.fields && Object.keys(x.fields).length)) {
        await save("the list", () => db().from("shortlist_items").update(itemRow(i.fields!)).eq("shortlist_id", listId).eq("creator_id", i.creatorId));
      }
    },
    async updateListItems(listId, creatorIds, fields) {
      if (creatorIds.length === 0) return;
      const ids = new Set(creatorIds);
      set({
        shortlists: state.shortlists.map((l) => (l.id === listId ? { ...l, items: l.items.map((i) => (ids.has(i.creatorId) ? { ...i, ...fields } : i)) } : l)),
      });
      await save("the list", () => db().from("shortlist_items").update(itemRow(fields)).eq("shortlist_id", listId).in("creator_id", creatorIds));
    },
    async removeCreators(ids) {
      if (ids.length === 0) return;
      const gone = new Set(ids);
      set({
        creators: state.creators.filter((c) => !gone.has(c.id)),
        shortlists: state.shortlists.map((l) => ({ ...l, items: l.items.filter((i) => !gone.has(i.creatorId)) })),
      });
      // Keep discovery from finding them again.
      await save("discovery", () =>
        db().from("discovery_candidates").update({ status: "ignored", reason: "Removed by the team", decided_at: new Date().toISOString() }).in("creator_id", ids),
      );
      await save("the creators", () => db().from("creators").delete().in("id", ids));
    },
    async removeFromList(listId, creatorIds) {
      if (creatorIds.length === 0) return;
      const ids = new Set(creatorIds);
      set({ shortlists: state.shortlists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => !ids.has(i.creatorId)) } : l)) });
      await save("the list", () => db().from("shortlist_items").delete().eq("shortlist_id", listId).in("creator_id", creatorIds));
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
    async createProject(fields) {
      const { data, error } = await db()
        .from("projects")
        .insert({ comment_cap: DEFAULT_COMMENT_CAP, brief: emptyBrief(), ...projectFieldsToRow(fields) })
        .select(PROJECT_SELECT)
        .single<ProjectRow>();
      if (error) {
        set({ error: `Couldn't create the project: ${message(error)}` });
        return "";
      }
      const project = projectFromRow(data);
      set({ projects: [...state.projects, project] });
      return project.id;
    },
    async updateProject(id, fields) {
      setProject(id, (p) => ({ ...p, ...fields }));
      await save("the project", () => db().from("projects").update(projectFieldsToRow(fields)).eq("id", id));
    },
    async deleteProject(id) {
      set({ projects: state.projects.filter((p) => p.id !== id) });
      await save("the project", () => db().from("projects").delete().eq("id", id));
    },
    async upsertProjectCreators(projectId, items) {
      if (items.length === 0) return;
      setProject(projectId, (p) => ({ ...p, creators: upsertCreators(p.creators, items) }));
      await save("the project", () =>
        db()
          .from("project_creators")
          .upsert(items.map((i) => ({ project_id: projectId, creator_id: i.creatorId, due_date: i.dueDate, posts_agreed: i.postsAgreed }))),
      );
    },
    async removeProjectCreators(projectId, creatorIds) {
      if (creatorIds.length === 0) return;
      const gone = new Set(creatorIds);
      setProject(projectId, (p) => ({
        ...p,
        creators: p.creators.filter((c) => !gone.has(c.creatorId)),
        posts: p.posts.map((x) => (x.creatorId && gone.has(x.creatorId) ? { ...x, creatorId: null } : x)),
      }));
      await save("the project", () => db().from("project_creators").delete().eq("project_id", projectId).in("creator_id", creatorIds));
      await save("the project", () => db().from("project_posts").update({ creator_id: null }).eq("project_id", projectId).in("creator_id", creatorIds));
    },
    async addProjectPosts(projectId, posts) {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return 0;
      const have = new Set(project.posts.map((x) => normaliseUrl(x.url)));
      const rows = [];
      for (const x of posts) {
        const key = normaliseUrl(x.url);
        if (have.has(key)) continue;
        have.add(key);
        rows.push({
          project_id: projectId,
          creator_id: x.creatorId,
          url: x.url,
          url_key: key,
          platform: x.platform,
          posted_date: x.postedDate ?? todayLagos(),
          source: x.source,
        });
      }
      if (rows.length === 0) return 0;
      const { data, error } = await db().from("project_posts").upsert(rows, { onConflict: "project_id,url_key", ignoreDuplicates: true }).select("*");
      if (error) {
        set({ error: `Couldn't add the links: ${message(error)}` });
        return 0;
      }
      const added = projectFromRow({ ...(project as unknown as ProjectRow), project_posts: data as ProjectRow["project_posts"] }).posts;
      setProject(projectId, (p) => ({ ...p, posts: [...p.posts, ...added] }));
      return added.length;
    },
    async updateProjectPost(projectId, postId, patch) {
      setProject(projectId, (p) => ({ ...p, posts: p.posts.map((x) => (x.id === postId ? { ...x, ...patch } : x)) }));
      const row: Record<string, unknown> = {};
      if (patch.creatorId !== undefined) row.creator_id = patch.creatorId;
      if (patch.postedDate !== undefined) row.posted_date = patch.postedDate;
      if (patch.problem !== undefined) row.problem = patch.problem;
      await save("the post", () => db().from("project_posts").update(row).eq("id", postId));
    },
    async addPostCheck(projectId, postId, check) {
      let checks: ProjectPost["checks"] = [];
      setProject(projectId, (p) => ({
        ...p,
        posts: p.posts.map((x) => {
          if (x.id !== postId) return x;
          checks = [...x.checks.filter((c) => c.day !== check.day), check];
          return { ...x, checks, problem: null };
        }),
      }));
      await save("the numbers", () => db().from("project_posts").update({ checks, problem: null }).eq("id", postId));
    },
    async removeProjectPosts(projectId, postIds) {
      if (postIds.length === 0) return;
      const gone = new Set(postIds);
      setProject(projectId, (p) => ({ ...p, posts: p.posts.filter((x) => !gone.has(x.id)) }));
      await save("the posts", () => db().from("project_posts").delete().in("id", postIds));
    },
    async addProjectDocument(projectId, doc, file) {
      let filePath: string | null = null;
      if (file) {
        filePath = `${projectId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await db().storage.from("project-documents").upload(filePath, file, { contentType: file.type || undefined });
        if (up.error) {
          set({ error: `Couldn't upload the file: ${message(up.error)}` });
          return;
        }
      }
      const { data, error } = await db()
        .from("project_documents")
        .insert({ project_id: projectId, kind: doc.kind, title: doc.title, url: doc.url, file_path: filePath })
        .select("*")
        .single<NonNullable<ProjectRow["project_documents"]>[number]>();
      if (error) {
        set({ error: `Couldn't save the document: ${message(error)}` });
        return;
      }
      setProject(projectId, (p) => ({
        ...p,
        documents: [...p.documents, { id: data.id, kind: data.kind, title: data.title, url: data.url, filePath: data.file_path, addedAt: data.added_at }],
      }));
    },
    async removeProjectDocument(projectId, docId) {
      const doc = state.projects.find((p) => p.id === projectId)?.documents.find((d) => d.id === docId);
      setProject(projectId, (p) => ({ ...p, documents: p.documents.filter((d) => d.id !== docId) }));
      await save("the document", () => db().from("project_documents").delete().eq("id", docId));
      if (doc?.filePath) await db().storage.from("project-documents").remove([doc.filePath]);
    },
    async checkPostNumbers(projectId) {
      const res = await fetch(`/api/projects/${projectId}/check`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { checked?: number; problems?: number; waiting?: number; notes?: string[]; error?: string };
      if (!res.ok) return body.error ?? "The check didn't run. Please try again.";
      const { data, error } = await db().from("projects").select(PROJECT_SELECT).eq("id", projectId).single<ProjectRow>();
      if (!error && data) setProject(projectId, () => projectFromRow(data));
      const parts = [
        body.checked ? `Read ${body.checked} ${body.checked === 1 ? "post" : "posts"}.` : "",
        body.problems ? `${body.problems} couldn't be read (see Needs attention).` : "",
        body.waiting ? `${body.waiting} still waiting.` : "",
        ...(body.notes ?? []),
      ].filter(Boolean);
      return parts.length ? parts.join(" ") : "Nothing is due a check right now. Posts are read on day 1, 3 and 7.";
    },
    async documentLink(doc) {
      if (!doc.filePath) return doc.url || null;
      const { data, error } = await db().storage.from("project-documents").createSignedUrl(doc.filePath, 600);
      if (error) {
        set({ error: `Couldn't open the file: ${message(error)}` });
        return null;
      }
      return data.signedUrl;
    },
    clearError() {
      set({ error: null });
    },
    resetEverything() {},
  },
};

function setProject(id: string, update: (p: Project) => Project) {
  set({ projects: state.projects.map((p) => (p.id === id ? update(p) : p)) });
}

/** Only the list fields that were given, as database columns. */
function itemRow(f: ListItemFields): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.status !== undefined) row.status = f.status;
  if (f.rate !== undefined) row.rate = f.rate;
  if (f.labels !== undefined) row.labels = f.labels;
  if (f.notes !== undefined) row.notes = f.notes;
  return row;
}
