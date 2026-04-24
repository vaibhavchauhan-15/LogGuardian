-- Signal-only Supabase schema for LogGuardian.
-- Core principle: process logs, store only high-value signals.

create extension if not exists pgcrypto;

-- Cleanup of prior raw-log-centric objects.
drop materialized view if exists public.analytics_daily_service cascade;
drop table if exists public.logs cascade;
drop table if exists public.logs_cold cascade;
drop table if exists public.log_ingestion_buffer cascade;
drop table if exists public.analytics_minute cascade;
drop table if exists public.anomalies cascade;
drop table if exists public.alerts cascade;
drop table if exists public.dashboard_metrics cascade;
drop table if exists public.log_sessions cascade;
drop table if exists public.dashboards cascade;
drop table if exists public.projects cascade;
drop table if exists public.users cascade;

drop function if exists public.ensure_logs_partitions(integer);
drop function if exists public.ensure_anomalies_partitions(integer);
drop function if exists public.refresh_analytics_daily_service_blocking();
drop function if exists public.archive_logs_older_than(timestamptz, integer);
drop function if exists public.set_updated_at();
drop function if exists public.ensure_alerts_partitions(integer);
drop function if exists public.delete_old_alerts(integer);

-- 1) Users: lean and minimal.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  constraint users_email_not_blank check (length(trim(email)) > 0),
  constraint users_plan_check check (plan in ('free', 'pro', 'enterprise'))
);

-- 2) Projects / API keys for multi-tenant ingestion.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(trim(name)) > 0),
  constraint projects_api_key_not_blank check (length(trim(api_key)) > 0)
);

-- 3) Dashboards (project workspaces) for strict isolation.
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint dashboards_name_not_blank check (length(trim(name)) > 0),
  constraint dashboards_type_check check (type in ('portfolio', 'ecommerce', 'saas', 'api'))
);

-- 4) Alerts: main business table, partitioned by created_at for scale.
create table public.alerts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  service text not null,
  type text not null,
  severity text not null,
  title text not null,
  message_preview text not null,
  dedupe_key text not null,
  status text not null default 'active',
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint alerts_pk primary key (created_at, id),
  constraint alerts_type_check check (type in ('error', 'warning', 'anomaly')),
  constraint alerts_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint alerts_status_check check (status in ('active', 'resolved')),
  constraint alerts_occurrence_count_positive_check check (occurrence_count > 0),
  constraint alerts_service_len_check check (length(service) between 1 and 120),
  constraint alerts_title_len_check check (length(title) between 1 and 180),
  constraint alerts_message_preview_len_check check (length(message_preview) between 1 and 200),
  constraint alerts_dedupe_key_len_check check (length(dedupe_key) between 8 and 128)
) partition by range (created_at);

-- 5) Anomaly signals (optional but useful).
create table public.anomalies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  service text not null,
  anomaly_score double precision not null,
  classification text not null,
  message_preview text not null,
  created_at timestamptz not null default now(),
  constraint anomalies_score_range_check check (anomaly_score >= 0 and anomaly_score <= 1),
  constraint anomalies_classification_check check (classification in ('normal', 'suspicious', 'critical')),
  constraint anomalies_service_len_check check (length(service) between 1 and 120),
  constraint anomalies_message_preview_len_check check (length(message_preview) between 1 and 200)
);

-- 6) Aggregated minute metrics for legacy chart paths.
create table public.analytics_minute (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  service text not null,
  minute_bucket timestamptz not null,
  total_logs integer not null default 0,
  error_count integer not null default 0,
  warning_count integer not null default 0,
  anomaly_count integer not null default 0,
  constraint analytics_service_len_check check (length(service) between 1 and 120),
  constraint analytics_total_logs_non_negative_check check (total_logs >= 0),
  constraint analytics_error_count_non_negative_check check (error_count >= 0),
  constraint analytics_warning_count_non_negative_check check (warning_count >= 0),
  constraint analytics_anomaly_count_non_negative_check check (anomaly_count >= 0),
  constraint analytics_counts_consistency_check check (
    error_count + warning_count + anomaly_count <= total_logs
  )
);

-- 7) Log ingestion sessions (one upload/API batch = one session).
create table public.log_sessions (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  logs_count integer not null default 0,
  anomalies_found integer not null default 0,
  critical_alerts integer not null default 0,
  created_at timestamptz not null default now(),
  constraint log_sessions_logs_count_non_negative_check check (logs_count >= 0),
  constraint log_sessions_anomalies_non_negative_check check (anomalies_found >= 0),
  constraint log_sessions_critical_non_negative_check check (critical_alerts >= 0),
  constraint log_sessions_consistency_check check (critical_alerts <= anomalies_found and anomalies_found <= logs_count)
);

