-- Lists (was Shortlists): a status, rate, labels and notes per creator per list,
-- and a contact email per creator.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.creators add column if not exists email text;

alter table public.shortlist_items add column if not exists status text not null default 'shortlisted';
alter table public.shortlist_items add column if not exists rate numeric; -- Naira
alter table public.shortlist_items add column if not exists labels text[] not null default '{}';
alter table public.shortlist_items add column if not exists notes text not null default '';
alter table public.shortlist_items drop constraint if exists shortlist_items_status_check;
alter table public.shortlist_items add constraint shortlist_items_status_check
  check (status in ('shortlisted', 'contacted', 'negotiating', 'active', 'ended', 'declined'));
