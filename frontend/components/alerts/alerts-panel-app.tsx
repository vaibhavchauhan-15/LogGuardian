"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, RefreshCcw } from "lucide-react";

import {
  type AlertPriority,
  type AlertRecord,
  type AlertStatus,
  createRealtimeSocket,
  getAlerts,
  resolveAlert,
} from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

function priorityChip(priority: AlertPriority) {
  if (priority === "critical") return "bg-red-500/15 text-red-600 dark:text-red-300";
  if (priority === "high") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  if (priority === "medium") return "bg-sky-500/15 text-sky-600 dark:text-sky-300";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

export function AlertsPanelApp() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(25);

  const [statusFilter, setStatusFilter] = useState<"" | AlertStatus>("pending");
  const [priorityFilter, setPriorityFilter] = useState<"" | AlertPriority>("");
  const [serviceFilter, setServiceFilter] = useState("");
  const { showToast } = useToast();

  async function refresh(targetPage = page) {
    setLoading(true);
    try {
      const result = await getAlerts({
        page: targetPage,
        pageSize,
        status: statusFilter,
        priority: priorityFilter,
        service: serviceFilter || undefined,
      });
      setAlerts(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      showToast({
        type: "error",
        title: "Unable to load alerts",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, serviceFilter]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          event: string;
          payload?: { alert?: AlertRecord };
        };
        if (parsed.event === "alert_created" && parsed.payload?.alert) {
          setAlerts((prev) => [parsed.payload!.alert!, ...prev].slice(0, pageSize));
        }
      } catch {
        return;
      }
    };

    return () => socket.close();
  }, [pageSize]);

  async function handleResolve(alertId: string) {
    try {
      await resolveAlert(alertId, "dashboard-operator");
      showToast({
        type: "success",
        title: "Alert resolved",
      });
      await refresh(page);
    } catch (error) {
      showToast({
        type: "error",
        title: "Failed to resolve alert",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <section className="bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Alerts</h1>
              <p className="lg-subtle mt-2 text-sm">Deduplicated incidents with lifecycle tracking</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="mt-6 bg-card border border-border shadow-none rounded-[12px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Status</span>
                <select
                  className="lg-input h-10 w-36"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "" | AlertStatus)}
                >
                  <option value="">All</option>
                  <option value="pending">pending</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Priority</span>
                <select
                  className="lg-input h-10 w-36"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as "" | AlertPriority)}
                >
                  <option value="">All</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block lg-subtle">Service</span>
                <input
                  className="lg-input h-10 w-40"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  placeholder="payments"
                />
              </label>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh(page)}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {alerts.map((alert) => (
              <article key={alert.id} className="rounded-2xl border border-(--border) p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="lg-subtle mt-1 text-xs">{alert.service} • {alert.classification}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityChip(alert.priority)}`}>
                      {alert.priority}
                    </span>
                    <span className="rounded-full border border-(--border) px-2.5 py-1 text-xs font-semibold">
                      {alert.status}
                    </span>
                  </div>
                </div>

                <p className="lg-subtle mt-3 text-sm">{alert.message}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs lg-subtle">
                  <p>
                    <Bell className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    Occurrences: {alert.occurrence_count}
                  </p>
                  <p>Last seen: {new Date(alert.last_seen_at).toLocaleString()}</p>
                  {alert.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleResolve(alert.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Resolve
                    </Button>
                  ) : (
                    <p>
                      <AlertCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                      Resolved
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs lg-subtle">
            <p>
              {loading ? "Loading alerts..." : `${alerts.length} loaded`} • {total} total
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refresh(page + 1)}
                disabled={alerts.length < pageSize || loading}
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
