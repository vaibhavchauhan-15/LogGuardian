-- 2026041905_query_path_hardening.sql
-- Purpose:
-- 1) Align dedupe index with active query shape.
-- 2) Add lookup path for API key prefix in admin UX/API tooling.

-- Existing query pattern: dedupe_key + status + order by created_at desc + limit N.
drop index if exists public.idx_alerts_dedupe_active;
create index if not exists idx_alerts_dedupe_active
  on public.alerts (dedupe_key, created_at desc)
  where status = 'active';

-- Optional operational lookup path (non-sensitive key preview only).
create index if not exists idx_projects_api_key_prefix
  on public.projects (api_key_prefix);
