-- Performance checks for signal-only schema.
-- IMPORTANT: Select and run one EXPLAIN statement at a time in Supabase SQL Editor.
-- Replace UUID placeholders before running.

-- 1) idx_users_email_lower_unique
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM public.users
WHERE lower(email) = lower('user@example.com');

-- 2) idx_projects_api_key_hash_unique
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, user_id, name
FROM public.projects
WHERE api_key_hash = encode(digest('replace-with-real-api-key', 'sha256'), 'hex');

-- 3) idx_projects_user_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, created_at
FROM public.projects
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 50;

-- 4) idx_alerts_user_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, severity, status, created_at
FROM public.alerts
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 100;

-- 5) idx_alerts_status
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, user_id, created_at
FROM public.alerts
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 100;

-- 6) idx_alerts_dedupe_active (partial composite index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, occurrence_count, last_seen_at
FROM public.alerts
WHERE dedupe_key = 'replace-dedupe-key'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- 7) idx_alerts_user_status_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, severity, created_at
FROM public.alerts
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND status = 'resolved'
ORDER BY created_at DESC
LIMIT 100;

-- 8) idx_anomalies_user_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, service, anomaly_score, created_at
FROM public.anomalies
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 100;

-- 9) idx_anomalies_service_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, user_id, anomaly_score, created_at
FROM public.anomalies
WHERE service = 'api'
ORDER BY created_at DESC
LIMIT 100;

-- 10) idx_analytics_minute_user_bucket_desc
EXPLAIN (ANALYZE, BUFFERS)
SELECT minute_bucket, total_logs, error_count, warning_count, anomaly_count
FROM public.analytics_minute
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY minute_bucket DESC
LIMIT 120;

-- 11) idx_analytics_minute_user_project_service_bucket (expression unique index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, total_logs, anomaly_count
FROM public.analytics_minute
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  AND service = 'api'
  AND minute_bucket = date_trunc('minute', now());

-- 12) idx_alerts_project_user_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, severity, status, created_at
FROM public.alerts
WHERE project_id = '00000000-0000-0000-0000-000000000002'::uuid
  AND user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 100;

-- 13) idx_anomalies_project_user_created
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, service, anomaly_score, created_at
FROM public.anomalies
WHERE project_id = '00000000-0000-0000-0000-000000000002'::uuid
  AND user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 100;

-- 14) idx_analytics_minute_project_user_bucket_desc
EXPLAIN (ANALYZE, BUFFERS)
SELECT minute_bucket, total_logs, anomaly_count
FROM public.analytics_minute
WHERE project_id = '00000000-0000-0000-0000-000000000002'::uuid
  AND user_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY minute_bucket DESC
LIMIT 120;
