"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Lightbulb,
  Loader2,
  PlusCircle,
  Server,
  ShoppingCart,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import { type DashboardType, createDashboard } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";

type TypeMeta = { label: string; description: string; icon: LucideIcon; suggestion: string };

const TYPE_META: Record<DashboardType, TypeMeta> = {
  saas: {
    label: "SaaS Application",
    description: "API health, latency & error rates",
    icon: Server,
    suggestion: "API Health Dashboard",
  },
  api: {
    label: "API Service",
    description: "External API reliability & uptime",
    icon: Webhook,
    suggestion: "External API Reliability Guard",
  },
  ecommerce: {
    label: "E-Commerce",
    description: "Checkout, payments & cart flows",
    icon: ShoppingCart,
    suggestion: "Checkout Failure Tracker",
  },
  portfolio: {
    label: "Portfolio",
    description: "Lightweight personal-site monitoring",
    icon: Globe,
    suggestion: "Personal Site Monitoring",
  },
};

const typeOrder: DashboardType[] = ["saas", "api", "ecommerce", "portfolio"];

export function CreateDashboardApp() {
  const [name, setName] = useState("");
  const [type, setType] = useState<DashboardType>("saas");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [feedback, setFeedback] = useState("");

  const suggestion = useMemo(() => TYPE_META[type].suggestion, [type]);
  const isError = feedback !== "" && !feedback.toLowerCase().includes("success");
  const previewName = name.trim() || suggestion;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await resolveAndStoreUserContext();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!name.trim()) {
      setFeedback("Dashboard name is required.");
      return;
    }

    try {
      setSubmitting(true);
      await resolveAndStoreUserContext();
      const created = await createDashboard({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      });
      setFeedback("Dashboard created successfully.");
      window.location.assign(`/dashboard/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create dashboard";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        setFeedback("Please sign in before creating dashboards.");
        return;
      }
      setFeedback(message);
    } finally {
      setSubmitting(false);
    }
  }

  const PreviewIcon = TYPE_META[type].icon;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
      <Link
        href="/dashboard"
        className="focus-ring inline-flex items-center gap-1.5 rounded-md font-['IBM_Plex_Mono'] text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Dashboards
      </Link>

      <header className="mt-5">
        <p className="lg-kicker">Create Workspace</p>
        <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Create Dashboard
        </h1>
        <p className="lg-subtle mt-2 max-w-xl text-sm">
          Every dashboard is an isolated project boundary — logs, metrics, and anomaly models never
          mix across workspaces.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7"
        >
          {/* Name */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Dashboard name
            </span>
            <input
              className="lg-input h-11 font-sans"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Payments Reliability Radar"
              maxLength={120}
              autoFocus
              required
            />
            <span className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => !name.trim() && setName(suggestion)}
                className="focus-ring inline-flex items-center gap-1 rounded font-['IBM_Plex_Mono'] text-[11px] text-[var(--brand)] transition-opacity hover:opacity-80"
              >
                <Lightbulb className="h-3 w-3" aria-hidden="true" />
                Suggest: {suggestion}
              </button>
              <span className="font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted-foreground)]">
                {name.length}/120
              </span>
            </span>
          </label>

          {/* Type selector */}
          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium text-[var(--foreground)]">Project type</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {typeOrder.map((value) => {
                const meta = TYPE_META[value];
                const Icon = meta.icon;
                const selected = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    data-selected={selected}
                    aria-pressed={selected}
                    className="lg-option focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        className={`h-4 w-4 ${selected ? "text-[var(--brand)]" : "text-[var(--muted-foreground)]"}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-[var(--foreground)]">{meta.label}</span>
                      {selected && (
                        <CheckCircle2 className="ml-auto h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
                      )}
                    </span>
                    <span className="font-['IBM_Plex_Mono'] text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Description */}
          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Description <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
            </span>
            <textarea
              className="lg-input min-h-24 resize-y font-sans"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tracks API and runtime anomalies for production incidents."
              maxLength={400}
            />
          </label>

          {/* Feedback */}
          {feedback ? (
            <div
              className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                isError
                  ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                  : "border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand-accent)]"
              }`}
              role={isError ? "alert" : "status"}
            >
              {isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{feedback}</span>
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button type="submit" disabled={submitting || !authReady} className="focus-ring">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Creating…" : authReady ? "Create Dashboard" : "Preparing…"}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="secondary" className="focus-ring">
                Cancel
              </Button>
            </Link>
          </div>
        </motion.form>

        {/* ── Live preview + info ──────────────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="space-y-4"
        >
          <div>
            <p className="lg-kicker mb-2">Preview</p>
            {/* Mirrors the real dashboard card so users see what they're creating. */}
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="px-4 pb-3 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#3ecf8e]/20 bg-[#3ecf8e]/10 px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium text-[#3ecf8e]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" aria-hidden="true" />
                  healthy
                </span>
                <h3 className="mt-3 flex items-center gap-2 font-['Space_Grotesk'] text-[18px] font-medium text-[var(--foreground)]">
                  <PreviewIcon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                  <span className="line-clamp-1">{previewName}</span>
                </h3>
                <p className="mt-1 line-clamp-2 font-['IBM_Plex_Mono'] text-[13px] text-[var(--muted-foreground)]">
                  {type} · {description.trim() || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)]">
                <div className="bg-[var(--card)] px-4 py-3">
                  <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                    Logs
                  </p>
                  <p className="font-['Space_Grotesk'] text-xl text-[var(--foreground)]">0</p>
                </div>
                <div className="bg-[var(--card)] px-4 py-3">
                  <p className="mb-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                    Anomaly Rate
                  </p>
                  <p className="font-['Space_Grotesk'] text-xl text-[#3ecf8e]">0.00%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
            <p className="lg-kicker mb-3">What you get</p>
            <ul className="space-y-2.5">
              {[
                "Isolated anomaly model per workspace",
                "Real-time WebSocket log streaming",
                "Hybrid ML + security-rule detection",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3ecf8e]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.aside>
      </div>
    </main>
  );
}
