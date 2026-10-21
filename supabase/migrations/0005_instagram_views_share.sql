-- Instagram's view counts include Facebook views of cross-posted Reels and paid
-- views, so only a share of them is counted (default 70%, adjustable in Settings).
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.settings add column if not exists instagram_views_share integer not null default 70;
