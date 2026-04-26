"use client";

import Link from "next/link";
import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  RefreshCcw,
  Server,
  Upload,
  X,
} from "lucide-react";

import { ErrorTrendChart } from "@/components/dashboard/error-trend-chart";
import { ServiceActivityChart } from "@/components/dashboard/service-activity-chart";
import { Button } from "@/components/ui/button";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import {
  ACTIVE_DASHBOARD_STORAGE_KEY,
  type Classification,
  type DashboardMetricsResponse,
  type LogRecord,
  type RealtimeEvent,
  createRealtimeSocket,
  getDashboardMetrics,
  ingestBatch,
  listDashboards,
  uploadLogFile,
} from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";

type DashboardProjectDetailAppProps = {
  dashboardId: string;
};

const rangeOptions = [
  { value: "1h", label: "Last 1 hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
] as const;

const severityOptions: Array<CustomSelectOption<"" | Classification>> = [
  { value: "", label: "All", dotClassName: "bg-muted-foreground" },
  { value: "normal", label: "Normal", dotClassName: "bg-[#3ecf8e]" },
  { value: "suspicious", label: "Suspicious", dotClassName: "bg-[#f59e0b]" },
  { value: "critical", label: "Critical", dotClassName: "bg-[#ff4d4f]" },
];

const ingestLevelOptions = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"] as const;
const uploadTabs = ["paste", "file"] as const;

type UploadTab = (typeof uploadTabs)[number];

type ParsedPasteLog = {
  message: string;
  service: string;
  level: string;
  timestamp?: string;
};

const mockTrendData = [
  { day: "04-20", total: 4, critical: 0, anomalies: 1 },
  { day: "04-21", total: 6, critical: 1, anomalies: 2 },
  { day: "04-22", total: 5, critical: 1, anomalies: 2 },
  { day: "04-23", total: 8, critical: 2, anomalies: 3 },
  { day: "04-24", total: 9, critical: 1, anomalies: 3 },
  { day: "04-25", total: 7, critical: 1, anomalies: 2 },
  { day: "04-26", total: 10, critical: 2, anomalies: 4 },
];

const mockServiceData = [
  { service: "api", total: 18, critical: 3 },
  { service: "db", total: 12, critical: 2 },
  { service: "queue", total: 9, critical: 1 },
  { service: "auth", total: 8, critical: 1 },
];

function normalizeLevel(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "WARNING") return "WARN";
  if (normalized === "ERR") return "ERROR";
  if (normalized === "CRIT") return "CRITICAL";
  return normalized || "INFO";
}

function toClassification(level: string): Classification {
  const normalized = normalizeLevel(level);
  if (normalized === "WARN") return "suspicious";
  if (normalized === "ERROR" || normalized === "CRITICAL") return "critical";
  return "normal";
}

function parseRealtimeLog(payload: unknown): LogRecord | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.id !== "string") return null;

  return {
    id: candidate.id,
    dashboard_id: String(candidate.dashboard_id ?? ""),
    timestamp: String(candidate.timestamp ?? new Date().toISOString()),
    service: String(candidate.service ?? "unknown"),
    level: String(candidate.level ?? "INFO"),
    message: String(candidate.message ?? ""),
    anomaly_score: Number(candidate.anomaly_score ?? 0),
    severity: (candidate.severity as Classification) ?? toClassification(String(candidate.level ?? "INFO")),
    classification:
      (candidate.classification as Classification) ?? toClassification(String(candidate.level ?? "INFO")),
    explanation: candidate.explanation ? String(candidate.explanation) : undefined,
    model_breakdown:
      candidate.model_breakdown && typeof candidate.model_breakdown === "object"
        ? (candidate.model_breakdown as Record<string, number>)
        : undefined,
  };
}

function parsePastedLogs(rawInput: string, fallbackService: string, fallbackLevel: string): ParsedPasteLog[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

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
    if (!message) return;

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
        if (!item || typeof item !== "object") continue;
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

      if (entries.length > 0) return entries;
    } catch {
      // fall through to line parsing
    }
  }

  for (const line of trimmed.split(/\r?\n/)) {
    const message = line.trim();
    if (!message) continue;
    entries.push({ message, service: defaultService, level: defaultLevel });
  }

  return entries;
}

