import "server-only";
/**
 * Google Sheets through a service account: the app's own Google identity.
 * The team shares a sheet with the service account's email (as Editor), and
 * the app reads it and writes numbers back. No user Google login involved.
 *
 * GOOGLE_SERVICE_ACCOUNT_JSON holds the whole key file Google downloads.
 * Docs: developers.google.com/identity/protocols/oauth2/service-account
 */
import { createSign } from "crypto";
import { LookupError } from "./errors";
import type { Fetcher } from "./fetched";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function serviceAccountFromEnv(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new LookupError("config", "Google Sheets isn't connected yet. Add GOOGLE_SERVICE_ACCOUNT_JSON in Vercel (see docs/SETUP.md).");
  try {
    const sa = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!sa.client_email || !sa.private_key) throw new Error("missing fields");
    return { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    throw new LookupError("config", "GOOGLE_SERVICE_ACCOUNT_JSON isn't a valid key file. Paste the whole JSON file Google downloaded.");
  }
}

/** The email the team shares sheets with, or null when it isn't set up. */
export function serviceAccountEmail(): string | null {
  try {
    return serviceAccountFromEnv().client_email;
  } catch {
    return null;
  }
}

let cached: { token: string; expires: number } | null = null;

/** A Google access token for the service account, or null when it isn't set up. */
export async function googleToken(fetcher: Fetcher = fetch): Promise<string | null> {
  let sa: ServiceAccount;
  try {
    sa = serviceAccountFromEnv();
  } catch {
    return null;
  }
  return accessToken(sa, fetcher);
}

async function accessToken(sa: ServiceAccount, fetcher: Fetcher): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token)
    throw new LookupError("auth", `Google refused the service account key: ${body.error_description ?? `HTTP ${res.status}`}.`);
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** The spreadsheet ID inside a Google Sheets link. */
export function spreadsheetId(url: string): string | null {
  return url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]{20,})/)?.[1] ?? null;
}

async function call<T>(path: string, init: RequestInit, fetcher: Fetcher): Promise<T> {
  const sa = serviceAccountFromEnv();
  const token = await accessToken(sa, fetcher);
  const res = await fetcher(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; status?: string } };
  if (res.ok) return body;
  if (res.status === 403 || res.status === 404) {
    throw new LookupError("auth", `The app can't open this sheet. Share it with ${sa.client_email} as Editor (Share button in Google Sheets), then try again.`);
  }
  if (res.status === 429) throw new LookupError("rate_limited", "Google asked us to slow down. Trying again next hour.", 60);
  throw new LookupError("upstream", `Google Sheets returned an error: ${body.error?.message ?? `HTTP ${res.status}`}`);
}

export interface SheetTab {
  title: string;
  rows: string[][];
}

/** The tab names, and all values in the tab asked for (the first tab when none is given). */
export async function readSheet(id: string, tab: string | null, fetcher: Fetcher = fetch): Promise<{ tabs: string[]; tab: SheetTab }> {
  const meta = await call<{ sheets?: { properties: { title: string } }[] }>(`${id}?fields=sheets.properties.title`, { method: "GET" }, fetcher);
  const tabs = (meta.sheets ?? []).map((s) => s.properties.title);
  const title = tab && tabs.includes(tab) ? tab : tabs[0];
  if (!title) throw new LookupError("not_found", "That spreadsheet has no tabs.");
  const range = encodeURIComponent(`'${title.replace(/'/g, "''")}'`);
  const values = await call<{ values?: string[][] }>(`${id}/values/${range}?valueRenderOption=FORMATTED_VALUE`, { method: "GET" }, fetcher);
  return { tabs, tab: { title, rows: values.values ?? [] } };
}

/** Write cells: each entry is a single cell in A1 notation within `tab`. */
export async function writeCells(id: string, tab: string, cells: { a1: string; value: string | number }[], fetcher: Fetcher = fetch): Promise<void> {
  if (cells.length === 0) return;
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  await call(
    `${id}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data: cells.map((c) => ({ range: `${quoted}!${c.a1}`, values: [[c.value]] })) }),
    },
    fetcher,
  );
}

/** Column letters for a 0-based index: 0 → A, 26 → AA. */
export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
