-- Audience signals read from the comments on a creator's latest posts.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.creators add column if not exists audience jsonb;
