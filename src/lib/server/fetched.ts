import type { Platform, Post } from "../types";

/** A creator's public data as it comes back from an official API, before saving. */
export interface FetchedCreator {
  platform: Platform;
  platformId: string;
  handle: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  followers: number;
  mediaCount: number;
  accountType: "professional" | "channel";
  country: string | null;
  posts: Omit<Post, "id">[];
}

export type Fetcher = typeof fetch;
