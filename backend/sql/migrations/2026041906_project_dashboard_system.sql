-- Project-based dashboard system.
-- Adds strict dashboard isolation primitives and aggregated-only metrics storage.

begin;

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint dashboards_name_not_blank check (length(trim(name)) > 0),
  constraint dashboards_type_check check (type in ('portfolio', 'ecommerce', 'saas', 'api'))
);

create table if not exists public.log_sessions (
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

create table if not exists public.dashboard_metrics (
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

-- Backward-compatible extension for legacy alert/query paths.
alter table public.alerts
  add column if not exists dashboard_id uuid references public.dashboards(id) on delete cascade;

alter table public.anomalies
  add column if not exists dashboard_id uuid references public.dashboards(id) on delete cascade;

alter table public.analytics_minute
  add column if not exists dashboard_id uuid references public.dashboards(id) on delete cascade;

create unique index if not exists idx_dashboards_user_name_unique
on public.dashboards (user_id, lower(name));

create index if not exists idx_dashboards_user_created
on public.dashboards (user_id, created_at desc);

create index if not exists idx_log_sessions_dashboard_created
on public.log_sessions (dashboard_id, created_at desc);

create index if not exists idx_dashboard_metrics_last_updated
on public.dashboard_metrics (last_updated desc);

create index if not exists idx_alerts_user_dashboard_created
on public.alerts (user_id, dashboard_id, created_at desc);

create index if not exists idx_anomalies_user_dashboard_created
on public.anomalies (user_id, dashboard_id, created_at desc);

create index if not exists idx_analytics_user_dashboard_bucket
on public.analytics_minute (user_id, dashboard_id, minute_bucket desc);

alter table public.dashboards enable row level security;
alter table public.log_sessions enable row level security;
alter table public.dashboard_metrics enable row level security;

drop policy if exists dashboards_owner_select on public.dashboards;
create policy dashboards_owner_select
on public.dashboards
for select
using (auth.uid() = user_id);

drop policy if exists dashboards_owner_insert on public.dashboards;
create policy dashboards_owner_insert
on public.dashboards
for insert
with check (auth.uid() = user_id);

drop policy if exists dashboards_owner_update on public.dashboards;
create policy dashboards_owner_update
on public.dashboards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists dashboards_owner_delete on public.dashboards;
create policy dashboards_owner_delete
on public.dashboards
for delete
using (auth.uid() = user_id);

drop policy if exists log_sessions_owner_select on public.log_sessions;
create policy log_sessions_owner_select
on public.log_sessions
for select
using (
  exists (
    select 1
    from public.dashboards d
    where d.id = log_sessions.dashboard_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists log_sessions_owner_insert on public.log_sessions;
create policy log_sessions_owner_insert
on public.log_sessions
for insert
with check (
  exists (
    select 1
    from public.dashboards d
    where d.id = log_sessions.dashboard_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists dashboard_metrics_owner_select on public.dashboard_metrics;
create policy dashboard_metrics_owner_select
on public.dashboard_metrics
for select
using (
  exists (
    select 1
    from public.dashboards d
    where d.id = dashboard_metrics.dashboard_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists dashboard_metrics_owner_insert on public.dashboard_metrics;
create policy dashboard_metrics_owner_insert
on public.dashboard_metrics
for insert
with check (
  exists (
    select 1
    from public.dashboards d
    where d.id = dashboard_metrics.dashboard_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists dashboard_metrics_owner_update on public.dashboard_metrics;
create policy dashboard_metrics_owner_update
on public.dashboard_metrics
for update
using (
  exists (
    select 1
    from public.dashboards d
    where d.id = dashboard_metrics.dashboard_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dashboards d
    where d.id = dashboard_metrics.dashboard_id
      and d.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.dashboards to authenticated;
grant select, insert on public.log_sessions to authenticated;
grant select, insert, update on public.dashboard_metrics to authenticated;

commit;