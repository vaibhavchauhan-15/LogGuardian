-- 2026041904_automate_alert_partition_retention.sql
-- Purpose:
-- 1) Keep future monthly partitions pre-created for alerts.
-- 2) Drop stale monthly partitions for retention without row-level deletes.
-- 3) Optionally schedule maintenance with pg_cron if available.

create or replace function public.ensure_alerts_partitions(p_months_ahead integer default 3)
returns integer
language plpgsql
as $$
declare
  month_start timestamptz;
  month_end timestamptz;
  i integer;
  created_count integer := 0;
  partition_name text;
begin
  execute 'create table if not exists public.alerts_default partition of public.alerts default';

  for i in 0..greatest(p_months_ahead, 0) loop
    month_start := date_trunc('month', now()) + make_interval(months => i);
    month_end := date_trunc('month', now()) + make_interval(months => i + 1);
    partition_name := 'alerts_' || to_char(month_start, 'YYYY_MM');

    execute format(
      'create table if not exists public.%I partition of public.alerts for values from (%L) to (%L)',
      partition_name,
      month_start,
      month_end
    );

    created_count := created_count + 1;
  end loop;

  return created_count;
end;
$$;

create or replace function public.drop_old_alert_partitions(p_retention_months integer default 2)
returns integer
language plpgsql
as $$
declare
  part record;
  dropped_count integer := 0;
  cutoff_month date;
  part_month date;
begin
  cutoff_month := (
    date_trunc('month', now())::date
    - make_interval(months => greatest(p_retention_months, 1))
  )::date;

  for part in
    select c.relname as partition_name
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_namespace cn on cn.oid = c.relnamespace
    join pg_class p on p.oid = i.inhparent
    join pg_namespace pn on pn.oid = p.relnamespace
    where pn.nspname = 'public'
      and p.relname = 'alerts'
      and cn.nspname = 'public'
      and c.relname ~ '^alerts_[0-9]{4}_[0-9]{2}$'
  loop
    part_month := to_date(substring(part.partition_name from 8 for 7), 'YYYY_MM');

    if part_month < cutoff_month then
      execute format('drop table if exists public.%I', part.partition_name);
      dropped_count := dropped_count + 1;
    end if;
  end loop;

  return dropped_count;
end;
$$;

create or replace function public.maintain_alert_partitions(
  p_months_ahead integer default 3,
  p_retention_months integer default 2
)
returns jsonb
language plpgsql
as $$
declare
  ensured integer := 0;
  dropped integer := 0;
begin
  ensured := public.ensure_alerts_partitions(p_months_ahead);
  dropped := public.drop_old_alert_partitions(p_retention_months);

  return jsonb_build_object(
    'ensured_partitions', ensured,
    'dropped_partitions', dropped,
    'months_ahead', greatest(p_months_ahead, 0),
    'retention_months', greatest(p_retention_months, 1),
    'executed_at', now()
  );
end;
$$;

-- Schedule hourly maintenance if pg_cron is available and no job exists yet.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if not exists (
      select 1
      from cron.job
      where jobname = 'logguardian_alert_partition_maintenance'
    ) then
      perform cron.schedule(
        'logguardian_alert_partition_maintenance',
        '17 * * * *',
        $cron$select public.maintain_alert_partitions(3, 2);$cron$
      );
    end if;
  end if;
end
$$;

-- Run once immediately after migration to establish baseline partitions.
select public.maintain_alert_partitions(3, 2);
