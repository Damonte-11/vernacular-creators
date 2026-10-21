-- Allow TikTok creators (looked up through Apify).
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.creators drop constraint if exists creators_platform_check;
alter table public.creators add constraint creators_platform_check check (platform in ('instagram', 'youtube', 'tiktok'));
-- TikTok view counts can pass 2 billion, more than a regular integer holds.
alter table public.posts alter column views type bigint;
alter table public.posts alter column likes type bigint;
