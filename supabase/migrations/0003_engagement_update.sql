-- Engagement maths update: posts must be older before they count
-- (3 days on Instagram, 7 days on YouTube), as their numbers keep growing.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.settings add column if not exists min_post_age_hours_youtube integer not null default 168;
-- Move the old 24-hour default up to 72 hours (leaves any custom value alone).
update public.settings set min_post_age_hours = 72 where id = 1 and min_post_age_hours = 24;
alter table public.settings alter column min_post_age_hours set default 72;
