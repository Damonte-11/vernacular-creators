-- Link a person's accounts on different platforms (e.g. their Instagram, TikTok
-- and YouTube). Accounts with the same person_id belong to the same person; their
-- numbers always stay separate.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.creators add column if not exists person_id uuid;
create index if not exists creators_person_idx on public.creators (person_id) where person_id is not null;
