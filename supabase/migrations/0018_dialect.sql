-- Dialect: brands whose own social pages Vernacular runs month after month.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
create table if not exists public.dialect_projects (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  client text not null default '',
  -- [{ platform: instagram|tiktok|x|youtube, handle }]
  platforms jsonb not null default '[]'::jsonb,
  start_month text not null,
  months int not null default 4 check (months between 1 and 24),
  -- Agreement totals and the per-month split: { views, followers, posts, engagements }
  totals jsonb not null default '{}'::jsonb,
  month_targets jsonb not null default '{}'::jsonb,
  ad_rule jsonb not null default '{"views": 400000, "timesUsual": 5}'::jsonb,
  competitors text[] not null default '{}',
  content_types text[] not null default '{}',
  -- Follower counts read with the numbers: [{ at, platform, followers }]
  follower_reads jsonb not null default '[]'::jsonb,
  -- Followers gained typed in for a month, when a platform can't be read: { "2026-11": 1200 }
  followers_manual jsonb not null default '{}'::jsonb,
  commitments jsonb not null default '{}'::jsonb,
  listening_cap_usd numeric not null default 3,
  -- Monthly reports, by month: { "2026-10": {...} }
  reports jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dialect_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dialect_projects (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'x', 'youtube')),
  url text not null,
  title text not null default '',
  posted_at timestamptz not null,
  format text not null default 'video',
  content_type text,
  purpose text check (purpose in ('differentiation', 'safety', 'trend')),
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  manual boolean not null default false,
  possible_ad boolean not null default false,
  decision text check (decision in ('organic', 'manual', 'excluded')),
  organic jsonb,
  caption text,
  last_read_at timestamptz,
  read_problem text,
  created_at timestamptz not null default now(),
  unique (project_id, url)
);
create index if not exists dialect_posts_project on public.dialect_posts (project_id, posted_at);

do $$
declare t text;
begin
  foreach t in array array['dialect_projects', 'dialect_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team_all" on public.%I', t);
    execute format('create policy "team_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
