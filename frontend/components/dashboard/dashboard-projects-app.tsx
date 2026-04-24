"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, PlusCircle, RefreshCcw } from "lucide-react";

import { type DashboardSummary, listDashboards } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";

function statusChip(status: DashboardSummary["status"]) {
  if (status === "critical") {
    return "bg-red-500/15 text-red-600 dark:text-red-300";
  }
  if (status === "warning") {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
}

export function DashboardProjectsApp() {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const criticalCount = useMemo(
    () => dashboards.filter((dashboard) => dashboard.status === "critical").length,
    [dashboards]
  );

  async function loadDashboards() {
    setLoading(true);
    setFeedback("");

    try {
      await resolveAndStoreUserContext();

      const response = await listDashboards();
      setDashboards(response.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboards";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        setFeedback("Please sign in first to view your dashboards.");
      } else {
        setFeedback(message);
      }
      setDashboards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboards();
  }, []);

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <section className="bg-card border border-border shadow-none rounded-[12px] p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(63,213,185,0.14),transparent_40%),radial-gradient(circle_at_86%_18%,rgba(114,188,255,0.16),transparent_42%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="lg-kicker">Project Dashboards</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Isolated Monitoring Workspaces</h1>
              <p className="lg-subtle mt-3 max-w-2xl text-sm">
                Each dashboard is a strict analytics boundary. Logs and metrics never mix across projects.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void loadDashboards()}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
              <Link href="/create-dashboard">
                <Button type="button" variant="default" size="sm">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Create Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-4">
              <p className="text-xs uppercase tracking-[0.14em] lg-subtle">Total Dashboards</p>
              <p className="mt-2 text-2xl font-semibold">{dashboards.length}</p>
            </article>
            <article className="rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-4">
              <p className="text-xs uppercase tracking-[0.14em] lg-subtle">Critical Projects</p>
              <p className="mt-2 text-2xl font-semibold">{criticalCount}</p>
            </article>
            <article className="rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-4">
              <p className="text-xs uppercase tracking-[0.14em] lg-subtle">Isolation Model</p>
              <p className="mt-2 text-sm font-medium">user_id + dashboard_id</p>
            </article>
          </div>
        </section>

        {feedback ? <p className="mt-4 bg-card border border-border shadow-none rounded-[12px] p-6 px-4 py-3 text-sm">{feedback}</p> : null}

        <section className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-card border border-border shadow-none rounded-[12px] p-6 h-52 animate-pulse bg-(--lg-accent-soft)" />
              ))}
            </div>
          ) : dashboards.length === 0 ? (
            <div className="bg-card border border-border shadow-none rounded-[12px] p-6 text-center">
              <Activity className="mx-auto h-10 w-10 lg-subtle" aria-hidden="true" />
              <p className="mt-3 text-lg font-semibold">No dashboards yet</p>
              <p className="lg-subtle mt-2 text-sm">Create your first project to start isolated log analytics.</p>
              <div className="mt-5">
                <Link href="/create-dashboard">
                  <Button type="button" size="sm">
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Create Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dashboards.map((dashboard, index) => (
                <motion.article
                  key={dashboard.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-card border border-border shadow-none rounded-[12px] p-6 flex h-full flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{dashboard.name}</p>
                      <p className="lg-subtle mt-1 text-xs uppercase tracking-[0.14em]">{dashboard.type}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(dashboard.status)}`}>
                      {dashboard.status}
                    </span>
                  </div>

                  <p className="lg-subtle mt-3 line-clamp-2 text-sm">
                    {dashboard.description || "No description provided for this dashboard."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-(--border) p-2">
                      <p className="lg-subtle">Logs</p>
                      <p className="mt-1 font-semibold">{dashboard.total_logs_processed}</p>
                    </div>
                    <div className="rounded-xl border border-(--border) p-2">
                      <p className="lg-subtle">Anomaly Rate</p>
                      <p className="mt-1 font-semibold">{dashboard.anomaly_rate.toFixed(2)}%</p>
                    </div>
                  </div>

                  <p className="lg-subtle mt-3 text-xs">
                    Last updated: {new Date(dashboard.last_updated).toLocaleString()}
                  </p>

                  <div className="mt-auto pt-4">
                    <Link href={`/dashboard/${dashboard.id}`}>
                      <Button type="button" variant="secondary" size="sm" className="w-full justify-between">
                        Open Dashboard
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
