-- Post cover images, so creator cards and profiles show the actual posts.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.posts add column if not exists thumbnail_url text;
