import type { Creator, CreatorEdits } from "./types";

/**
 * A person can have accounts on several platforms (Instagram, TikTok, YouTube).
 * Accounts are linked by a shared personId; their numbers are never combined.
 */

/** The other accounts linked to this creator, Instagram first, then YouTube, then TikTok. */
export function linkedAccounts(creator: Creator, all: Creator[]): Creator[] {
  if (!creator.personId) return [];
  const order = { instagram: 0, youtube: 1, tiktok: 2 };
  return all
    .filter((c) => c.id !== creator.id && c.personId === creator.personId)
    .sort((a, b) => order[a.platform] - order[b.platform] || b.followers - a.followers);
}

/** Letters and digits only, without common add-ons like "tv", "official" or "_demo". */
export function handleKey(handle: string): string {
  return handle
    .toLowerCase()
    .replace(/_demo$/, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(official|tv|real|the|channel|hq)/g, "");
}

/**
 * Saved accounts that might be the same person: same name, a matching handle,
 * or their handle mentioned in this creator's bio. Only suggestions: the team
 * confirms before anything is linked.
 */
export function suggestLinks(creator: Creator, all: Creator[], limit = 3): Creator[] {
  const name = creator.name.trim().toLowerCase();
  const key = handleKey(creator.handle);
  const bio = creator.bio.toLowerCase();
  return all
    .filter((c) => c.id !== creator.id && !(creator.personId && c.personId === creator.personId))
    .map((c) => {
      const k = handleKey(c.handle);
      let score = 0;
      if (c.name.trim().toLowerCase() === name && name.length >= 4) score += 2;
      if (k.length >= 4 && key.length >= 4 && (k === key || k.includes(key) || key.includes(k))) score += 2;
      if (bio.includes(c.handle.toLowerCase())) score += 3;
      if (c.platform !== creator.platform) score += 1;
      return { c, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.c.followers - a.c.followers)
    .slice(0, limit)
    .map((x) => x.c);
}

/**
 * The edits that link `other` (and anyone already linked to it) to `creator`.
 * Returns a list of [creatorId, edit] to save.
 */
export function linkEdits(creator: Creator, other: Creator, all: Creator[], newId: () => string): [string, CreatorEdits][] {
  const personId = creator.personId ?? other.personId ?? newId();
  const group = new Set([creator.id, other.id]);
  for (const c of all) {
    if ((creator.personId && c.personId === creator.personId) || (other.personId && c.personId === other.personId)) group.add(c.id);
  }
  return [...group].filter((id) => all.find((c) => c.id === id)?.personId !== personId).map((id) => [id, { personId }]);
}

/** The edits that unlink one account. If only one account would be left, it's unlinked too. */
export function unlinkEdits(creator: Creator, all: Creator[]): [string, CreatorEdits][] {
  const rest = linkedAccounts(creator, all);
  const edits: [string, CreatorEdits][] = [[creator.id, { personId: null }]];
  if (rest.length === 1) edits.push([rest[0].id, { personId: null }]);
  return edits;
}
