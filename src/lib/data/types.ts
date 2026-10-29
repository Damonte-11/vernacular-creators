import type { CampaignResult, Creator, CreatorEdits, ListItemFields, Settings, Shortlist } from "../types";

export interface AppState {
  /** False until this browser has loaded the data. */
  ready: boolean;
  /** Last problem loading or saving, shown to the team. */
  error: string | null;
  creators: Creator[];
  settings: Settings;
  shortlists: Shortlist[];
  campaignResults: CampaignResult[];
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
  logCampaignResult(result: Omit<CampaignResult, "id" | "loggedAt">): Promise<void>;
  deleteCampaignResult(id: string): Promise<void>;
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
