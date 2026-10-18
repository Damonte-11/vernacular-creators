-- Vernacular Creators: database setup.
-- Paste this whole file into Supabase → SQL Editor → New query, and click Run.
-- It is safe to run more than once.

-- ── Creators ────────────────────────────────────────────────────────────
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'youtube')),
  platform_id text not null,
  handle text not null,
  name text not null default '',
  photo_url text,
  bio text not null default '',
  niche text,
  city text,
  country text not null default 'Nigeria',
  followers integer not null default 0,
  media_count integer not null default 0,
  account_type text not null default 'professional',
  verified boolean not null default false,
  last_fetched_at timestamptz not null default now(),
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (platform, platform_id)
);
create unique index if not exists creators_platform_handle_idx on public.creators (platform, lower(handle));
create index if not exists creators_last_fetched_idx on public.creators (last_fetched_at);

-- Follower count (and averages) saved at every refresh, for growth and jump checks.
create table if not exists public.creator_snapshots (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.creators (id) on delete cascade,
  followers integer not null,
  avg_likes double precision,
  avg_comments double precision,
  avg_views double precision,
  engagement_rate double precision,
  captured_at timestamptz not null default now()
);
create index if not exists creator_snapshots_creator_idx on public.creator_snapshots (creator_id, captured_at);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.creators (id) on delete cascade,
  platform_post_id text not null,
  type text not null,
  posted_at timestamptz not null,
  likes integer, -- null when the creator hides likes
  comments integer not null default 0,
  views integer, -- null when there is no public view count
  url text not null default '',
  caption text not null default '',
  unique (creator_id, platform_post_id)
);
create index if not exists posts_creator_idx on public.posts (creator_id, posted_at desc);

-- Latest score and flags, saved at each refresh (the app also recalculates live
-- with the current settings).
create table if not exists public.scores (
  creator_id uuid primary key references public.creators (id) on delete cascade,
  total integer,
  breakdown jsonb not null default '{}',
  weights_used jsonb not null default '{}',
  computed_at timestamptz not null default now()
);

create table if not exists public.flags (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.creators (id) on delete cascade,
  type text not null,
  message text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);
create index if not exists flags_creator_idx on public.flags (creator_id);

-- ── Shortlists ──────────────────────────────────────────────────────────
create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '',
  -- Random, unguessable token for the public view-only report link.
  share_token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.shortlist_items (
  shortlist_id uuid not null references public.shortlists (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (shortlist_id, creator_id)
);

-- ── Optional: real results from past campaigns ─────────────────────────
create table if not exists public.campaign_results (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  post_url text not null default '',
  reach integer,
  impressions integer,
  views integer,
  logged_by text not null default '',
  logged_at timestamptz not null default now()
);

-- ── Settings (a single row) ────────────────────────────────────────────
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  weights jsonb not null default '{"engagement":30,"authenticity":25,"views":20,"consistency":15,"growth":10}',
  recent_post_count integer not null default 12,
  min_post_age_hours integer not null default 24,
  refresh_interval_hours integer not null default 24,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ── Security ────────────────────────────────────────────────────────────
-- Only signed-in team members can read or change anything. Public report links
-- are served by the app's server, which checks the share token itself.
-- Sign-ups are switched off in Supabase, so "signed in" means "on the team".
do $$
declare t text;
begin
  foreach t in array array['creators','creator_snapshots','posts','scores','flags','shortlists','shortlist_items','campaign_results','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team_all" on public.%I', t);
    execute format('create policy "team_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

