export type Classification = "normal" | "suspicious" | "critical";
export type AlertPriority = "low" | "medium" | "high" | "critical";
export type AlertStatus = "pending" | "resolved";
export type DashboardType = "portfolio" | "ecommerce" | "saas" | "api";
export type DashboardHealth = "healthy" | "warning" | "critical";

export const ACCESS_TOKEN_STORAGE_KEY = "lg_supabase_access_token";
export const USER_ID_STORAGE_KEY = "lg_user_id";
export const USER_EMAIL_STORAGE_KEY = "lg_user_email";
export const ACTIVE_DASHBOARD_STORAGE_KEY = "lg_active_dashboard_id";

export type LogRecord = {
  id: string;
  dashboard_id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  anomaly_score: number;
  severity: Classification;
  classification: Classification;
  explanation?: string | null;
  model_breakdown?: Record<string, number> | null;
};

export type LogIngestSummary = {
  log: LogRecord;
  alert_triggered: boolean;
};

export type LogListResponse = {
  items: LogRecord[];
  total: number;
  page: number;
  page_size: number;
};

export type BatchIngestResponse = {
  ingested: number;
  skipped: number;
  processing_ms: number;
};

export type TrendPoint = {
  day: string;
  total: number;
  critical: number;
};

export type ServiceBreakdown = {
  service: string;
  total: number;
  critical: number;
};

export type AnalyticsOverview = {
  total_logs: number;
  total_anomalies: number;
  total_critical: number;
  anomaly_rate: number;
  top_services: ServiceBreakdown[];
  trend: TrendPoint[];
};

export type DashboardSummary = {
  id: string;
  user_id: string;
  name: string;
  type: DashboardType;
  description?: string | null;
  status: DashboardHealth;
  total_logs_processed: number;
  anomalies_detected: number;
  critical_alerts: number;
  anomaly_rate: number;
  created_at: string;
  last_updated: string;
};

export type DashboardListResponse = {
  items: DashboardSummary[];
};

export type DashboardMetricsResponse = {
  dashboard_id: string;
  total_logs_processed: number;
  anomalies_detected: number;
  critical_alerts: number;
  anomaly_rate: number;
  status: DashboardHealth;
  last_updated: string;
  trend: Array<{
    bucket: string;
    total: number;
    anomalies: number;
    critical: number;
  }>;
  recent_logs: LogRecord[];
  alerts: LogRecord[];
};

export type ModelStatus = {
  trained: boolean;
  model_path: string;
  trained_at: string | null;
};

export type TrainResponse = {
  trained: boolean;
  samples_used: number;
  message: string;
};

export type AlertRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  service: string;
  classification: string;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  message: string;
  dedupe_key: string;
  group_key: string;
  occurrence_count: number;
  last_seen_at: string;
};

export type AlertListResponse = {
  items: AlertRecord[];
  total: number;
  page: number;
  page_size: number;
};

export type RealtimeEvent = {
  event: "connected" | "log_ingested" | "alert_created" | "heartbeat";
  timestamp: string;
  payload: Record<string, unknown>;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8000")
).replace(/\/$/, "");

function requireApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  throw new Error(
    "Missing NEXT_PUBLIC_API_BASE_URL in production. Set it in your Vercel project environment variables."
  );
}

function readStorageValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
}

function getActiveDashboardId(explicitDashboardId?: string) {
  return explicitDashboardId ?? readStorageValue(ACTIVE_DASHBOARD_STORAGE_KEY) ?? undefined;
}

