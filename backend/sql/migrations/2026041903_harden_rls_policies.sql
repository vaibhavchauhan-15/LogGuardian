-- 2026041903_harden_rls_policies.sql
-- Purpose:
-- 1) Force RLS on exposed tables.
-- 2) Replace implicit/empty policy posture with explicit tenant policies.
-- 3) Keep anon locked down and give authenticated minimal table privileges.

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.alerts enable row level security;
alter table public.anomalies enable row level security;
alter table public.analytics_minute enable row level security;

alter table public.users force row level security;
alter table public.projects force row level security;
alter table public.alerts force row level security;
alter table public.anomalies force row level security;
alter table public.analytics_minute force row level security;

-- Drop any prior policies created by this migration family.
drop policy if exists users_select_self on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;
drop policy if exists projects_select_owner on public.projects;
drop policy if exists projects_insert_owner on public.projects;
drop policy if exists projects_update_owner on public.projects;
drop policy if exists alerts_select_owner on public.alerts;
drop policy if exists alerts_update_owner on public.alerts;
drop policy if exists anomalies_select_owner on public.anomalies;
drop policy if exists analytics_minute_select_owner on public.analytics_minute;

-- Users can only access their own profile row.
create policy users_select_self
on public.users
for select
using ((select auth.uid()) = id);

create policy users_insert_self
on public.users
for insert
with check ((select auth.uid()) = id);

create policy users_update_self
on public.users
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Project ownership is user-scoped.
create policy projects_select_owner
on public.projects
for select
using ((select auth.uid()) = user_id);

create policy projects_insert_owner
on public.projects
for insert
with check ((select auth.uid()) = user_id);

create policy projects_update_owner
on public.projects
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Alert access is tenant-scoped.
create policy alerts_select_owner
on public.alerts
for select
using ((select auth.uid()) = user_id);

create policy alerts_update_owner
on public.alerts
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Anomaly rows are read-only for end users.
create policy anomalies_select_owner
on public.anomalies
for select
using ((select auth.uid()) = user_id);

-- Minute analytics are read-only for end users.
create policy analytics_minute_select_owner
on public.analytics_minute
for select
using ((select auth.uid()) = user_id);

-- Tighten grants: anon gets nothing, authenticated gets minimal app surface.
do $$
begin
  execute 'revoke all on table public.users, public.projects, public.alerts, public.anomalies, public.analytics_minute from public';

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.users, public.projects, public.alerts, public.anomalies, public.analytics_minute from anon';
    execute 'revoke all on sequence public.analytics_minute_id_seq from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select, insert, update on table public.users to authenticated';
    execute 'grant select, insert, update on table public.projects to authenticated';
    execute 'grant select, update on table public.alerts to authenticated';
    execute 'grant select on table public.anomalies to authenticated';
    execute 'grant select on table public.analytics_minute to authenticated';
    execute 'grant usage, select on sequence public.analytics_minute_id_seq to authenticated';
  end if;
end
$$;
