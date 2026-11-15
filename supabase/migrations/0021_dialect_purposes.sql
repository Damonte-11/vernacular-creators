-- Dialect: purposes (differentiation, safety, trend) belong to the brand that uses them, not every brand.
-- Paste into Supabase → SQL Editor → New query, and click Run. Safe to run more than once.
alter table public.dialect_projects add column if not exists purposes text[] not null default '{}';

-- Brands that already label posts with a purpose (inDrive) keep their three.
update public.dialect_projects p
set purposes = array['differentiation', 'safety', 'trend']
where p.purposes = '{}'
  and exists (select 1 from public.dialect_posts x where x.project_id = p.id and x.purpose is not null);

-- A brand can now name its own purposes.
alter table public.dialect_posts drop constraint if exists dialect_posts_purpose_check;
