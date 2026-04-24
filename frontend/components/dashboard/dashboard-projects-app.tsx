"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, PlusCircle, RefreshCcw } from "lucide-react";

import { type DashboardSummary, listDashboards } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";

function dashboardStatusChip(status: DashboardSummary["status"]) {
  if (status === "critical") {
    return {
      label: "critical",
      className:
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['IBM_Plex_Mono'] font-medium bg-red-950/50 text-red-400 border border-red-900/50",
      dotClassName: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse",
    };
  }

  if (status === "warning") {
    return {
      label: "warning",
      className:
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['IBM_Plex_Mono'] font-medium bg-amber-950/50 text-amber-400 border border-amber-900/50",
      dotClassName: "w-1.5 h-1.5 rounded-full bg-amber-400",
    };
  }

  return {
    label: "normal",
    className:
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['IBM_Plex_Mono'] font-medium bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20",
    dotClassName: "w-1.5 h-1.5 rounded-full bg-[#3ecf8e]",
  };
}

function anomalyRateColor(value: number) {
  if (value < 5) return "text-[#3ecf8e]";
  if (value < 20) return "text-[#f5a623]";
  return "text-red-400";
}

export function DashboardProjectsApp() {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const criticalCount = useMemo(
    () => dashboards.filter((d) => d.status === "critical").length,
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 h-12 border-b border-[#242424] bg-[#111111]">
        <div className="flex h-full items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* Logo mark */}
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#3ecf8e]" aria-hidden="true" />
            <span className="font-['IBM_Plex_Mono'] text-xs font-medium tracking-wide text-[#fafafa]">
              LogGuardian
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id="refresh-dashboards-btn"
              type="button"
              onClick={() => void loadDashboards()}
              className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] bg-transparent px-3 py-1.5 font-['IBM_Plex_Mono'] text-xs font-medium text-[#898989] transition-all duration-150 hover:border-[#3d3d3d] hover:bg-[#1e1e1e] hover:text-[#fafafa]"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>
            <Link
              id="create-dashboard-btn"
              href="/create-dashboard"
              className="flex items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#5af0a8]"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Create Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Band ── */}
        <section className="w-full border-b border-[#242424] bg-[linear-gradient(180deg,#141414_0%,#0a0a0a_100%)] px-5 py-8 sm:px-8 lg:px-10">
          <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[1.5px] text-[#898989]">
            Project Dashboards
          </p>
          <h1 className="mt-3 font-['Space_Grotesk'] text-[32px] font-normal leading-tight tracking-[-0.5px] text-[#fafafa]">
            Isolated Monitoring Workspaces
          </h1>
          <p className="mt-1.5 max-w-[560px] font-['IBM_Plex_Mono'] text-sm text-[#898989]">
            Each dashboard is a strict analytics boundary. Logs and metrics never mix across projects.
          </p>

          {/* Stat grid */}
          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#2e2e2e] sm:grid-cols-3">
            <div className="bg-[#111111] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[#555]">
                Total Dashboards
              </p>
              <p className="font-['Space_Grotesk'] text-3xl font-light text-[#fafafa]">
                {loading ? <span className="skeleton inline-block h-8 w-8 rounded" /> : dashboards.length}
              </p>
            </div>

            <div className="bg-[#111111] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[#555]">
                Critical Projects
              </p>
              <p className="flex items-center gap-2 font-['Space_Grotesk'] text-3xl font-light text-[#fafafa]">
                {!loading && criticalCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" aria-hidden="true" />
                )}
                {loading ? <span className="skeleton inline-block h-8 w-8 rounded" /> : criticalCount}
              </p>
            </div>

            <div className="bg-[#111111] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[#555]">
                Isolation Model
              </p>
              <p className="font-['IBM_Plex_Mono'] text-sm text-[#b4b4b4]">user_id + dashboard_id</p>
            </div>
          </div>
        </section>

        {/* ── Feedback ── */}
        {feedback ? (
          <div className="px-5 pt-6 sm:px-8 lg:px-10">
            <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 font-['IBM_Plex_Mono'] text-xs text-red-300">
              {feedback}
            </p>
          </div>
        ) : null}

        {/* ── Cards Grid ── */}
        <section className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3 lg:p-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skeleton h-64 rounded-xl" />
            ))
          ) : dashboards.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 py-24">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#111111]">
                <LayoutDashboard className="h-5 w-5 text-[#555]" aria-hidden="true" />
              </div>
              <p className="font-['IBM_Plex_Mono'] text-sm text-[#898989]">No dashboards yet</p>
              <Link
                href="/create-dashboard"
                className="flex items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#5af0a8]"
              >
                <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Create your first dashboard
              </Link>
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
                  className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#111111] transition-all duration-200 hover:border-[#3d3d3d] hover:bg-[#141414]"
                >
                  {/* Card Header */}
                  <div className="px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className={status.className}>
                        <span className={status.dotClassName} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-1 font-['Space_Grotesk'] text-[18px] font-medium text-[#fafafa]">
                      {dashboard.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 font-['IBM_Plex_Mono'] text-[13px] text-[#898989]">
                      {dashboard.type} · {dashboard.description || "No description provided"}
                    </p>
                  </div>

                  {/* Stat cells */}
                  <div className="grid grid-cols-2 gap-px border-t border-[#2e2e2e] bg-[#2e2e2e]">
                    <div className="bg-[#111111] px-4 py-3">
                      <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[#555]">
                        Logs
                      </p>
                      <p className="font-['Space_Grotesk'] text-xl text-[#fafafa]">
                        {dashboard.total_logs_processed}
                      </p>
                    </div>
                    <div className="bg-[#111111] px-4 py-3">
                      <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[#555]">
                        Anomaly Rate
                      </p>
                      <p className={`font-['Space_Grotesk'] text-xl ${anomalyRateColor(dashboard.anomaly_rate)}`}>
                        {dashboard.anomaly_rate.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Last updated */}
                  <p className="border-t border-[#242424] px-4 py-2.5 font-['IBM_Plex_Mono'] text-[11px] text-[#555]">
                    Last updated: {new Date(dashboard.last_updated).toLocaleString()}
                  </p>

                  {/* Open Dashboard footer */}
                  <div className="mt-auto border-t border-[#242424] px-4 py-3 transition-colors duration-200 group-hover:bg-[#3ecf8e]/5">
                    <Link href={`/dashboard/${dashboard.id}`} className="flex items-center justify-between">
                      <span className="font-['IBM_Plex_Mono'] text-xs text-[#898989] transition-colors group-hover:text-[#3ecf8e]">
                        Open Dashboard
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#555] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#3ecf8e]" />
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
