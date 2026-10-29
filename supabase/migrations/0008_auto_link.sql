-- Setting: add and link a creator's other accounts automatically when their bio
-- names them (off by default). Paste into Supabase → SQL Editor → New query, and
-- click Run. Safe to run more than once.
alter table public.settings add column if not exists auto_link_from_bio boolean not null default false;
