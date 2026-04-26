"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock3, FileUp, RefreshCcw, Server } from "lucide-react";
import { ErrorTrendChart } from "@/components/dashboard/error-trend-chart";
import { ServiceActivityChart } from "@/components/dashboard/service-activity-chart";

import {
  ACTIVE_DASHBOARD_STORAGE_KEY,
  type Classification,
  type DashboardMetricsResponse,
  getDashboardMetrics,
  ingestBatch,
  listDashboards,
  uploadLogFile,
} from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActionButton,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";

type DashboardProjectDetailAppProps = {
  dashboardId: string;
};

const rangeOptions = [
  { value: "1h", label: "Last 1 hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
] as const;

const ingestLevelOptions = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"] as const;

type ParsedPasteLog = {
  message: string;
  service: string;
  level: string;
  timestamp?: string;
};

function normalizeLevel(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "WARNING") {
    return "WARN";
  }
  if (normalized === "ERR") {
    return "ERROR";
  }
  if (normalized === "CRIT") {
    return "CRITICAL";
  }
  return normalized || "INFO";
}

function parsePastedLogs(rawInput: string, fallbackService: string, fallbackLevel: string): ParsedPasteLog[] {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return [];
  }

  const defaultService = fallbackService.trim() || "unknown";
  const defaultLevel = normalizeLevel(fallbackLevel);
  const entries: ParsedPasteLog[] = [];

  const push = (candidate: {
    message?: unknown;
    service?: unknown;
    source?: unknown;
    level?: unknown;
    severity?: unknown;
    timestamp?: unknown;
    time?: unknown;
  }) => {
    const message = String(candidate.message ?? "").trim();
    if (!message) {
      return;
    }

    const timestampValue = candidate.timestamp ?? candidate.time;
    entries.push({
      message,
      service: String(candidate.service ?? candidate.source ?? defaultService).trim() || defaultService,
      level: normalizeLevel(String(candidate.level ?? candidate.severity ?? defaultLevel)),
      timestamp: typeof timestampValue === "string" && timestampValue.trim() ? timestampValue.trim() : undefined,
    });
  };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const items = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { logs?: unknown }).logs)
          ? ((parsed as { logs: unknown[] }).logs as unknown[])
          : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const log = item as Record<string, unknown>;
        push({
          message: log.message ?? log.log ?? log.text,
          service: log.service,
          source: log.source,
          level: log.level,
          severity: log.severity,
          timestamp: log.timestamp,
          time: log.time,
        });
      }

      if (entries.length > 0) {
        return entries;
      }
    } catch {
      // Fall back to line-by-line parsing.
    }
  }

  for (const line of trimmed.split(/\r?\n/)) {
    const message = line.trim();
    if (!message) {
      continue;
    }
    entries.push({
      message,
      service: defaultService,
      level: defaultLevel,
    });
  }

  return entries;
}

