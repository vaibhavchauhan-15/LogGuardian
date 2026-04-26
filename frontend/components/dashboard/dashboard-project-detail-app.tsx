"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, FileUp, RefreshCcw, Server, Upload, X } from "lucide-react";
import { ErrorTrendChart } from "@/components/dashboard/error-trend-chart";
import { ServiceActivityChart } from "@/components/dashboard/service-activity-chart";
import { AnomalyTimelineChart } from "@/components/dashboard/anomaly-timeline-chart";
import { LogDetailModal } from "@/components/dashboard/log-detail-modal";
import { StatCardSkeleton, ChartSkeleton, AlertSkeleton, LogRowSkeleton } from "@/components/dashboard/skeletons";
import { MOCK_TREND_DATA, MOCK_SERVICE_DATA, MOCK_ANOMALY_TIMELINE } from "@/components/dashboard/mock-data";
import { CustomSelect } from "@/components/ui/custom-select";
import type { LogRecord } from "@/lib/api";

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
  const [feedback, setFeedback] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"paste" | "file">("paste");
  const [pasteLogs, setPasteLogs] = useState("");
  const [pasteService, setPasteService] = useState("unknown");
  const [pasteLevel, setPasteLevel] = useState<(typeof ingestLevelOptions)[number]>("INFO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFeedback("");

    try {
      await resolveAndStoreUserContext();

      window.localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, dashboardId);

      const response = await getDashboardMetrics(dashboardId, {
        severity,
        startTime: getStartTime(range),
      });
      setMetrics(response);
      setLastUpdated(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboard metrics";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        setFeedback("Please sign in before opening dashboard analytics.");
      } else {
        setFeedback(message);
      }
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId, range, severity]);

  useEffect(() => {
    void loadDashboardTitle();
  }, [dashboardId]);

  const hasRealData = (metrics?.total_logs_processed ?? 0) > 0;

  const trendData = useMemo(() => {
    const real = (metrics?.trend ?? []).map((point) => ({
      day: new Date(point.bucket).toISOString().slice(0, 10),
      total: point.total,
      critical: point.critical,
    }));
    return real.length > 0 ? real : MOCK_TREND_DATA;
  }, [metrics]);

  const serviceData = useMemo(() => {
    const rollup = new Map<string, { total: number; critical: number }>();
    for (const log of metrics?.recent_logs ?? []) {
      const service = log.service?.trim() || "unknown";
      const current = rollup.get(service) ?? { total: 0, critical: 0 };
      current.total += 1;
      if (log.severity === "critical") current.critical += 1;
      rollup.set(service, current);
    }
    const real = Array.from(rollup.entries())
      .map(([service, values]) => ({ service, total: values.total, critical: values.critical }))
      .sort((a, b) => b.total - a.total);
    return real.length > 0 ? real : MOCK_SERVICE_DATA;
  }, [metrics]);

  const anomalyTimeline = useMemo(() => {
    const real = (metrics?.recent_logs ?? [])
      .filter((l) => l.severity !== "normal")
      .slice(0, 40)
      .map((l) => ({
        time: new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        score: l.anomaly_score,
        severity: l.severity as "normal" | "suspicious" | "critical",
        service: l.service,
      }));
    return real.length > 0 ? real : MOCK_ANOMALY_TIMELINE;
  }, [metrics]);

  async function handlePasteIngest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const logs = parsePastedLogs(pasteLogs, pasteService, pasteLevel);
    if (!logs.length) {
      setFeedback("Paste at least one valid log line or JSON log object.");
      return;
    }

    setIsIngesting(true);
    setFeedback("");

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
      setFeedback(`Pasted ingestion complete: ${result.ingested} logs inserted.`);
      setIsUploadDialogOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to ingest pasted logs");
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadFile) {
      setFeedback("Please choose a CSV, JSON, or TXT file first.");
      return;
    }

    setIsUploading(true);
    setFeedback("");

    try {
      await resolveAndStoreUserContext();
      const result = await uploadLogFile(uploadFile, dashboardId);
      setUploadFile(null);
      setUploadInputKey((previous) => previous + 1);
      await refreshMetrics();
      setFeedback(`Upload complete: ${result.ingested} logs inserted, model trained: ${result.trained}.`);
      setIsUploadDialogOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to upload logs");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* ── Logo bar ── */}
      <header className="sticky top-0 z-50 h-12 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex h-full items-center px-5 sm:px-8 lg:px-10">
          <a href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#3ecf8e]" aria-hidden="true">
              <span className="block h-2.5 w-2.5 rounded-[2px] bg-[#0a0a0a]" />
            </span>
            <span className="font-['IBM_Plex_Mono'] text-xs font-semibold tracking-wide text-[var(--foreground)]">
              LogGuardian
            </span>
          </a>
        </div>
      </header>

      <main className="w-full max-w-[1400px] mx-auto px-5 pt-8 pb-16 sm:px-8 lg:px-10">
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[var(--muted-foreground)]">Dashboard Workspace</p>
              <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold tracking-tight sm:text-4xl text-[var(--foreground)]">{dashboardTitle}</h1>
              {lastUpdated && (
                <p className="mt-1 font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted-foreground)]">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <CustomSelect
                id="time-range-select"
                label="Time Range"
                value={range}
                onChange={(v) => setRange(v as typeof range)}
                options={rangeOptions.map((o) => ({ value: o.value, label: o.label }))}
              />

              <CustomSelect
                id="severity-select"
                label="Severity"
                value={severity}
                onChange={(v) => setSeverity(v as typeof severity)}
                options={[
                  { value: "", label: "All" },
                  { value: "normal", label: "Normal", dotColor: "#3ecf8e" },
                  { value: "suspicious", label: "Suspicious", dotColor: "#f59e0b" },
                  { value: "critical", label: "Critical", dotColor: "#ff4d4f" },
                ]}
              />

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => void refreshMetrics()}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 font-['IBM_Plex_Mono'] text-sm font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)] disabled:opacity-50"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => { setIsUploadDialogOpen(true); setUploadTab("paste"); }}
                  className="flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 font-['IBM_Plex_Mono'] text-sm font-semibold text-[#0a0a0a] transition-colors duration-150 hover:bg-[#5af0a8]"
                >
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  Upload Logs
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0,1,2,3].map(i => <StatCardSkeleton key={i} />)}
            </div>
          ) : metrics ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl border border-[var(--border)] border-l-2 p-3" style={{ borderLeftColor: "#3ecf8e" }}>
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Total Logs</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{metrics.total_logs_processed.toLocaleString()}</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] p-3">
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Anomalies</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{metrics.anomalies_detected.toLocaleString()}</p>
                {metrics.total_logs_processed > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">{metrics.anomaly_rate.toFixed(1)}% of total</p>
                )}
              </article>
              <article className="rounded-xl border border-[var(--border)] p-3" style={{ borderLeftColor: metrics.critical_alerts > 0 ? "#ff4d4f" : undefined, borderLeftWidth: metrics.critical_alerts > 0 ? 2 : 1 }}>
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Critical Alerts</p>
                <p className="mt-2 text-xl font-semibold" style={{ color: metrics.critical_alerts > 0 ? "#ff4d4f" : undefined }}>{metrics.critical_alerts.toLocaleString()}</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] p-3">
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(metrics.status)}`}>{metrics.status}</span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">{metrics.anomaly_rate.toFixed(2)}%</span>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        {feedback ? <p className="mt-4 bg-card border border-border shadow-none rounded-[12px] p-6 px-4 py-3 text-sm">{feedback}</p> : null}

        {/* ── Immersive Upload Modal ── */}
        {isUploadDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={() => setIsUploadDialogOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[var(--foreground)]">Ingest Logs</h2>
                  <p className="mt-0.5 font-['IBM_Plex_Mono'] text-xs text-[var(--muted-foreground)]">Stream logs directly into this dashboard for real-time anomaly detection</p>
                </div>
                <button onClick={() => setIsUploadDialogOpen(false)} className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="px-6 pt-4">
                <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1">
                  {(["paste", "file"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setUploadTab(tab)}
                      className={`flex-1 rounded-lg px-4 py-2 font-['IBM_Plex_Mono'] text-xs font-medium transition-all duration-150 ${
                        uploadTab === tab
                          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {tab === "paste" ? "Paste Logs" : "Upload File"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-6 pb-6 pt-4">
                {uploadTab === "paste" ? (
                  <form onSubmit={handlePasteIngest} className="space-y-4">
                    <div className="relative">
                      <textarea
                        className="w-full min-h-[180px] resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[#3ecf8e] focus:outline-none transition-colors"
                        value={pasteLogs}
                        onChange={(e) => setPasteLogs(e.target.value)}
                        placeholder={`Payment gateway timeout\nAuth token validation failed\n\nOR JSON:\n[{"message":"db lock timeout","level":"ERROR","service":"db"}]`}
                      />
                      {pasteLogs.length > 0 && (
                        <span className="absolute right-3 top-3 rounded-md bg-[var(--muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                          {pasteLogs.split("\n").length} lines
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.4px] text-[var(--muted-foreground)]">Fallback Service</label>
                        <input
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--foreground)] focus:border-[#3ecf8e] focus:outline-none"
                          value={pasteService}
                          onChange={(e) => setPasteService(e.target.value)}
                          placeholder="unknown"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.4px] text-[var(--muted-foreground)]">Fallback Level</label>
                        <select
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--foreground)] focus:border-[#3ecf8e] focus:outline-none"
                          value={pasteLevel}
                          onChange={(e) => setPasteLevel(e.target.value as typeof pasteLevel)}
                        >
                          {ingestLevelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => setIsUploadDialogOpen(false)} className="rounded-lg px-4 py-2 font-['IBM_Plex_Mono'] text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">Cancel</button>
                      <button type="submit" disabled={isIngesting} className="flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-2 font-['IBM_Plex_Mono'] text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#5af0a8] disabled:opacity-50">
                        <Server className="h-4 w-4" />
                        {isIngesting ? "Ingesting..." : "Ingest Logs"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div
                      className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors duration-150 ${
                        isDragging ? "border-[#3ecf8e] bg-[#3ecf8e]/5" : "border-[var(--border)] hover:border-[#3ecf8e]/50 hover:bg-[var(--muted)]"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                    >
                      {uploadFile ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-[#3ecf8e]" />
                          <div className="text-center">
                            <p className="font-['IBM_Plex_Mono'] text-sm font-medium text-[var(--foreground)]">{uploadFile.name}</p>
                            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadInputKey(k => k + 1); }} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                            <X className="h-3 w-3" /> Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-[var(--muted-foreground)]" />
                          <div className="text-center">
                            <p className="font-['IBM_Plex_Mono'] text-sm text-[var(--foreground)]">Drag &amp; drop or click to browse</p>
                            <p className="mt-1 font-['IBM_Plex_Mono'] text-xs text-[var(--muted-foreground)]">.csv · .json · .txt</p>
                          </div>
                        </>
                      )}
                      <input key={uploadInputKey} ref={fileInputRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => setIsUploadDialogOpen(false)} className="rounded-lg px-4 py-2 font-['IBM_Plex_Mono'] text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">Cancel</button>
                      <button type="submit" disabled={isUploading || !uploadFile} className="flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-2 font-['IBM_Plex_Mono'] text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#5af0a8] disabled:opacity-50">
                        <FileUp className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload & Process"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Service Activity</h2>
              {!hasRealData && <span className="font-mono text-[10px] uppercase tracking-widest text-[#898989] border border-[#2e2e2e] rounded px-2 py-0.5">Sample Data</span>}
            </div>
            <p className="lg-subtle mt-1 text-sm">Service-level load and critical distribution</p>
            <div className="mt-4">
              {loading ? <ChartSkeleton /> : <ServiceActivityChart services={serviceData} />}
            </div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Error Trend</h2>
              {!hasRealData && <span className="font-mono text-[10px] uppercase tracking-widest text-[#898989] border border-[#2e2e2e] rounded px-2 py-0.5">Sample Data</span>}
            </div>
            <p className="lg-subtle mt-1 text-sm">Critical trajectory for this dashboard</p>
            <div className="mt-4">
              {loading ? <ChartSkeleton /> : <ErrorTrendChart trend={trendData} />}
            </div>
          </motion.article>
        </section>

        <section className="mt-6">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Anomaly Timeline</h2>
                <p className="lg-subtle mt-1 text-sm">Score trajectory — reference lines at 0.4 (suspicious) and 0.7 (critical)</p>
              </div>
              {!hasRealData && <span className="font-mono text-[10px] uppercase tracking-widest text-[#898989] border border-[#2e2e2e] rounded px-2 py-0.5">Sample Data</span>}
            </div>
            <div className="mt-4">
              {loading ? <ChartSkeleton /> : <AnomalyTimelineChart data={anomalyTimeline} />}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Alerts Panel</h2>
            <p className="lg-subtle mt-1 text-sm">Critical and suspicious events</p>
            <div className="mt-4 max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {loading
                ? [0,1,2,3].map(i => <AlertSkeleton key={i} />)
                : (metrics?.alerts ?? []).slice(0, 20).map((alert) => {
                    const ac = alert.severity === "critical" ? "#ff4d4f" : "#f59e0b";
                    return (
                      <div key={alert.id} className="flex gap-3 rounded-xl border border-[#2e2e2e] p-3 hover:bg-[#1f1f1f] transition-colors">
                        <div className="w-1 rounded-full flex-shrink-0" style={{ background: ac }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ac }}>{alert.service}</p>
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ac}20`, color: ac }}>{alert.anomaly_score.toFixed(2)}</span>
                          </div>
                          <p className="mt-1 text-xs text-[#898989] truncate">{alert.message}</p>
                          <p className="mt-1 text-[10px] text-[#898989]">
                            <Clock3 className="mr-1 inline h-3 w-3" />
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
              }
              {!loading && (metrics?.alerts.length ?? 0) === 0 && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AlertTriangle className="h-8 w-8 text-[#2e2e2e]" />
                  <p className="text-sm text-[#898989]">No alerts in the selected scope.</p>
                  <p className="text-xs text-[#898989]">Upload logs to begin monitoring.</p>
                </div>
              )}
            </div>
          </article>

          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-xl font-semibold">Recent Logs</h2>
            <p className="lg-subtle mt-1 text-sm">Click a row to inspect anomaly details</p>
            <div className="mt-4 max-h-[400px] space-y-1.5 overflow-auto pr-1">
              {loading
                ? [0,1,2,3,4].map(i => <LogRowSkeleton key={i} />)
                : (metrics?.recent_logs ?? []).map((log) => {
                    const sc = log.severity === "critical" ? "#ff4d4f" : log.severity === "suspicious" ? "#f59e0b" : "#3ecf8e";
                    return (
                      <button
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="w-full text-left rounded-xl border border-[#2e2e2e] p-3 hover:bg-[#1f1f1f] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs uppercase tracking-widest text-[#898989]">{log.service}</span>
                          <span className="text-[10px] text-[#898989]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#b4b4b4] truncate">{log.message}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded-full border border-[#2e2e2e] px-2 py-0.5 text-[10px] font-mono">{log.level}</span>
                          <span className="font-mono text-[10px] font-semibold" style={{ color: sc }}>Score: {log.anomaly_score.toFixed(3)}</span>
                        </div>
                      </button>
                    );
                  })
              }
              {!loading && (metrics?.recent_logs.length ?? 0) === 0 && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Server className="h-8 w-8 text-[#2e2e2e]" />
                  <p className="text-sm text-[#898989]">No logs yet.</p>
                  <button
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="text-xs text-[#3ecf8e] underline underline-offset-2"
                  >Upload your first log file</button>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
