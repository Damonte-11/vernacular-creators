-- Video review: what Gemini saw when it watched each campaign post.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.project_posts add column if not exists content_review jsonb;