function statusChip(status: DashboardMetricsResponse["status"]) {
  if (status === "critical") {
    return "bg-red-500/15 text-red-600 dark:text-red-300";
  }
  if (status === "warning") {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

function getStartTime(range: (typeof rangeOptions)[number]["value"]) {
  const now = Date.now();
  if (range === "1h") {
    return new Date(now - 60 * 60 * 1000).toISOString();
  }
  if (range === "24h") {
    return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function DashboardProjectDetailApp({ dashboardId }: DashboardProjectDetailAppProps) {
  const [dashboardTitle, setDashboardTitle] = useState("Dashboard");
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [range, setRange] = useState<(typeof rangeOptions)[number]["value"]>("24h");
  const [severity, setSeverity] = useState<"" | Classification>("");
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [pasteLogs, setPasteLogs] = useState("");
  const [pasteService, setPasteService] = useState("unknown");
  const [pasteLevel, setPasteLevel] = useState<(typeof ingestLevelOptions)[number]>("INFO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  async function loadDashboardTitle() {
    try {
      await resolveAndStoreUserContext();
      const response = await listDashboards();
      const current = response.items.find((dashboard) => dashboard.id === dashboardId);
      setDashboardTitle(current?.name?.trim() || "Dashboard Workspace");
    } catch {
      setDashboardTitle("Dashboard Workspace");
    }
  }

  async function refreshMetrics() {
    setLoading(true);

    try {
      await resolveAndStoreUserContext();

      window.localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, dashboardId);

      const response = await getDashboardMetrics(dashboardId, {
        severity,
        startTime: getStartTime(range),
      });
      setMetrics(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboard metrics";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        showToast({
          type: "error",
          title: "Please sign in before opening dashboard analytics",
        });
      } else {
        showToast({
          type: "error",
          title: "Unable to load dashboard metrics",
          description: message,
        });
      }
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMetrics();
  }, [dashboardId, range, severity]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshMetrics();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [dashboardId, range, severity]);

  useEffect(() => {
    void loadDashboardTitle();
  }, [dashboardId]);

  const trendData = useMemo(() => {
    return (metrics?.trend ?? []).map((point) => ({
      day: new Date(point.bucket).toISOString().slice(0, 10),
      total: point.total,
      critical: point.critical,
    }));
  }, [metrics]);

  const serviceData = useMemo(() => {
    const rollup = new Map<string, { total: number; critical: number }>();

    for (const log of metrics?.recent_logs ?? []) {
      const service = log.service?.trim() || "unknown";
      const current = rollup.get(service) ?? { total: 0, critical: 0 };
      current.total += 1;
      if (log.severity === "critical") {
        current.critical += 1;
      }
      rollup.set(service, current);
    }

    return Array.from(rollup.entries())
      .map(([service, values]) => ({
        service,
        total: values.total,
        critical: values.critical,
      }))
      .sort((a, b) => b.total - a.total);
  }, [metrics]);

  async function handlePasteIngest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const logs = parsePastedLogs(pasteLogs, pasteService, pasteLevel);
    if (!logs.length) {
      showToast({
        type: "error",
        title: "Paste at least one valid log line or JSON object",
      });
      return;
    }

    setIsIngesting(true);

    try {
      await resolveAndStoreUserContext();

      const result = await ingestBatch({
        logs: logs.map((log) => ({
          dashboard_id: dashboardId,
          service: log.service,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
        })),
      });

      setPasteLogs("");
      await refreshMetrics();
      showToast({
        type: "success",
        title: "Pasted logs ingested",
        description: `${result.ingested} logs inserted.`,
      });
      setIsUploadDialogOpen(false);
    } catch (error) {
      showToast({
        type: "error",
        title: "Unable to ingest pasted logs",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadFile) {
      showToast({
        type: "error",
        title: "Please choose a CSV, JSON, or TXT file first",
      });
      return;
    }

    setIsUploading(true);

    try {
      await resolveAndStoreUserContext();
      const result = await uploadLogFile(uploadFile, dashboardId);
      setUploadFile(null);
      setUploadInputKey((previous) => previous + 1);
      await refreshMetrics();
      showToast({
        type: "success",
        title: "Upload complete",
        description: `${result.ingested} logs inserted, model trained: ${result.trained}.`,
      });
      setIsUploadDialogOpen(false);
    } catch (error) {
      showToast({
        type: "error",
        title: "Unable to upload logs",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <section className="bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="lg-kicker">Dashboard Workspace</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{dashboardTitle}</h1>
              <p className="lg-subtle mt-3 text-sm">
                Strictly isolated analytics scope. Queries are locked to this dashboard only.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Time range</span>
                <select className="lg-input h-10 w-40" value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
                  {rangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Severity</span>
                <select
                  className="lg-input h-10 w-36"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as "" | Classification)}
                >
                  <option value="">All</option>
                  <option value="normal">Normal</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <Button type="button" variant="secondary" size="sm" onClick={() => void refreshMetrics()}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>

              <Button type="button" variant="default" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload Logs
              </Button>
            </div>
          </div>

          {metrics ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl border border-(--border) p-3">
                <p className="text-xs uppercase tracking-[0.13em] lg-subtle">Total Logs</p>
                <p className="mt-2 text-xl font-semibold">{metrics.total_logs_processed}</p>
              </article>
              <article className="rounded-xl border border-(--border) p-3">
                <p className="text-xs uppercase tracking-[0.13em] lg-subtle">Anomalies</p>
                <p className="mt-2 text-xl font-semibold">{metrics.anomalies_detected}</p>
              </article>
              <article className="rounded-xl border border-(--border) p-3">
                <p className="text-xs uppercase tracking-[0.13em] lg-subtle">Critical Alerts</p>
                <p className="mt-2 text-xl font-semibold">{metrics.critical_alerts}</p>
              </article>
              <article className="rounded-xl border border-(--border) p-3">
                <p className="text-xs uppercase tracking-[0.13em] lg-subtle">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(metrics.status)}`}>
                    {metrics.status}
                  </span>
                  <span className="text-sm font-semibold">{metrics.anomaly_rate.toFixed(2)}%</span>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Upload Logs</DialogTitle>
              <DialogDescription>
                Paste plain logs or upload CSV, JSON, and TXT files to ingest directly into this dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-(--border) p-4">
                <h2 className="text-base font-semibold">Paste Logs</h2>
                <p className="lg-subtle mt-1 text-sm">Paste lines or JSON payloads for quick ingestion.</p>

                <form className="mt-4 space-y-3" onSubmit={handlePasteIngest}>
                  <label className="text-sm">
                    <span className="mb-1 block lg-subtle">Logs</span>
                    <textarea
                      className="lg-input min-h-40"
                      value={pasteLogs}
                      onChange={(event) => setPasteLogs(event.target.value)}
                      placeholder={`Payment gateway timeout\nAuth token validation failed\nOR JSON: [{"message":"db lock wait timeout","level":"ERROR","service":"db"}]`}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block lg-subtle">Fallback Service</span>
                      <input
                        className="lg-input h-10"
                        value={pasteService}
                        onChange={(event) => setPasteService(event.target.value)}
                        placeholder="unknown"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block lg-subtle">Fallback Level</span>
                      <select
                        className="lg-input h-10"
                        value={pasteLevel}
                        onChange={(event) => setPasteLevel(event.target.value as (typeof ingestLevelOptions)[number])}
                      >
                        {ingestLevelOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <Button type="submit" variant="default" size="sm" disabled={isIngesting}>
                    <Server className="h-4 w-4" aria-hidden="true" />
                    {isIngesting ? "Ingesting..." : "Ingest Pasted Logs"}
                  </Button>
                </form>
              </article>

              <article className="rounded-xl border border-(--border) p-4">
                <h2 className="text-base font-semibold">Upload Log File</h2>
                <p className="lg-subtle mt-1 text-sm">Upload CSV, JSON, or TXT and refresh analytics immediately.</p>

                <form className="mt-4 space-y-3" onSubmit={handleUpload}>
                  <label className="text-sm">
                    <span className="mb-1 block lg-subtle">File</span>
                    <input
                      key={uploadInputKey}
                      className="lg-input"
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <Button type="submit" variant="default" size="sm" disabled={isUploading}>
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    {isUploading ? "Uploading..." : "Upload and Process"}
                  </Button>
                </form>
              </article>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <DialogActionButton variant="ghost" type="button">
                  Close
                </DialogActionButton>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Service Activity</h2>
            <p className="lg-subtle mt-1 text-sm">Service-level load and critical distribution from dashboard logs</p>
            <div className="mt-4">
              <ServiceActivityChart services={serviceData} />
            </div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Error Trend</h2>
            <p className="lg-subtle mt-1 text-sm">Critical trajectory for this dashboard</p>
            <div className="mt-4">
              <ErrorTrendChart trend={trendData} />
            </div>
          </motion.article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Alerts Panel</h2>
            <p className="lg-subtle mt-1 text-sm">Critical and suspicious events from the dashboard preview store</p>

            <div className="mt-4 space-y-3">
              {(metrics?.alerts ?? []).slice(0, 12).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-(--border) p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{alert.service}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        alert.severity === "critical"
                          ? "bg-red-500/15 text-red-600 dark:text-red-300"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="lg-subtle mt-2 text-xs">{alert.message}</p>
                  <p className="lg-subtle mt-2 text-xs">
                    <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}

              {!loading && (metrics?.alerts.length ?? 0) === 0 ? (
                <p className="lg-subtle rounded-xl border border-dashed border-(--border) p-3 text-sm">
                  No alerts in the selected filter/time scope.
                </p>
              ) : null}
            </div>
          </article>

          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Recent Logs (Last 50)</h2>
            <p className="lg-subtle mt-1 text-sm">Aggregated preview only, never raw log storage</p>

            <div className="mt-4 max-h-110 space-y-2 overflow-auto pr-1">
              {(metrics?.recent_logs ?? []).map((log) => (
                <div key={log.id} className="rounded-xl border border-(--border) p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{log.service}</p>
                    <span className="text-xs lg-subtle">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="lg-subtle mt-1 text-xs">{log.message}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="rounded-full border border-(--border) px-2 py-1">{log.level}</span>
                    <span className="lg-subtle">Score: {log.anomaly_score.toFixed(3)}</span>
                  </div>
                </div>
              ))}

              {!loading && (metrics?.recent_logs.length ?? 0) === 0 ? (
                <p className="lg-subtle rounded-xl border border-dashed border-(--border) p-3 text-sm">
                  No logs in the selected filter/time scope.
                </p>
              ) : null}
            </div>
          </article>
        </section>

        {loading ? (
          <div className="mt-5 bg-card border border-border shadow-none rounded-[12px] p-6 flex items-center gap-2 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Loading dashboard metrics...
          </div>
        ) : null}
      </main>
    </div>
  );
}
