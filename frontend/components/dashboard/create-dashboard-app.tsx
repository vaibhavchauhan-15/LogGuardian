"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, PlusCircle } from "lucide-react";

import { type DashboardType, createDashboard } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";

const defaultSuggestions: Record<DashboardType, string> = {
  portfolio: "Personal Site Monitoring",
  ecommerce: "Checkout Failure Tracker",
  saas: "API Health Dashboard",
  api: "External API Reliability Guard",
};

const typeOptions: DashboardType[] = ["portfolio", "ecommerce", "saas", "api"];

export function CreateDashboardApp() {
  const [name, setName] = useState("");
  const [type, setType] = useState<DashboardType>("saas");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [feedback, setFeedback] = useState("");

  const suggestion = useMemo(() => defaultSuggestions[type], [type]);

  async function applySuggestion() {
    if (!name.trim()) {
      setName(suggestion);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        await resolveAndStoreUserContext();
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    void bootstrapSession();

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

  return (
    <div className="lg-shell">
      <main className="lg-section pt-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border shadow-none rounded-[12px] p-6 max-w-3xl"
        >
          <p className="lg-kicker">Create Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create Dashboard</h1>
          <p className="lg-subtle mt-3 text-sm">
            Every dashboard is a separate project boundary with isolated metrics and sessions.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block lg-subtle">Name</span>
              <input
                className="lg-input h-11"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Payments Reliability Radar"
                maxLength={120}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block lg-subtle">Type</span>
              <select
                className="lg-input h-11"
                value={type}
                onChange={(event) => setType(event.target.value as DashboardType)}
              >
                {typeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] lg-subtle">Auto suggestion</p>
              <p className="mt-2 text-sm">{suggestion}</p>
              <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void applySuggestion()}>
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Use Suggestion
              </Button>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block lg-subtle">Description</span>
              <textarea
                className="lg-input min-h-24 resize-y"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tracks API and runtime anomalies for production incidents."
                maxLength={400}
              />
            </label>

            {feedback ? <p className="rounded-xl border border-(--border) px-3 py-2 text-sm">{feedback}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={submitting || !authReady}>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                {submitting ? "Creating..." : authReady ? "Create Dashboard" : "Preparing Session..."}
              </Button>
              <Link href="/dashboard">
                <Button type="button" size="sm" variant="secondary">
                  Back to Dashboards
                </Button>
              </Link>
            </div>
          </form>
        </motion.section>
      </main>
    </div>
  );
}
