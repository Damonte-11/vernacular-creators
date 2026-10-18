/**
 * Live mode = Supabase is set up. Without these settings the app runs as the
 * Stage 1 demo on sample data, with no login.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const IS_LIVE = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
