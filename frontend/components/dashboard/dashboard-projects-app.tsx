"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, PlusCircle, RefreshCcw } from "lucide-react";

import { type DashboardSummary, listDashboards } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

function dashboardStatusChip(status: DashboardSummary["status"]) {
  if (status === "critical") {
    return {
      label: "critical",
      className:
        "inline-flex items-center gap-1.5 rounded-md border border-red-400/35 bg-red-500/10 px-2.5 py-1 font-mono text-[11px] font-medium text-red-400",
      dotClassName: "h-1.5 w-1.5 rounded-full bg-red-400",
    };
  }

  if (status === "warning") {
    return {
      label: "warning",
      className:
        "inline-flex items-center gap-1.5 rounded-md border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-2.5 py-1 font-mono text-[11px] font-medium text-[#f59e0b]",
      dotClassName: "h-1.5 w-1.5 rounded-full bg-[#f59e0b]",
    };
  }

  return {
    label: "normal",
    className:
      "inline-flex items-center gap-1.5 rounded-md border border-[#3ecf8e]/35 bg-[#3ecf8e]/10 px-2.5 py-1 font-mono text-[11px] font-medium text-[#3ecf8e]",
    dotClassName: "h-1.5 w-1.5 rounded-full bg-[#3ecf8e]",
  };
}

function anomalyRateColor(value: number) {
  if (value < 5) return "text-[#3ecf8e]";
  if (value < 20) return "text-[#f59e0b]";
  return "text-red-400";
}

export function DashboardProjectsApp() {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const criticalCount = useMemo(() => dashboards.filter((item) => item.status === "critical").length, [dashboards]);

  const loadDashboards = useCallback(async () => {
    setLoading(true);
    try {
      await resolveAndStoreUserContext();
      const response = await listDashboards();
      setDashboards(response.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboards";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        showToast({ type: "error", title: "Please sign in first to view your dashboards" });
      } else if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed")
      ) {
        // local-dev network interruptions
      } else {
        showToast({ type: "error", title: "Unable to load dashboards", description: message });
      }
      setDashboards([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 h-12 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-full items-center px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#3ecf8e]" aria-hidden="true" />
            <span className="font-mono text-xs font-medium tracking-wide text-foreground">LogGuardian</span>
          </div>
        </div>
      </header>

      <main>
        <section className="w-full border-b border-border bg-[linear-gradient(180deg,var(--card)_0%,var(--background)_100%)] px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted-foreground">Project Dashboards</p>
              <h1 className="mt-3 text-[32px] font-normal leading-tight tracking-[-0.5px] text-foreground">
                Isolated Monitoring Workspaces
              </h1>
              <p className="mt-1.5 max-w-[560px] font-mono text-sm text-muted-foreground">
                Each dashboard is a strict analytics boundary. Logs and metrics never mix across projects.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="refresh-dashboards-btn"
                type="button"
                onClick={() => void loadDashboards()}
                className="flex h-10 items-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>
              <Button
                id="create-dashboard-btn"
                asChild
                size="sm"
                className="h-10 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
              >
                <Link href="/create-dashboard" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Create Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            <div className="bg-card px-6 py-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Total Dashboards</p>
              <p className="text-3xl font-light text-foreground">
                {loading ? <span className="inline-block h-8 w-8 animate-pulse rounded bg-muted" /> : dashboards.length}
              </p>
            </div>

            <div className="bg-card px-6 py-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Critical Projects</p>
              <p className="flex items-center gap-2 text-3xl font-light text-foreground">
                {!loading && criticalCount > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden="true" /> : null}
                {loading ? <span className="inline-block h-8 w-8 animate-pulse rounded bg-muted" /> : criticalCount}
              </p>
            </div>

            <div className="bg-card px-6 py-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Isolation Model</p>
              <p className="font-mono text-sm text-(--text-secondary)">user_id + dashboard_id</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3 lg:p-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="h-64 animate-pulse rounded-xl bg-muted" />)
          ) : dashboards.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 py-24">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="font-mono text-sm text-muted-foreground">No dashboards yet</p>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
              >
                <Link href="/create-dashboard" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Create your first dashboard
                </Link>
              </Button>
            </div>
          ) : (
            dashboards.map((dashboard, index) => {
              const status = dashboardStatusChip(dashboard.status);
              return (
                <motion.article
                  key={dashboard.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:bg-muted/30"
                >
                  <div className="px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className={status.className}>
                        <span className={status.dotClassName} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-1 text-[18px] font-medium text-foreground">{dashboard.name}</h2>
                    <p className="mt-1 line-clamp-2 font-mono text-[13px] text-muted-foreground">
                      {dashboard.type} · {dashboard.description || "No description provided"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
                    <div className="bg-card px-4 py-3">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Logs</p>
                      <p className="text-xl text-foreground">{dashboard.total_logs_processed}</p>
                    </div>
                    <div className="bg-card px-4 py-3">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Anomaly Rate</p>
                      <p className={`text-xl ${anomalyRateColor(dashboard.anomaly_rate)}`}>
                        {dashboard.anomaly_rate.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <p className="border-t border-border px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                    Last updated: {new Date(dashboard.last_updated).toLocaleString()}
                  </p>

                  <div className="mt-auto border-t border-border px-4 py-3 transition-colors duration-200 group-hover:bg-[#3ecf8e]/5">
                    <Link href={`/dashboard/${dashboard.id}`} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-[#3ecf8e]">
                        Open Dashboard
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#3ecf8e]" />
                    </Link>
                  </div>
                </motion.article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