function statusChip(status: DashboardMetricsResponse["status"]) {
  if (status === "critical") return "bg-red-500/15 text-red-600 dark:text-red-300";
  if (status === "warning") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

function getStartTime(range: (typeof rangeOptions)[number]["value"]) {
  const now = Date.now();
  if (range === "1h") return new Date(now - 60 * 60 * 1000).toISOString();
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function logMatchesFilter(log: LogRecord, severity: "" | Classification, range: (typeof rangeOptions)[number]["value"]) {
  const start = Date.parse(getStartTime(range));
  const ts = Date.parse(log.timestamp);
  const inRange = Number.isNaN(ts) || ts >= start;
  const severityMatch = !severity || log.severity === severity;
  return inRange && severityMatch;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DashboardProjectDetailApp({ dashboardId }: DashboardProjectDetailAppProps) {
  const [dashboardTitle, setDashboardTitle] = useState("Dashboard Workspace");
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [range, setRange] = useState<(typeof rangeOptions)[number]["value"]>("24h");
  const [severity, setSeverity] = useState<"" | Classification>("");
  const [loading, setLoading] = useState(true);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<UploadTab>("paste");
  const [pasteLogs, setPasteLogs] = useState("");
  const [pasteService, setPasteService] = useState("unknown");
  const [pasteLevel, setPasteLevel] = useState<(typeof ingestLevelOptions)[number]>("INFO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const { showToast } = useToast();

  const loadDashboardTitle = useCallback(async () => {
    try {
      await resolveAndStoreUserContext();
      const response = await listDashboards();
      const current = response.items.find((item) => item.id === dashboardId);
      setDashboardTitle(current?.name?.trim() || "Dashboard Workspace");
    } catch {
      setDashboardTitle("Dashboard Workspace");
    }
  }, [dashboardId]);

  const refreshMetrics = useCallback(async () => {
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
        showToast({ type: "error", title: "Please sign in before opening dashboard analytics" });
      } else {
        showToast({ type: "error", title: "Unable to load dashboard metrics", description: message });
      }
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, range, severity, showToast]);

  useEffect(() => {
    void refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    void loadDashboardTitle();
  }, [loadDashboardTitle]);

  useEffect(() => {
    const socket = createRealtimeSocket(dashboardId);
    let heartbeat: number | undefined;

    socket.onopen = () => {
      heartbeat = window.setInterval(() => socket.send("ping"), 16000);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        const payloadDashboardId = String(parsed.payload?.dashboard_id ?? "");
        if (payloadDashboardId && payloadDashboardId !== dashboardId) return;

        if (parsed.event === "log_ingested") {
          const incomingLog = parseRealtimeLog(parsed.payload?.log);
          if (incomingLog && logMatchesFilter(incomingLog, severity, range)) {
            setMetrics((previous) => {
              if (!previous) return previous;
              const isAnomaly = incomingLog.severity === "suspicious" || incomingLog.severity === "critical";
              const nextTotal = previous.total_logs_processed + 1;
              const nextAnomalies = previous.anomalies_detected + (isAnomaly ? 1 : 0);
              const nextCritical = previous.critical_alerts + (incomingLog.severity === "critical" ? 1 : 0);
              const nextRate = nextTotal > 0 ? (nextAnomalies / nextTotal) * 100 : 0;
              const nextAlerts =
                incomingLog.severity === "normal"
                  ? previous.alerts
                  : [incomingLog, ...previous.alerts.filter((item) => item.id !== incomingLog.id)].slice(0, 12);

              return {
                ...previous,
                total_logs_processed: nextTotal,
                anomalies_detected: nextAnomalies,
                critical_alerts: nextCritical,
                anomaly_rate: nextRate,
                last_updated: incomingLog.timestamp,
                recent_logs: [incomingLog, ...previous.recent_logs.filter((item) => item.id !== incomingLog.id)].slice(
                  0,
                  50
                ),
                alerts: nextAlerts,
              };
            });
          } else if (parsed.payload?.batch) {
            void refreshMetrics();
          }
        }

        if (parsed.event === "alert_created") {
          const alertLog = parseRealtimeLog(parsed.payload?.alert);
          if (alertLog && logMatchesFilter(alertLog, severity, range)) {
            setMetrics((previous) => {
              if (!previous) return previous;
              return {
                ...previous,
                alerts: [alertLog, ...previous.alerts.filter((item) => item.id !== alertLog.id)].slice(0, 12),
              };
            });
          }
        }
      } catch {
        // ignore malformed realtime events
      }
    };

    return () => {
      if (heartbeat) window.clearInterval(heartbeat);
      socket.close();
    };
  }, [dashboardId, range, severity, refreshMetrics]);

  const hasRealData = Boolean(metrics && metrics.total_logs_processed > 0);

  const trendData = useMemo(() => {
    if (!hasRealData || !metrics) {
      return mockTrendData.map((point) => ({ day: point.day, total: point.total, critical: point.critical }));
    }
    return metrics.trend.map((point) => ({
      day: new Date(point.bucket).toISOString().slice(0, 10),
      total: point.total,
      critical: point.critical,
    }));
  }, [hasRealData, metrics]);

  const anomalyTimeline = useMemo(() => {
    if (!hasRealData || !metrics) {
      return mockTrendData.map((point) => ({ day: point.day, anomalies: point.anomalies }));
    }
    return metrics.trend.map((point) => ({
      day: new Date(point.bucket).toISOString().slice(5, 10),
      anomalies: point.anomalies,
    }));
  }, [hasRealData, metrics]);

  const serviceData = useMemo(() => {
    if (!hasRealData || !metrics) {
      return mockServiceData;
    }

    const rollup = new Map<string, { total: number; critical: number }>();
    for (const log of metrics.recent_logs) {
      const service = log.service?.trim() || "unknown";
      const current = rollup.get(service) ?? { total: 0, critical: 0 };
      current.total += 1;
      if (log.severity === "critical") current.critical += 1;
      rollup.set(service, current);
    }

    const values = Array.from(rollup.entries())
      .map(([service, value]) => ({ service, total: value.total, critical: value.critical }))
      .sort((a, b) => b.total - a.total);

    return values.length ? values : mockServiceData;
  }, [hasRealData, metrics]);

  const pasteLineCount = useMemo(() => {
    if (!pasteLogs.trim()) return 0;
    return pasteLogs.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }, [pasteLogs]);

  const totalLogs = metrics?.total_logs_processed ?? 0;
  const totalAnomalies = metrics?.anomalies_detected ?? 0;
  const totalCritical = metrics?.critical_alerts ?? 0;

  async function handlePasteIngest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const logs = parsePastedLogs(pasteLogs, pasteService, pasteLevel);
    if (!logs.length) {
      showToast({ type: "error", title: "Paste at least one valid log line or JSON object" });
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
      setActiveUploadTab("paste");
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
      showToast({ type: "error", title: "Please choose a CSV, JSON, or TXT file first" });
      return;
    }

    setIsUploading(true);
    try {
      await resolveAndStoreUserContext();
      const result = await uploadLogFile(uploadFile, dashboardId);
      setUploadFile(null);
      setUploadInputKey((previous) => previous + 1);
      showToast({
        type: "success",
        title: "Upload complete",
        description: `${result.ingested} logs inserted, model trained: ${result.trained}.`,
      });
      setIsUploadDialogOpen(false);
      void refreshMetrics();
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

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (droppedFile) setUploadFile(droppedFile);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1320px] items-center px-5 py-3 sm:px-8 lg:px-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#3ecf8e]" aria-hidden="true" />
            <span className="font-mono text-xs font-medium tracking-wide text-foreground">LogGuardian</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-5 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-[12px] border border-border bg-card p-6 shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Dashboard Workspace</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{dashboardTitle}</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Strictly isolated analytics scope. Queries are locked to this dashboard only.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="relative w-44">
                <CustomSelect
                  label="Time range"
                  value={range}
                  options={rangeOptions.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(value) => setRange(value)}
                />
              </div>

              <div className="relative w-40">
                <CustomSelect
                  label="Severity"
                  value={severity}
                  options={severityOptions}
                  onChange={(value) => setSeverity(value)}
                />
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => void refreshMetrics()}
                className="h-10 gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsUploadDialogOpen(true)}
                className="h-10 gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload Logs
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Total Logs</p>
              <p className="mt-2 text-xl font-semibold">{totalLogs}</p>
            </article>
            <article className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Anomalies</p>
              <p className="mt-2 text-xl font-semibold">{totalAnomalies}</p>
            </article>
            <article className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Critical Alerts</p>
              <p className="mt-2 text-xl font-semibold">{totalCritical}</p>
            </article>
            <article className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(metrics?.status ?? "healthy")}`}>
                  {metrics?.status ?? "healthy"}
                </span>
                <span className="text-sm font-semibold">{(metrics?.anomaly_rate ?? 0).toFixed(2)}%</span>
              </div>
            </article>
          </div>
        </section>

        <Dialog
          open={isUploadDialogOpen}
          onOpenChange={(open) => {
            setIsUploadDialogOpen(open);
            if (!open) {
              setIsDragActive(false);
              setActiveUploadTab("paste");
            }
          }}
        >
          <DialogContent size="lg" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ingest Logs</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Stream logs directly into this dashboard for real-time anomaly detection.
              </p>
            </DialogHeader>

            <div className="mt-1 rounded-xl border border-border bg-muted/20 p-1">
              <div className="grid grid-cols-2 gap-1">
                {uploadTabs.map((tab) => {
                  const active = activeUploadTab === tab;
                  const label = tab === "paste" ? "Paste Logs" : "Upload File";
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveUploadTab(tab)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-[#3ecf8e] text-[#0a0a0a]"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.div
              key={activeUploadTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {activeUploadTab === "paste" ? (
                <form className="space-y-4" onSubmit={handlePasteIngest}>
                  <label className="block text-sm">
                    <span className="mb-2 block text-muted-foreground">Logs</span>
                    <div className="relative">
                      <span className="absolute right-2.5 top-2 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
                        {pasteLogs.length} chars • {pasteLineCount} lines
                      </span>
                      <textarea
                        className="min-h-[180px] w-full rounded-xl border border-border bg-[var(--card)] px-3 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                        value={pasteLogs}
                        onChange={(event) => setPasteLogs(event.target.value)}
                        placeholder={`Payment gateway timeout\nAuth token validation failed\n\nJSON example:\n[{"message":"db lock wait timeout","level":"ERROR","service":"db"}]`}
                      />
                    </div>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-2 block text-muted-foreground">Fallback Service</span>
                      <input
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                        value={pasteService}
                        onChange={(event) => setPasteService(event.target.value)}
                        placeholder="unknown"
                      />
                    </label>

                    <div className="text-sm">
                      <span className="mb-2 block text-muted-foreground">Fallback Level</span>
                      <div className="flex flex-wrap gap-1">
                        {ingestLevelOptions.map((option) => {
                          const active = option === pasteLevel;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setPasteLevel(option)}
                              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                active
                                  ? "bg-[#3ecf8e] text-[#0a0a0a]"
                                  : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isIngesting}
                    className="h-10 w-full gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
                  >
                    <Server className="h-4 w-4" aria-hidden="true" />
                    {isIngesting ? "Ingesting..." : "Ingest Logs"}
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleUpload}>
                  <label
                    htmlFor="dashboard-upload-input"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                      isDragActive
                        ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                        : "border-border bg-background hover:bg-muted/30"
                    }`}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium">Drag and drop or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">Supported formats: CSV, JSON, TXT</p>
                    <input
                      id="dashboard-upload-input"
                      key={uploadInputKey}
                      className="hidden"
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  {uploadFile ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#3ecf8e]" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium">{uploadFile.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadInputKey((previous) => previous + 1);
                        }}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUploading}
                    className="h-10 w-full gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
                  >
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    {isUploading ? "Uploading..." : "Upload & Process"}
                  </Button>
                </form>
              )}
            </motion.div>

            <DialogFooter className="justify-start">
              <DialogClose asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 rounded-lg bg-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border border-border bg-card p-6 shadow-none"
          >
            <h2 className="text-xl font-semibold">Service Activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Service-level load and critical distribution from dashboard logs</p>
            <div className="mt-4">
              <ServiceActivityChart services={serviceData} />
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border border-border bg-card p-6 shadow-none"
          >
            <h2 className="text-xl font-semibold">Error Trend</h2>
            <p className="mt-1 text-sm text-muted-foreground">Critical trajectory for this dashboard</p>
            <div className="mt-4">
              <ErrorTrendChart trend={trendData} />
            </div>
          </motion.article>
        </section>

        <section className="mt-6">
          <article className="rounded-[12px] border border-border bg-card p-6 shadow-none">
            <h2 className="text-xl font-semibold">Anomaly Timeline</h2>
            <p className="mt-1 text-sm text-muted-foreground">Anomaly density evolution in the selected time window.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {anomalyTimeline.slice(-8).map((point) => (
                <div key={point.day} className="rounded-xl border border-border px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.13em] text-muted-foreground">{point.day}</p>
                  <p className="mt-1 text-lg font-semibold">{point.anomalies}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[12px] border border-border bg-card p-6 shadow-none">
            <h2 className="text-xl font-semibold">Alerts Panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Critical and suspicious events from this dashboard</p>

            <div className="mt-4 max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {(metrics?.alerts ?? []).slice(0, 12).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-border p-3">
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
                  <p className="mt-2 text-xs text-muted-foreground">{alert.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}

              {!loading && (metrics?.alerts.length ?? 0) === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No alerts in the selected filter/time scope.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-[12px] border border-border bg-card p-6 shadow-none">
            <h2 className="text-xl font-semibold">Recent Logs (Last 50)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aggregated preview only, never raw log storage</p>

            <div className="mt-4 max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {(metrics?.recent_logs ?? []).map((log) => (
                <div key={log.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{log.service}</p>
                    <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{log.message}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="rounded-full border border-border px-2 py-1">{log.level}</span>
                    <span className="text-muted-foreground">Score: {log.anomaly_score.toFixed(3)}</span>
                  </div>
                </div>
              ))}

              {!loading && (metrics?.recent_logs.length ?? 0) === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No logs in the selected filter/time scope.
                </p>
              ) : null}
            </div>
          </article>
        </section>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-border bg-card px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Loading dashboard metrics...
          </div>
        ) : null}

        {!loading && !hasRealData ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Showing baseline visualization until live logs arrive.
          </div>
        ) : null}
      </main>
    </div>
  );
}
