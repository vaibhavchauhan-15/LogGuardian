"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Lightbulb, PlusCircle } from "lucide-react";

import { type DashboardType, createDashboard } from "@/lib/api";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

const defaultSuggestions: Record<DashboardType, string> = {
  portfolio: "Personal Site Monitoring",
  ecommerce: "Checkout Failure Tracker",
  saas: "API Health Dashboard",
  api: "External API Reliability Guard",
};

const typeOptions: DashboardType[] = ["portfolio", "ecommerce", "saas", "api"];

function formatTypeLabel(value: DashboardType) {
  if (value === "saas") {
    return "Saas";
  }
  if (value === "api") {
    return "Api";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function CreateDashboardApp() {
  const [name, setName] = useState("");
  const [type, setType] = useState<DashboardType>("saas");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

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

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setTypeMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      showToast({
        type: "error",
        title: "Dashboard name is required",
      });
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

      showToast({
        type: "success",
        title: "Dashboard created successfully",
      });
      window.location.assign(`/dashboard/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create dashboard";
      if (message.includes("Missing user identity") || message.includes("Missing X-User-Id")) {
        showToast({
          type: "error",
          title: "Please sign in before creating dashboards",
        });
        return;
      }
      showToast({
        type: "error",
        title: "Unable to create dashboard",
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card p-6 md:p-8"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
            Create Workspace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Create Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Every dashboard is a separate project boundary with isolated metrics and sessions.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block font-medium text-muted-foreground">Name</span>
                <input
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/60"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Payments Reliability Radar"
                  maxLength={120}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-medium text-muted-foreground">Type</span>
                <div className="relative" ref={typeMenuRef}>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={typeMenuOpen}
                    onClick={() => setTypeMenuOpen((prev) => !prev)}
                    className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition hover:border-brand/50 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span>{formatTypeLabel(type)}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${typeMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {typeMenuOpen ? (
                    <ul
                      role="listbox"
                      aria-label="Dashboard type"
                      className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card"
                    >
                      {typeOptions.map((value) => {
                        const isSelected = value === type;

                        return (
                          <li key={value} role="option" aria-selected={isSelected}>
                            <button
                              type="button"
                              onClick={() => {
                                setType(value);
                                setTypeMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition ${
                                isSelected
                                  ? "bg-brand/20 text-foreground"
                                  : "text-foreground hover:bg-brand/10 hover:text-brand"
                              }`}
                            >
                              <span>{formatTypeLabel(value)}</span>
                              {isSelected ? <Check className="h-4 w-4 text-brand" aria-hidden="true" /> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Auto Suggestion</p>
              <p className="mt-2 text-sm text-foreground">{suggestion}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => void applySuggestion()}
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Use Suggestion
              </Button>
            </div>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-muted-foreground">Description</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/60"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tracks API and runtime anomalies for production incidents."
                maxLength={400}
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                variant="default"
                className="h-10 gap-2 rounded-lg bg-[#3ecf8e] px-4 py-2 text-sm font-semibold text-[#0a0a0a] hover:bg-[#5af0a8]"
                disabled={submitting || !authReady}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                {submitting ? "Creating..." : authReady ? "Create Dashboard" : "Preparing Session..."}
              </Button>
              <Button
                asChild
                type="button"
                size="sm"
                variant="secondary"
                className="h-10 rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Link href="/dashboard">
                  Back to Dashboards
                </Link>
              </Button>
            </div>
          </form>
        </motion.section>
      </main>
    </div>
  );
}