-- 8) Aggregated dashboard metrics only (no raw log storage).
create table public.dashboard_metrics (
  dashboard_id uuid primary key references public.dashboards(id) on delete cascade,
  total_logs_processed bigint not null default 0,
  anomalies_detected bigint not null default 0,
  critical_alerts bigint not null default 0,
  anomaly_rate numeric(7, 4) not null default 0,
  time_series_data jsonb not null default '[]'::jsonb,
  last_50_logs_preview jsonb not null default '[]'::jsonb,
  last_updated timestamptz not null default now(),
  constraint dashboard_metrics_total_logs_non_negative_check check (total_logs_processed >= 0),
  constraint dashboard_metrics_anomalies_non_negative_check check (anomalies_detected >= 0),
  constraint dashboard_metrics_critical_non_negative_check check (critical_alerts >= 0),
  constraint dashboard_metrics_anomaly_rate_range_check check (anomaly_rate >= 0 and anomaly_rate <= 100),
  constraint dashboard_metrics_consistency_check check (
    critical_alerts <= anomalies_detected and anomalies_detected <= total_logs_processed
  )
);

-- Partition maintenance for alerts.
create or replace function public.ensure_alerts_partitions(p_months_ahead integer default 2)
returns void
language plpgsql
as $$
declare
  month_start timestamptz;
  month_end timestamptz;
  i integer;
begin
  execute 'create table if not exists public.alerts_default partition of public.alerts default';

  for i in 0..greatest(p_months_ahead, 0) loop
    month_start := date_trunc('month', now()) + make_interval(months => i);
    month_end := date_trunc('month', now()) + make_interval(months => i + 1);

    execute format(
      'create table if not exists public.%I partition of public.alerts for values from (%L) to (%L)',
      'alerts_' || to_char(month_start, 'YYYY_MM'),
      month_start,
      month_end
    );
  end loop;
end;
$$;

-- Run this separately after deployment (or via scheduler/cron):
-- select public.ensure_alerts_partitions(2);

-- Retention helper (30-day default).
create or replace function public.delete_old_alerts(p_retention_days integer default 30)
returns bigint
language plpgsql
as $$
declare
  deleted_rows bigint;
begin
  delete from public.alerts
  where created_at < now() - make_interval(days => greatest(p_retention_days, 1));

  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

-- Critical indexes for scale.
create unique index idx_users_email_lower_unique
on public.users (lower(email));

create unique index idx_projects_api_key_unique
on public.projects (api_key);

create unique index idx_dashboards_user_name_unique
on public.dashboards (user_id, lower(name));

create index idx_dashboards_user_created
on public.dashboards (user_id, created_at desc);

create index idx_projects_user_created
on public.projects (user_id, created_at desc);

create index idx_alerts_user_created
on public.alerts (user_id, created_at desc);

create index idx_alerts_user_dashboard_created
on public.alerts (user_id, dashboard_id, created_at desc);

create index idx_alerts_status
on public.alerts (status, created_at desc);

create index idx_alerts_dedupe_active
on public.alerts (dedupe_key)
where status = 'active';

create index idx_alerts_user_status_created
on public.alerts (user_id, status, created_at desc);

create index idx_anomalies_user_created
on public.anomalies (user_id, created_at desc);

create index idx_anomalies_user_dashboard_created
on public.anomalies (user_id, dashboard_id, created_at desc);

create index idx_anomalies_service_created
on public.anomalies (service, created_at desc);

create unique index idx_analytics_minute_user_project_service_bucket
on public.analytics_minute (
  user_id,
  dashboard_id,
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  service,
  minute_bucket
);

create index idx_analytics_user_dashboard_bucket
on public.analytics_minute (user_id, dashboard_id, minute_bucket desc);

create index idx_log_sessions_dashboard_created
on public.log_sessions (dashboard_id, created_at desc);

create index idx_dashboard_metrics_last_updated
on public.dashboard_metrics (last_updated desc);

create index idx_analytics_minute_user_bucket_desc
on public.analytics_minute (user_id, minute_bucket desc);

-- Security baseline for Supabase exposed schema.
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.dashboards enable row level security;
alter table public.alerts enable row level security;
alter table public.anomalies enable row level security;
alter table public.analytics_minute enable row level security;
alter table public.log_sessions enable row level security;
alter table public.dashboard_metrics enable row level security;

-- Keep internal-only functions private until explicit policies are added.
revoke all on function public.ensure_alerts_partitions(integer) from public, anon, authenticated;
revoke all on function public.delete_old_alerts(integer) from public, anon, authenticated;

-- No anon/authenticated policies are added by default.
-- This keeps data private unless you intentionally grant access.
