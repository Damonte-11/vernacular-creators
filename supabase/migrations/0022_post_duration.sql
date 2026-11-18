-- Video length in seconds for each post (TikTok and YouTube), used for the expected watch time estimate.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.posts add column if not exists duration_seconds integer;
