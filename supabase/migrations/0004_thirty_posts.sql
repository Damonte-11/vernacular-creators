-- Base numbers on the last 30 posts (was 12), like HypeAuditor, so a short
-- hot streak or boost doesn't inflate them.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
update public.settings set recent_post_count = 30 where id = 1 and recent_post_count = 12;
alter table public.settings alter column recent_post_count set default 30;
