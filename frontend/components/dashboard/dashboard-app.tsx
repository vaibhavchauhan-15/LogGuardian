"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  FileUp,
  RefreshCcw,
  Server,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  type AnalyticsOverview,
  type Classification,
  type LogRecord,
  type ModelStatus,
  createRealtimeSocket,
  getAlerts,
  getAnalytics,
  getLogs,
  getModelStatus,
  ingestLog,
  trainModel,
  uploadLogFile,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ActiveAnomalyTracker } from "@/components/ui/live-sales-dashboard";
import { AnomalyPulseCard } from "@/components/ui/animated-dashboard-card";
import IncidentAreaMultiSeriesCard from "@/components/ui/areachart-multiseries";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogActionButton,
} from "@/components/ui/dialog";
import { OnboardingDialog } from "@/components/ui/onboarding-dialog";

const ErrorTrendChart = dynamic(
  () => import("@/components/dashboard/error-trend-chart").then((mod) => mod.ErrorTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-(--lg-accent-soft)" />,
  }
);

const ServiceActivityChart = dynamic(
  () => import("@/components/dashboard/service-activity-chart").then((mod) => mod.ServiceActivityChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-(--lg-accent-soft)" />,
  }
);

const initialForm = {
  service: "api",
  level: "ERROR",
  message: "",
};
const levelOptions = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"];

function classificationChip(classification: Classification) {
  if (classification === "critical") {
    return "bg-red-500/15 text-red-600 dark:text-red-300";
  }
  if (classification === "suspicious") {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

function parseRealtimeLog(payload: unknown): LogRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.id !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    dashboard_id: String(candidate.dashboard_id ?? ""),
    timestamp: String(candidate.timestamp ?? new Date().toISOString()),
    service: String(candidate.service ?? "unknown"),
    level: String(candidate.level ?? "INFO"),
    message: String(candidate.message ?? ""),
    anomaly_score: Number(candidate.anomaly_score ?? 0),
    severity: (candidate.severity as Classification) ?? "normal",
    classification: (candidate.classification as Classification) ?? "normal",
    explanation: candidate.explanation ? String(candidate.explanation) : undefined,
    model_breakdown:
      candidate.model_breakdown && typeof candidate.model_breakdown === "object"
        ? (candidate.model_breakdown as Record<string, number>)
        : undefined,
  };
}

