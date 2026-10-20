-- Lets the team set aside individual posts (for example known paid ads) so they
-- don't count towards a creator's averages, reach or score.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.posts add column if not exists excluded boolean not null default false;