function buildUserHeaders() {
  const userId = readStorageValue(USER_ID_STORAGE_KEY);
  const userEmail = readStorageValue(USER_EMAIL_STORAGE_KEY);
  const accessToken = readStorageValue(ACCESS_TOKEN_STORAGE_KEY);
  const headers: Record<string, string> = {};
  if (userId) {
    headers["X-User-Id"] = userId;
  }
  if (userEmail) {
    headers["X-User-Email"] = userEmail;
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function getWebSocketBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const parsed = new URL(requireApiBaseUrl());
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${parsed.host}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = requireApiBaseUrl();
  const userHeaders = buildUserHeaders();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...userHeaders,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createRealtimeSocket(dashboardId?: string) {
  const query = dashboardId ? `?dashboard_id=${encodeURIComponent(dashboardId)}` : "";
  return new WebSocket(`${getWebSocketBaseUrl()}/api/v1/stream/logs${query}`);
}

export function listDashboards() {
  return apiFetch<DashboardListResponse>("/api/v1/dashboards");
}

export function createDashboard(payload: {
  name: string;
  type: DashboardType;
  description?: string;
}) {
  return apiFetch<DashboardSummary>("/api/v1/dashboards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getDashboardMetrics(
  dashboardId: string,
  params?: {
    severity?: Classification | "";
    startTime?: string;
    endTime?: string;
  }
) {
  const query = new URLSearchParams();
  if (params?.severity) query.set("severity", params.severity);
  if (params?.startTime) query.set("start_time", params.startTime);
  if (params?.endTime) query.set("end_time", params.endTime);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return apiFetch<DashboardMetricsResponse>(`/api/v1/dashboards/${dashboardId}/metrics${suffix}`);
}

export function getAnalytics(days = 14, dashboardId?: string) {
  const effectiveDashboardId = getActiveDashboardId(dashboardId);
  const query = new URLSearchParams();
  query.set("days", String(days));
  if (effectiveDashboardId) {
    query.set("dashboard_id", effectiveDashboardId);
  }
  return apiFetch<AnalyticsOverview>(`/api/v1/analytics/overview?${query.toString()}`);
}

export function getLogs(params: {
  dashboardId?: string;
  page?: number;
  pageSize?: number;
  level?: string;
  service?: string;
  severity?: Classification | "";
  classification?: Classification | "";
  startTime?: string;
  endTime?: string;
}) {
  const query = new URLSearchParams();
  const effectiveDashboardId = getActiveDashboardId(params.dashboardId);
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for log queries");
  }
  query.set("dashboard_id", effectiveDashboardId);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 25));
  if (params.level) query.set("level", params.level);
  if (params.service) query.set("service", params.service);
  if (params.severity) query.set("severity", params.severity);
  if (params.classification) query.set("classification", params.classification);
  if (params.startTime) query.set("start_time", params.startTime);
  if (params.endTime) query.set("end_time", params.endTime);

  return apiFetch<LogListResponse>(`/api/v1/logs?${query.toString()}`);
}

export function ingestLog(payload: {
  dashboard_id?: string;
  service: string;
  level: string;
  message: string;
  timestamp?: string;
}) {
  const effectiveDashboardId = payload.dashboard_id ?? getActiveDashboardId();
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for ingestion");
  }

  return apiFetch<LogIngestSummary>("/api/v1/logs/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      dashboard_id: effectiveDashboardId,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    }),
  });
}

export function ingestBatch(payload: {
  logs: Array<{
    dashboard_id?: string;
    service: string;
    level: string;
    message: string;
    timestamp?: string;
  }>;
}) {
  const effectiveDashboardId = getActiveDashboardId();
  const preparedLogs = payload.logs.map((log) => ({
    ...log,
    dashboard_id: log.dashboard_id ?? effectiveDashboardId,
    timestamp: log.timestamp ?? new Date().toISOString(),
  }));

  if (!preparedLogs.length || !preparedLogs[0].dashboard_id) {
    throw new Error("dashboard_id is required for batch ingestion");
  }

  return apiFetch<BatchIngestResponse>("/api/v1/logs/ingest/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ logs: preparedLogs }),
  });
}

export function uploadLogFile(file: File, dashboardId?: string) {
  const effectiveDashboardId = getActiveDashboardId(dashboardId);
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for file uploads");
  }

  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<{ ingested: number; skipped: number; trained: boolean }>(
    `/api/v1/logs/upload?train_model=true&dashboard_id=${encodeURIComponent(effectiveDashboardId)}`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export function getModelStatus() {
  return apiFetch<ModelStatus>("/api/v1/model/status");
}

export function trainModel(dashboardId?: string) {
  const effectiveDashboardId = getActiveDashboardId(dashboardId);
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for model training");
  }

  return apiFetch<TrainResponse>(`/api/v1/model/train?dashboard_id=${encodeURIComponent(effectiveDashboardId)}`, {
    method: "POST",
  });
}

export function getAlerts(params: {
  dashboardId?: string;
  page?: number;
  pageSize?: number;
  status?: AlertStatus | "";
  priority?: AlertPriority | "";
  service?: string;
}) {
  const query = new URLSearchParams();
  const effectiveDashboardId = getActiveDashboardId(params.dashboardId);
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for alert queries");
  }
  query.set("dashboard_id", effectiveDashboardId);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 25));
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.service) query.set("service", params.service);

  return apiFetch<AlertListResponse>(`/api/v1/alerts?${query.toString()}`);
}

export function resolveAlert(alertId: string, resolvedBy = "operator", dashboardId?: string) {
  const effectiveDashboardId = getActiveDashboardId(dashboardId);
  if (!effectiveDashboardId) {
    throw new Error("dashboard_id is required for alert actions");
  }

  return apiFetch<{ success: boolean; alert: AlertRecord | null }>(
    `/api/v1/alerts/${alertId}/resolve?dashboard_id=${encodeURIComponent(effectiveDashboardId)}`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resolved_by: resolvedBy }),
    }
  );
}
