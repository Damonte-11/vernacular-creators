-- Automatic discovery: the app finds new creators itself.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.

-- Where an automatically found creator came from, e.g. "Tagged by @kiekie".
alter table public.creators add column if not exists discovered_via text;
alter table public.creators add column if not exists discovered_at timestamptz;

-- Discovery settings (minimum followers, daily limit, keywords, ...).
alter table public.settings add column if not exists discovery jsonb not null default '{}';

-- Every account discovery has looked at, so none is checked twice.
create table if not exists public.discovery_candidates (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok')),
  handle text not null,
  platform_id text,
  -- review = "Worth a look"; added / skipped / ignored are final.
  status text not null default 'review' check (status in ('review', 'added', 'skipped', 'ignored')),
  source text not null default '',
  reason text not null default '',
  name text not null default '',
  photo_url text,
  bio text not null default '',
  followers integer,
  last_post_at timestamptz,
  creator_id uuid references public.creators (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists discovery_candidates_handle_idx on public.discovery_candidates (platform, lower(handle));
alter table public.discovery_candidates add column if not exists platform_id text;
create index if not exists discovery_candidates_status_idx on public.discovery_candidates (status, created_at desc);

alter table public.discovery_candidates enable row level security;
drop policy if exists "team_all" on public.discovery_candidates;
create policy "team_all" on public.discovery_candidates for all to authenticated using (true) with check (true);
