"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCcw, Search } from "lucide-react";

import {
  type Classification,
  type LogRecord,
  createRealtimeSocket,
  getLogs,
} from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

const levelOptions = ["", "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"];

function classificationChip(classification: Classification) {
  if (classification === "critical") return "bg-red-500/15 text-red-600 dark:text-red-300";
  if (classification === "suspicious") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

export function LogViewerApp() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(30);

  const [serviceFilter, setServiceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<"" | Classification>("");
  const [query, setQuery] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  async function refresh(targetPage = page) {
    setLoading(true);
    try {
      const result = await getLogs({
        page: targetPage,
        pageSize,
        service: serviceFilter || undefined,
        level: levelFilter || undefined,
        classification: classificationFilter,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
      });
      setLogs(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      showToast({
        type: "error",
        title: "Unable to load logs",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceFilter, levelFilter, classificationFilter, startTime, endTime]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          event: string;
          payload?: { log?: LogRecord };
        };
        if (parsed.event === "log_ingested" && parsed.payload?.log) {
          setLogs((prev) => [parsed.payload!.log!, ...prev].slice(0, pageSize));
        }
      } catch {
        return;
      }
    };

    return () => socket.close();
  }, [pageSize]);

  const filteredLogs = useMemo(() => {
    if (!query.trim()) {
      return logs;
    }
    const normalized = query.toLowerCase();
    return logs.filter((log) => {
      return (
        log.message.toLowerCase().includes(normalized) ||
        log.service.toLowerCase().includes(normalized) ||
        log.level.toLowerCase().includes(normalized)
      );
    });
  }, [logs, query]);

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <section className="bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Logs</h1>
              <p className="lg-subtle mt-2 text-sm">Deep filtering + drill-down for incident triage</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="mt-6 bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Service</span>
                <input
                  className="lg-input h-10 w-40"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  placeholder="api"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Level</span>
                <select className="lg-input h-10 w-32" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  {levelOptions.map((level) => (
                    <option key={level || "all"} value={level}>
                      {level || "All"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Class</span>
                <select
                  className="lg-input h-10 w-36"
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value as "" | Classification)}
                >
                  <option value="">All</option>
                  <option value="normal">normal</option>
                  <option value="suspicious">suspicious</option>
                  <option value="critical">critical</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">From</span>
                <input
                  type="datetime-local"
                  className="lg-input h-10"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">To</span>
                <input
                  type="datetime-local"
                  className="lg-input h-10"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 lg-subtle" />
                <input
                  className="lg-input h-10 w-56 pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search logs"
                />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void refresh(page)}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-220 text-left text-sm">
              <thead>
                <tr className="lg-subtle text-xs uppercase tracking-[0.13em]">
                  <th className="px-2 py-2">Timestamp</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Message</th>
                  <th className="px-2 py-2">Anomaly</th>
                  <th className="px-2 py-2">Class</th>
                  <th className="px-2 py-2">Explainability</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-(--border)">
                    <td className="px-2 py-2 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-2 py-2 font-medium">{log.service}</td>
                    <td className="px-2 py-2">{log.level}</td>
                    <td className="px-2 py-2 lg-subtle">{log.message}</td>
                    <td className="px-2 py-2">{log.anomaly_score.toFixed(3)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${classificationChip(log.classification)}`}>
                        {log.classification}
                      </span>
                    </td>
                    <td className="px-2 py-2 lg-subtle text-xs">
                      {log.explanation ?? "Hybrid model components unavailable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="lg-subtle text-xs">
              <Filter className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {loading ? "Loading..." : `${filteredLogs.length} shown`} • {total} total logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refresh(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </Button>
              <span className="lg-subtle text-xs">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refresh(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
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
