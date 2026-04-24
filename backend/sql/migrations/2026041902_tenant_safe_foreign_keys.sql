-- 2026041902_tenant_safe_foreign_keys.sql
-- Purpose:
-- 1) Enforce project ownership at the FK layer (tenant-safe references).
-- 2) Add supporting indexes for project-scoped query paths and FK checks.

create unique index if not exists idx_projects_id_user_unique
  on public.projects (id, user_id);

create index if not exists idx_alerts_project_user_created
  on public.alerts (project_id, user_id, created_at desc);

create index if not exists idx_anomalies_project_user_created
  on public.anomalies (project_id, user_id, created_at desc);

create index if not exists idx_analytics_minute_project_user_bucket_desc
  on public.analytics_minute (project_id, user_id, minute_bucket desc);

-- Normalize legacy cross-tenant links before enabling composite FKs.
update public.alerts a
set project_id = null
where a.project_id is not null
  and not exists (
    select 1
    from public.projects p
    where p.id = a.project_id
      and p.user_id = a.user_id
  );

update public.anomalies a
set project_id = null
where a.project_id is not null
  and not exists (
    select 1
    from public.projects p
    where p.id = a.project_id
      and p.user_id = a.user_id
  );

update public.analytics_minute am
set project_id = null
where am.project_id is not null
  and not exists (
    select 1
    from public.projects p
    where p.id = am.project_id
      and p.user_id = am.user_id
  );

-- Replace single-column project FKs with composite (project_id, user_id) FKs.
alter table public.alerts drop constraint if exists alerts_project_id_fkey;
alter table public.anomalies drop constraint if exists anomalies_project_id_fkey;
alter table public.analytics_minute drop constraint if exists analytics_minute_project_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alerts_project_user_fkey'
      and conrelid = 'public.alerts'::regclass
  ) then
    alter table public.alerts
      add constraint alerts_project_user_fkey
      foreign key (project_id, user_id)
      references public.projects (id, user_id)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'anomalies_project_user_fkey'
      and conrelid = 'public.anomalies'::regclass
  ) then
    alter table public.anomalies
      add constraint anomalies_project_user_fkey
      foreign key (project_id, user_id)
      references public.projects (id, user_id)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'analytics_minute_project_user_fkey'
      and conrelid = 'public.analytics_minute'::regclass
  ) then
    alter table public.analytics_minute
      add constraint analytics_minute_project_user_fkey
      foreign key (project_id, user_id)
      references public.projects (id, user_id)
      on update cascade
      on delete restrict;
  end if;
end
$$;
