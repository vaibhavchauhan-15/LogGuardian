"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, PlusCircle, RefreshCcw, ServerCrash, LogIn } from "lucide-react";

import { type DashboardSummary, listDashboards } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { AppHeader } from "@/components/app-header";
import { DashboardCardSkeleton } from "@/components/dashboard/skeletons";

type LoadError = {
  title: string;
  detail: string;
  isAuth: boolean;
};

function classifyError(error: unknown): LoadError {
  const message = error instanceof Error ? error.message : "Unable to load dashboards";

  if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
    return {
      title: "Sign in required",
      detail: "Please sign in with Google to view your monitoring workspaces.",
      isAuth: true,
    };
  }

  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.toLowerCase().includes("fetch")
  ) {
    return {
      title: "Can't reach the server",
      detail:
        "The LogGuardian API isn't responding. Make sure the backend is running, then try again.",
      isAuth: false,
    };
  }

  return {
    title: "Something went wrong",
    detail: message,
    isAuth: false,
  };
}

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
  const [error, setError] = useState<LoadError | null>(null);

  const criticalCount = useMemo(
    () => dashboards.filter((d) => d.status === "critical").length,
    [dashboards]
  );

  const loadDashboards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await resolveAndStoreUserContext();
      const response = await listDashboards();
      setDashboards(response.items);
    } catch (err) {
      setError(classifyError(err));
      setDashboards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />

      <main>
        {/* ── Hero Band ── */}
        <section className="w-full border-b border-[var(--border)] bg-[var(--card)] px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: kicker + title + description */}
            <div className="flex-1 min-w-0">
              <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[1.5px] text-[var(--muted-foreground)]">
                Project Dashboards
              </p>
              <h1 className="mt-3 font-['Space_Grotesk'] text-[32px] font-normal leading-tight tracking-[-0.5px] text-[var(--foreground)]">
                Isolated Monitoring Workspaces
              </h1>
              <p className="mt-1.5 max-w-[560px] font-['IBM_Plex_Mono'] text-sm text-[var(--muted-foreground)]">
                Each dashboard is a strict analytics boundary. Logs and metrics never mix across projects.
              </p>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                id="refresh-dashboards-btn"
                type="button"
                onClick={() => void loadDashboards()}
                className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 font-['IBM_Plex_Mono'] text-sm font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)] disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                Refresh
              </button>
              <Link
                id="create-dashboard-btn"
                href="/create-dashboard"
                className="focus-ring flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors duration-150 hover:bg-[#5af0a8]"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Create Dashboard
              </Link>
            </div>
          </div>

          {/* Stat grid */}
          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
            <div className="bg-[var(--card)] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[var(--muted-foreground)]">
                Total Dashboards
              </p>
              <p className="font-['Space_Grotesk'] text-3xl font-light text-[var(--foreground)]">
                {loading ? <span className="skeleton inline-block h-8 w-8 rounded" /> : dashboards.length}
              </p>
            </div>

            <div className="bg-[var(--card)] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[var(--muted-foreground)]">
                Critical Projects
              </p>
              <p className="flex items-center gap-2 font-['Space_Grotesk'] text-3xl font-light text-[var(--foreground)]">
                {!loading && criticalCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" aria-hidden="true" />
                )}
                {loading ? <span className="skeleton inline-block h-8 w-8 rounded" /> : criticalCount}
              </p>
            </div>

            <div className="bg-[var(--card)] px-6 py-5">
              <p className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[1.5px] text-[var(--muted-foreground)]">
                Isolation Model
              </p>
              <p className="font-['IBM_Plex_Mono'] text-sm text-[var(--muted-foreground)]">user_id + dashboard_id</p>
            </div>
          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3 lg:p-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => <DashboardCardSkeleton key={idx} />)
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-20 text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                  error.isAuth
                    ? "border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]"
                    : "border-red-900/50 bg-red-950/30 text-red-400"
                }`}
              >
                {error.isAuth ? (
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ServerCrash className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-['Space_Grotesk'] text-lg font-medium text-[var(--foreground)]">
                  {error.title}
                </h3>
                <p className="mx-auto max-w-sm font-['IBM_Plex_Mono'] text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  {error.detail}
                </p>
              </div>
              {error.isAuth ? (
                <Link
                  href="/signin?next=/dashboard"
                  className="focus-ring flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors duration-150 hover:bg-[#5af0a8]"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void loadDashboards()}
                  className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 font-['IBM_Plex_Mono'] text-sm font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)]"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
              )}
            </div>
          ) : dashboards.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)]">
                <LayoutDashboard className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-['Space_Grotesk'] text-lg font-medium text-[var(--foreground)]">
                  No dashboards yet
                </h3>
                <p className="mx-auto max-w-sm font-['IBM_Plex_Mono'] text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  Create your first monitoring workspace to start ingesting logs and detecting anomalies.
                </p>
              </div>
              <Link
                href="/create-dashboard"
                className="focus-ring flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors duration-150 hover:bg-[#5af0a8]"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
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
                  className="lg-card-hover group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
                >
                  {/* Card Header */}
                  <div className="px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className={status.className}>
                        <span className={status.dotClassName} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-1 font-['Space_Grotesk'] text-[18px] font-medium text-[var(--foreground)]">
                      {dashboard.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 font-['IBM_Plex_Mono'] text-[13px] text-[var(--muted-foreground)]">
                      {dashboard.type} · {dashboard.description || "No description provided"}
                    </p>
                  </div>

                  {/* Stat cells */}
                  <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)]">
                    <div className="bg-[var(--card)] px-4 py-3">
                      <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                        Logs
                      </p>
                      <p className="font-['Space_Grotesk'] text-xl text-[var(--foreground)]">
                        {dashboard.total_logs_processed.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-[var(--card)] px-4 py-3">
                      <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                        Anomaly Rate
                      </p>
                      <p className={`font-['Space_Grotesk'] text-xl ${anomalyRateColor(dashboard.anomaly_rate)}`}>
                        {dashboard.anomaly_rate.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Last updated */}
                  <p className="border-t border-[var(--border)] px-4 py-2.5 font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted-foreground)]">
                    Last updated: {new Date(dashboard.last_updated).toLocaleString()}
                  </p>

                  {/* Open Dashboard footer */}
                  <div className="mt-auto border-t border-[var(--border)] px-4 py-3 transition-colors duration-200 group-hover:bg-[#3ecf8e]/5">
                    <Link href={`/dashboard/${dashboard.id}`} className="flex items-center justify-between">
                      <span className="font-['IBM_Plex_Mono'] text-xs text-[var(--muted-foreground)] transition-colors group-hover:text-[#3ecf8e]">
                        Open Dashboard
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#3ecf8e]" />
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
