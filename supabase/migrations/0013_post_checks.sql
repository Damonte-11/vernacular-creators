-- Automatic post numbers: when each campaign post was last tried, so the
-- hourly job reads each post at most once a day.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.project_posts add column if not exists last_tried_at timestamptz;
create index if not exists project_posts_platform on public.project_posts (platform);
