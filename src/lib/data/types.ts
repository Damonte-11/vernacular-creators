import type { CampaignResult, Creator, CreatorEdits, ListItemFields, PostCheck, Project, ProjectCreator, ProjectDocument, ProjectFields, ProjectPost, Settings, Shortlist } from "../types";

/** A post link being added: everything except what the app fills in. */
export type NewProjectPost = Pick<ProjectPost, "url" | "platform" | "creatorId" | "postedDate" | "source">;
export type NewProjectDocument = Pick<ProjectDocument, "kind" | "title" | "url">;

export interface AppState {
  /** False until this browser has loaded the data. */
  ready: boolean;
  /** Last problem loading or saving, shown to the team. */
  error: string | null;
  creators: Creator[];
  settings: Settings;
  shortlists: Shortlist[];
  campaignResults: CampaignResult[];
  projects: Project[];
}

export interface Actions {
  updateSettings(patch: Partial<Settings>): void;
  resetSettings(): void;
  editCreator(id: string, patch: CreatorEdits): Promise<void>;
  /** Set a post aside (e.g. a known paid ad) or bring it back. */
  setPostExcluded(creatorId: string, postId: string, excluded: boolean): Promise<void>;
  /** Put a freshly looked-up creator into the list (replacing an older copy). */
  upsertCreator(creator: Creator): void;
  /** Returns the new shortlist's ID, or "" if it couldn't be saved. */
  createShortlist(name: string, client: string): Promise<string>;
  renameShortlist(id: string, name: string, client: string): Promise<void>;
  deleteShortlist(id: string): Promise<void>;
  toggleInShortlist(listId: string, creatorId: string): Promise<void>;
  /** Add creators to a list (or update the fields of ones already on it). */
  addToList(listId: string, items: { creatorId: string; fields?: ListItemFields }[]): Promise<void>;
  /** Set status, rate, labels or notes for one or more creators on a list. */
  updateListItems(listId: string, creatorIds: string[], fields: ListItemFields): Promise<void>;
  removeFromList(listId: string, creatorIds: string[]): Promise<void>;
  /** Delete creators from the database (and from every list). */
  removeCreators(ids: string[]): Promise<void>;
  logCampaignResult(result: Omit<CampaignResult, "id" | "loggedAt">): Promise<void>;
  deleteCampaignResult(id: string): Promise<void>;
  /** Returns the new project's ID, or "" if it couldn't be saved. */
  createProject(fields: ProjectFields & Pick<Project, "name" | "startDate" | "endDate">): Promise<string>;
  updateProject(id: string, fields: ProjectFields): Promise<void>;
  deleteProject(id: string): Promise<void>;
  /** Book creators on a project, or change their due date and number of posts. */
  upsertProjectCreators(projectId: string, items: ProjectCreator[]): Promise<void>;
  removeProjectCreators(projectId: string, creatorIds: string[]): Promise<void>;
  /** Add post links. Links already on the project are skipped. Returns how many were added. */
  addProjectPosts(projectId: string, posts: NewProjectPost[]): Promise<number>;
  updateProjectPost(projectId: string, postId: string, patch: Partial<Pick<ProjectPost, "creatorId" | "postedDate" | "problem">>): Promise<void>;
  /** Save a reading of a post's numbers (typed in, or read automatically). */
  addPostCheck(projectId: string, postId: string, check: PostCheck): Promise<void>;
  removeProjectPosts(projectId: string, postIds: string[]): Promise<void>;
  /** Keep a link (or, live only, an uploaded file) with the project. */
  addProjectDocument(projectId: string, doc: NewProjectDocument, file?: File): Promise<void>;
  removeProjectDocument(projectId: string, docId: string): Promise<void>;
  /** Read the numbers of this project's posts that are due a check, now. Returns what happened, in words. */
  checkPostNumbers(projectId: string): Promise<string>;
  /** A link to open an uploaded document (signed and short-lived in live mode). */
  documentLink(doc: ProjectDocument): Promise<string | null>;
  clearError(): void;
  /** Demo only: wipe everything saved in this browser. */
  resetEverything(): void;
}

export interface Backend {
  subscribe(listener: () => void): () => void;
  getSnapshot(): AppState;
  getServerSnapshot(): AppState;
  actions: Actions;
}
