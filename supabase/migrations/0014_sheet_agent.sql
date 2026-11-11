-- The sheet agent: what it knows about each project's Google Sheet (layout,
-- spellings the team confirmed, what it wrote back), and its guesses on links
-- it wasn't sure about.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.projects add column if not exists sheet_state jsonb not null default '{}';
alter table public.project_posts add column if not exists suggested_creator_id uuid references public.creators (id) on delete set null;
alter table public.project_posts add column if not exists match_note text;
alter table public.project_posts add column if not exists sheet_label text; -- the handle or name written in the sheet
