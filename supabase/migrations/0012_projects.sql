-- Projects (Chorus campaigns): the creators booked, their post links and the
-- numbers read from them, and the project's documents.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '',
  chorus_type text not null default 'seedlings' check (chorus_type in ('seedlings', 'headliners', 'salad')),
  vertical text not null default '',
  start_date date not null,
  end_date date not null,
  guarantee bigint check (guarantee is null or guarantee >= 0), -- views promised in writing
  objective text not null default 'awareness' check (objective in ('awareness', 'consideration', 'conversion')),
  brief jsonb not null default '{}',
  sheet_url text,
  comment_cap integer not null default 3000 check (comment_cap between 0 and 20000),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.project_creators (
  project_id uuid not null references public.projects (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  due_date date,
  posts_agreed integer not null default 1 check (posts_agreed between 0 and 100),
  added_at timestamptz not null default now(),
  primary key (project_id, creator_id)
);

create table if not exists public.project_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  creator_id uuid references public.creators (id) on delete set null, -- null until matched
  url text not null,
  url_key text not null, -- the link without tracking bits, so the same post isn't added twice
  platform text check (platform in ('instagram', 'youtube', 'tiktok')),
  posted_date date,
  added_at timestamptz not null default now(),
  source text not null default 'app' check (source in ('app', 'sheet')),
  checks jsonb not null default '[]', -- [{day, checkedAt, views, likes, comments, shares, source}]
  problem text,
  unique (project_id, url_key)
);
create index if not exists project_posts_project on public.project_posts (project_id);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'other' check (kind in ('brief', 'contract', 'guidelines', 'deck', 'other')),
  title text not null,
  url text not null default '',
  file_path text, -- uploaded file, in the private "project-documents" storage bucket
  added_at timestamptz not null default now()
);
create index if not exists project_documents_project on public.project_documents (project_id);

do $$
declare t text;
begin
  foreach t in array array['projects','project_creators','project_posts','project_documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team_all" on public.%I', t);
    execute format('create policy "team_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Uploaded documents: a private bucket only signed-in team members can use.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('project-documents', 'project-documents', false)
      on conflict (id) do nothing;
    drop policy if exists "team_project_documents" on storage.objects;
    create policy "team_project_documents" on storage.objects for all to authenticated
      using (bucket_id = 'project-documents') with check (bucket_id = 'project-documents');
  end if;
end $$;