export function DashboardApp() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [liveLogs, setLiveLogs] = useState<LogRecord[]>([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [pageSize] = useState(20);

  const [classificationFilter, setClassificationFilter] = useState<"" | Classification>("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const [form, setForm] = useState(initialForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [socketState, setSocketState] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const anomalyRateText = useMemo(() => {
    if (!overview) return "--";
    return `${overview.anomaly_rate.toFixed(2)}%`;
  }, [overview]);

  const pulseMetrics = useMemo(() => {
    const totalAnomalies = overview?.total_anomalies ?? 28;
    const totalCritical = overview?.total_critical ?? 6;
    return {
      warningCount: Math.max(6, totalAnomalies - totalCritical),
      alertCount: Math.max(1, totalCritical),
      suspiciousCount: Math.max(4, Math.round(totalAnomalies * 0.45)),
    };
  }, [overview]);

  async function refreshAll(targetPage = page) {
    setIsLoading(true);
    setFeedback("");
    try {
      const [overviewData, logsData, status, alertsData] = await Promise.all([
        getAnalytics(14),
        getLogs({
          page: targetPage,
          pageSize,
          level: levelFilter || undefined,
          classification: classificationFilter,
          service: serviceFilter || undefined,
        }),
        getModelStatus(),
        getAlerts({ page: 1, pageSize: 1, status: "pending" }),
      ]);

      setOverview(overviewData);
      setLogs(logsData.items);
      setTotal(logsData.total);
      setModelStatus(status);
      setPendingAlerts(alertsData.total);
      setPage(logsData.page);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificationFilter, serviceFilter, levelFilter]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    let heartbeat: number | undefined;

    setSocketState("connecting");

    socket.onopen = () => {
      setSocketState("connected");
      heartbeat = window.setInterval(() => {
        socket.send("ping");
      }, 16000);
    };

    socket.onclose = () => {
      setSocketState("disconnected");
      if (heartbeat) {
        window.clearInterval(heartbeat);
      }
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          event: string;
          payload?: Record<string, unknown>;
        };

        if (parsed.event === "log_ingested") {
          const log = parseRealtimeLog(parsed.payload?.log);
          if (log) {
            setLogs((prev) => [log, ...prev].slice(0, pageSize));
            setLiveLogs((prev) => [log, ...prev].slice(0, 12));
          }
        }

        if (parsed.event === "alert_created") {
          setPendingAlerts((prev) => prev + 1);
        }
      } catch {
        return;
      }
    };

    return () => {
      if (heartbeat) {
        window.clearInterval(heartbeat);
      }
      socket.close();
    };
  }, [pageSize]);

  async function handleIngest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.message.trim()) {
      setFeedback("Message is required.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");
    try {
      const result = await ingestLog({
        service: form.service,
        level: form.level,
        message: form.message,
      });
      setForm((prev) => ({ ...prev, message: "" }));
      setFeedback(
        result.alert_triggered
          ? "Critical log ingested and alert triggered."
          : "Log ingested successfully."
      );
      setLiveLogs((prev) => [result.log, ...prev].slice(0, 12));
      await refreshAll(1);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to ingest log");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uploadFile) {
      setFeedback("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setFeedback("");
    try {
      const result = await uploadLogFile(uploadFile);
      setFeedback(`Upload complete: ${result.ingested} logs inserted, model trained: ${result.trained}`);
      setUploadFile(null);
      await refreshAll(1);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleTrainModel() {
    setIsTraining(true);
    setFeedback("");
    try {
      const result = await trainModel();
      setFeedback(result.message);
      await refreshAll(page);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to train model");
    } finally {
      setIsTraining(false);
    }
  }

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <section className="bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="lg-subtle mt-2 text-sm">Hybrid ML + realtime incident intelligence</p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-(--border) px-3 py-1.5 text-sm lg-subtle">
              <Bell className="h-4 w-4 text-(--lg-accent-strong)" aria-hidden="true" />
              Pending alerts: {pendingAlerts}
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="lg-chip">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {socketState === "connected" ? "Realtime stream active" : "Realtime stream reconnecting"}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refreshAll(page)}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {feedback ? <div className="bg-card border border-border shadow-none rounded-[12px] p-6 mt-4 rounded-xl px-4 py-3 text-sm">{feedback}</div> : null}

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <ActiveAnomalyTracker compact />
          <div className="space-y-4">
            <IncidentAreaMultiSeriesCard />
            <AnomalyPulseCard
              warningCount={pulseMetrics.warningCount}
              alertCount={pulseMetrics.alertCount}
              suspiciousCount={pulseMetrics.suspiciousCount}
            />
            <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
              <h2 className="text-lg font-semibold tracking-tight">Operational guidance</h2>
              <p className="lg-subtle mt-1 text-sm">
                Launch onboarding walkthroughs and quick response playbooks from here.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" type="button">
                      Open Response Playbook
                    </Button>
                  </DialogTrigger>
                  <DialogContent size="lg">
                    <DialogHeader>
                      <DialogTitle>Anomaly Response Playbook</DialogTitle>
                      <DialogDescription>
                        Use this checklist when warning and critical signal intensity rises.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-(--muted-foreground)">
                      <p>1. Confirm source integrity for top impacted services.</p>
                      <p>2. Compare live anomaly feed against historical trend deltas.</p>
                      <p>3. Escalate incidents with score above 0.80 and active critical labels.</p>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <DialogActionButton variant="ghost">Dismiss</DialogActionButton>
                      </DialogClose>
                      <DialogClose asChild>
                        <DialogActionButton variant="primary">Acknowledge</DialogActionButton>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <OnboardingDialog defaultOpen={false} />
              </div>
            </article>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <p className="lg-subtle text-xs uppercase tracking-[0.14em]">Total Logs</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{overview?.total_logs ?? "--"}</p>
          </article>
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <p className="lg-subtle text-xs uppercase tracking-[0.14em]">Anomaly Rate</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{anomalyRateText}</p>
          </article>
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <p className="lg-subtle text-xs uppercase tracking-[0.14em]">Critical Events</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{overview?.total_critical ?? "--"}</p>
          </article>
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <p className="lg-subtle text-xs uppercase tracking-[0.14em]">Pending Alerts</p>
            <p className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Zap className="h-5 w-5 text-(--lg-accent-strong)" aria-hidden="true" />
              {pendingAlerts}
            </p>
          </article>
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <p className="lg-subtle text-xs uppercase tracking-[0.14em]">Model Status</p>
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
              {modelStatus?.trained ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
              )}
              {modelStatus?.trained ? "Hybrid Trained" : "Heuristic Fallback"}
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-lg font-semibold tracking-tight">Error and anomaly timeline</h2>
            <p className="lg-subtle mt-1 text-sm">Real-time trend over the last 14 days.</p>
            <div className="mt-4">
              <ErrorTrendChart trend={overview?.trend ?? []} />
            </div>
          </article>

          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-lg font-semibold tracking-tight">System activity by service</h2>
            <p className="lg-subtle mt-1 text-sm">Compare total traffic versus critical spikes.</p>
            <div className="mt-4">
              <ServiceActivityChart services={overview?.top_services ?? []} />
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-lg font-semibold tracking-tight">Log ingestion controls</h2>
            <form className="mt-4 space-y-3" onSubmit={handleIngest}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block lg-subtle">Service</span>
                  <input
                    className="lg-input"
                    value={form.service}
                    onChange={(e) => setForm((prev) => ({ ...prev, service: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block lg-subtle">Level</span>
                  <select
                    className="lg-input"
                    value={form.level}
                    onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                  >
                    {levelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Message</span>
                <textarea
                  className="lg-input min-h-24"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Example: payment API timeout while generating invoice"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="default" size="sm" disabled={isSubmitting}>
                  <Server className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Ingesting..." : "Ingest Log"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleTrainModel()}
                  disabled={isTraining}
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  {isTraining ? "Training..." : "Train Hybrid Model"}
                </Button>
              </div>
            </form>

            <form className="mt-6 space-y-3 border-t border-(--border) pt-6" onSubmit={handleUpload}>
              <p className="lg-subtle text-sm">Bulk upload CSV, JSON, or TXT and auto-refresh model artifacts.</p>
              <input
                className="lg-input"
                type="file"
                accept=".csv,.json,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button type="submit" variant="default" size="sm" disabled={isUploading}>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {isUploading ? "Uploading..." : "Upload + Process"}
              </Button>
            </form>
          </article>

          <article className="bg-card border border-border shadow-none rounded-[12px] p-6">
            <h2 className="text-lg font-semibold tracking-tight">Live anomaly feed</h2>
            <p className="lg-subtle mt-1 text-sm">Latest events from WebSocket stream.</p>
            <div className="mt-4 space-y-2">
              {liveLogs.length === 0 ? (
                <p className="lg-subtle text-sm">No live events yet. Ingest a log to begin the stream.</p>
              ) : (
                liveLogs.map((row) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-(--border) p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{row.service}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classificationChip(row.classification)}`}>
                        {row.classification}
                      </span>
                    </div>
                    <p className="lg-subtle mt-2 line-clamp-2 text-xs">{row.message}</p>
                    <p className="lg-subtle mt-2 flex items-center gap-1 text-[11px]">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {new Date(row.timestamp).toLocaleString()} • score {row.anomaly_score.toFixed(2)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 bg-card border border-border shadow-none rounded-[12px] p-6 overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-(--border) pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Operational log viewer</h2>
              <p className="lg-subtle mt-1 text-sm">Time-sorted logs with anomaly explainability metadata.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="lg-input h-10 w-40"
                placeholder="Filter service"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
              <select className="lg-input h-10 w-36" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                <option value="">All levels</option>
                {levelOptions.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <select
                className="lg-input h-10 w-40"
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value as "" | Classification)}
              >
                <option value="">All labels</option>
                <option value="normal">normal</option>
                <option value="suspicious">suspicious</option>
                <option value="critical">critical</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead>
                <tr className="lg-subtle text-xs uppercase tracking-[0.13em]">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Message</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Class</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-(--border)">
                    <td className="px-2 py-2 text-xs">{new Date(row.timestamp).toLocaleString()}</td>
                    <td className="px-2 py-2 font-medium">{row.service}</td>
                    <td className="px-2 py-2">{row.level}</td>
                    <td className="px-2 py-2 lg-subtle">
                      {row.message}
                      {row.explanation ? <p className="mt-1 text-[11px]">{row.explanation}</p> : null}
                    </td>
                    <td className="px-2 py-2">{row.anomaly_score.toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classificationChip(row.classification)}`}>
                        {row.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="lg-subtle text-xs">
              Page {page} / {totalPages} • {total} total logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refreshAll(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refreshAll(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
