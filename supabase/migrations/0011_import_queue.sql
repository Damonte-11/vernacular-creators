-- Background imports: handles waiting to be looked up. The server works through
-- them about 150 an hour (inside Instagram's limit), with nobody keeping a tab open.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
create table if not exists public.import_queue (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok')),
  handle text not null,
  name text not null default '',
  email text,
  -- The list to add them to once found (optional).
  list_id uuid references public.shortlists (id) on delete set null,
  -- Status, rate, labels and notes for that list.
  fields jsonb not null default '{}',
  status text not null default 'waiting' check (status in ('waiting', 'done', 'failed')),
  detail text not null default '',
  creator_id uuid references public.creators (id) on delete set null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists import_queue_status_idx on public.import_queue (status, id);

alter table public.import_queue enable row level security;
drop policy if exists "team_all" on public.import_queue;
create policy "team_all" on public.import_queue for all to authenticated using (true) with check (true);
