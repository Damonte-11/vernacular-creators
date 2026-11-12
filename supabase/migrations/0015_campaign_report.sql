-- The end-of-campaign report: each post's caption (for the brief check) and
-- the report itself (comment analysis and the written draft).
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.project_posts add column if not exists caption text;
alter table public.projects add column if not exists report jsonb;
-- Comments read per post for the report: 200 by default (keeps Apify costs low); raise it per project.
alter table public.projects alter column comment_cap set default 200;
update public.projects set comment_cap = 200 where comment_cap = 3000;
