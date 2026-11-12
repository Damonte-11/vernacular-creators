-- Comments read for a campaign report, kept per post so "Make it again" reuses them
-- instead of paying Apify to read them again. Only posts not read yet are fetched.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
create table if not exists public.post_comments (
  post_id uuid primary key references public.project_posts (id) on delete cascade,
  read_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb
);
alter table public.post_comments enable row level security;
drop policy if exists "team_all" on public.post_comments;
create policy "team_all" on public.post_comments for all to authenticated using (true) with check (true);
