"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertCircle, Loader2, Radio, ShieldAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type DemoLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
type DemoClass = "normal" | "suspicious" | "critical";

interface DemoLog {
  id: string;
  ts: string;
  service: string;
  level: DemoLevel;
  message: string;
  classification: DemoClass;
  score: number;
}

// ─── Demo data pool ───────────────────────────────────────────────────────────
const DEMO_POOL: Omit<DemoLog, "id" | "ts">[] = [
  { service: "api-gateway",     level: "INFO",     message: "POST /v1/orders 201 — 48ms",                              classification: "normal",     score: 0.03 },
  { service: "auth-service",    level: "WARN",     message: "Rate limit threshold 85% for IP 10.0.4.22",               classification: "suspicious", score: 0.61 },
  { service: "payment-svc",     level: "ERROR",    message: "Stripe charge failed: card_declined — order #8821",        classification: "suspicious", score: 0.74 },
  { service: "db-replica",      level: "INFO",     message: "Replication lag 12 ms — within SLA",                      classification: "normal",     score: 0.05 },
  { service: "ml-pipeline",     level: "DEBUG",    message: "Feature extraction complete — 1 024 vectors",              classification: "normal",     score: 0.02 },
  { service: "cache-layer",     level: "WARN",     message: "Redis eviction rate spike: 4.2k keys/s",                  classification: "suspicious", score: 0.58 },
  { service: "payment-svc",     level: "CRITICAL", message: "Repeated fraud pattern detected — transaction blocked",    classification: "critical",   score: 0.94 },
  { service: "api-gateway",     level: "ERROR",    message: "Upstream timeout after 30 000 ms — /v1/reports",          classification: "suspicious", score: 0.77 },
  { service: "auth-service",    level: "INFO",     message: "OAuth token issued — user:g9a2j@example.com",             classification: "normal",     score: 0.04 },
  { service: "log-ingestor",    level: "INFO",     message: "Batch ingested 512 records — 98 ms processing",           classification: "normal",     score: 0.01 },
  { service: "anomaly-engine",  level: "WARN",     message: "Model confidence < 0.40 on service 'payments'",           classification: "suspicious", score: 0.55 },
  { service: "scheduler",       level: "CRITICAL", message: "Worker pool exhausted — 0 idle workers remain",           classification: "critical",   score: 0.91 },
  { service: "db-primary",      level: "ERROR",    message: "Deadlock detected — query rolled back after 3 retries",   classification: "critical",   score: 0.88 },
  { service: "api-gateway",     level: "INFO",     message: "GET /healthz 200 — 3 ms",                                 classification: "normal",     score: 0.01 },
  { service: "notification-svc",level: "WARN",     message: "SendGrid bounce rate 3.1% — above baseline",              classification: "suspicious", score: 0.62 },
];

const MAX_ROWS  = 8;
const ROW_H     = 54; // px — fixed row height
const LOOP_INTERVAL_MS = 900;
const DEMO_BASE_TS = Date.UTC(2026, 0, 1, 4, 3, 31);

function mkLog(
  seed: Omit<DemoLog, "id" | "ts">,
  id: string,
  tsMs: number
): DemoLog {
  return { ...seed, id, ts: new Date(tsMs).toISOString() };
}

function initialLogs(): DemoLog[] {
  return Array.from({ length: MAX_ROWS }, (_, i) => {
    const seed = DEMO_POOL[i % DEMO_POOL.length];
    const tsMs = DEMO_BASE_TS - i * 2000;
    return mkLog(seed, `seed-${i}`, tsMs);
  });
}

// ─── Always-dark colour helpers ───────────────────────────────────────────────
function lvlColor(l: DemoLevel) {
  if (l === "CRITICAL") return "#f87171";
  if (l === "ERROR")    return "#fc8181";
  if (l === "WARN")     return "#fbbf24";
  if (l === "DEBUG")    return "#6b7280";
  return "#34d399"; // INFO
}
function chipStyle(c: DemoClass): { bg: string; text: string } {
  if (c === "critical")   return { bg: "rgba(239,68,68,0.18)",   text: "#fca5a5" };
  if (c === "suspicious") return { bg: "rgba(251,191,36,0.16)",  text: "#fcd34d" };
  return                         { bg: "rgba(52,211,153,0.16)",  text: "#6ee7b7" };
}
function barColor(c: DemoClass) {
  if (c === "critical")   return "#ef4444";
  if (c === "suspicious") return "#f59e0b";
  return "#10b981";
}

// ─── Terminal (always dark regardless of app theme) ──────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DUR = 0.38;

function DemoLogTerminal() {
  const [logs, setLogs] = useState<DemoLog[]>(() => initialLogs());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idxRef = useRef(MAX_ROWS);
  const tickRef = useRef(0);

  useEffect(() => {
    function next() {
      timerRef.current = setTimeout(() => {
        const nextIdx = idxRef.current++;
        const seed = DEMO_POOL[nextIdx % DEMO_POOL.length];
        const tsMs = DEMO_BASE_TS + tickRef.current * 2000;
        const nextLog = mkLog(seed, `live-${nextIdx}`, tsMs);
        tickRef.current += 1;
        setLogs(prev => [nextLog, ...prev].slice(0, MAX_ROWS));
        next();
      }, LOOP_INTERVAL_MS);
    }
    next();
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    /* Force dark background with hardcoded colours — theme-independent */
    <div className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "#0d1117", border: "1px solid rgba(122,175,229,0.18)" }}>

      {/* Chrome bar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(122,175,229,0.12)" }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 animate-pulse" style={{ color: "#34d399" }} />
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#34d399" }}>
            live · anomaly feed
          </span>
        </div>
        <span className="font-mono text-[10px]" style={{ color: "#6b7280" }}>logguardian/stream</span>
      </div>

      {/* Fixed-height rows */}
      <div style={{ height: MAX_ROWS * ROW_H, overflow: "hidden" }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {logs.map(log => {
            const pct   = Math.round(log.score * 100);
            const bc    = barColor(log.classification);
            const chip  = chipStyle(log.classification);
            return (
              <motion.div key={log.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: ROW_H, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR, ease: EASE }}
                style={{ overflow: "hidden", willChange: "height,opacity" }}>
                <div className="relative flex flex-col justify-center gap-1 px-4"
                  style={{ height: ROW_H, borderBottom: "1px solid rgba(122,175,229,0.07)" }}>

                  {/* left accent */}
                  <span className="absolute inset-y-0 left-0 w-0.5 rounded-r" style={{ background: bc, opacity: 0.6 }} />

                  {/* top row */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: "#6b7280" }}>
                        {log.ts.slice(11, 19)}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] font-semibold" style={{ color: lvlColor(log.level) }}>
                        {log.level}
                      </span>
                      <span className="truncate font-mono text-[11px]" style={{ color: "#9ca3af" }}>
                        {log.service}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                      style={{ background: chip.bg, color: chip.text }}>
                      {log.classification}
                    </span>
                  </div>

                  {/* bottom row */}
                  <div className="flex items-center gap-3 min-w-0">
                    <p className="flex-1 truncate font-mono text-[11px]" style={{ color: "rgba(226,232,240,0.6)" }}>
                      {log.message}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="h-1 w-12 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bc }} />
                      </div>
                      <span className="w-6 text-right font-mono text-[9px] tabular-nums" style={{ color: "#6b7280" }}>
                        {log.score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
        style={{ background: "linear-gradient(to top, #0d1117, transparent)" }} />
    </div>
  );
}

// ─── Main sign-in page ────────────────────────────────────────────────────────
const STATS = [
  { label: "Anomaly Engine", value: "Hybrid ML"  },
  { label: "Realtime Feed",  value: "WebSocket"  },
  { label: "Detection Rate", value: "99.2%"      },
];

export function SignInExperience() {
  const prefersReducedMotion = useReducedMotion();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const rawOauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const authEnabled = Boolean(supabaseUrl && supabaseKey);

  const oauthErrorMessage = rawOauthError?.includes("No API key found")
    ? "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    : rawOauthError;

  const handleGoogleSignIn = async () => {
    if (!authEnabled || isSigningIn) return;
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const supabase  = createClient();
      const next      = searchParams.get("next") ?? "/dashboard";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: { access_type: "offline", prompt: "consent" } },
      });
      if (error) { setErrorMessage(error.message); setIsSigningIn(false); }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-3rem)] bg-background overflow-auto flex items-center justify-center px-4 py-8 md:py-10">

      {/* Ambient blobs */}
      <motion.div aria-hidden className="pointer-events-none absolute -left-32 top-[-20%] h-[55dvh] w-[60vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle,rgba(62,207,142,0.16),transparent 60%)" }}
        animate={prefersReducedMotion ? undefined : { x: [0,22,-10,0], y: [0,14,-8,0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -right-32 bottom-[-20%] h-[55dvh] w-[60vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle,rgba(114,188,255,0.18),transparent 62%)" }}
        animate={prefersReducedMotion ? undefined : { x: [0,-18,8,0], y: [0,-12,10,0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      {/* Grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "linear-gradient(rgba(115,170,230,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(115,170,230,0.2) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <motion.section
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
        animate={prefersReducedMotion ? undefined : { borderColor: isSigningIn ? "rgba(114,188,255,0.45)" : undefined }}
        transition={{ duration: 0.3 }}>

        {/* inner glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ background: "radial-gradient(circle at 90% 8%,rgba(114,188,255,0.12) 0%,transparent 42%),radial-gradient(circle at 8% 92%,rgba(62,207,142,0.1) 0%,transparent 36%)" }} />

        {/* ── 2-col grid ─────────────────────────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_1.35fr] gap-0">

          {/* ── LEFT: branding + CTA ─────────────────────────────────────── */}
          <div className="flex flex-col justify-between p-8 md:p-10 md:border-r border-border">

            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-[#3ecf8e]" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">LogGuardian</span>
                </div>
                <span className="rounded-full border border-[rgba(62,207,142,0.35)] bg-[rgba(62,207,142,0.08)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#3ecf8e]">
                  v1.0
                </span>
              </div>

              <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Sign in to<br />LogGuardian
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Monitor logs, detect anomalies, and respond faster — in real time.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-3 md:mt-auto md:pt-8">
              {STATS.map(({ label, value }) => (
                <div key={label}
                  className="rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-1.5 font-mono text-sm font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {(errorMessage ?? oauthErrorMessage) && (
                <motion.div key="err"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
                  role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage ?? oauthErrorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA — custom button, always visible on both themes */}
            <div className="mt-5">
              <motion.div
                whileHover={!isSigningIn && authEnabled && !prefersReducedMotion ? { scale: 1.015 } : undefined}
                whileTap={!isSigningIn && authEnabled && !prefersReducedMotion ? { scale: 0.985 } : undefined}>
                <button
                  id="google-signin-btn"
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={!authEnabled || isSigningIn}
                  className="relative w-full overflow-hidden rounded-full disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ecf8e]"
                  style={{
                    background: "linear-gradient(135deg,#1a73e8 0%,#0d5bca 100%)",
                    boxShadow: "0 2px 16px rgba(26,115,232,0.45), 0 1px 3px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Subtle shine overlay */}
                  <span className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.14) 0%,transparent 60%)" }} />

                  <span className="relative flex h-12 items-center justify-center gap-3 px-6">
                    {isSigningIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#fff" }} />
                        <span className="text-sm font-semibold" style={{ color: "#fff" }}>Signing in…</span>
                      </>
                    ) : (
                      <>
                        {/* Google G */}
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </span>
                        <span className="text-sm font-semibold tracking-wide" style={{ color: "#fff" }}>Continue with Google</span>
                      </>
                    )}
                  </span>
                </button>
              </motion.div>

              {authEnabled ? (
                <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
                  Secured by Supabase Auth · No password required
                </p>
              ) : null}
            </div>
          </div>

          {/* ── RIGHT: always-dark terminal ─────────────────────────────── */}
          <div className="p-6 md:p-8 flex flex-col" style={{ background: "rgba(13,17,23,0.6)" }}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
              Live anomaly stream · demo
            </p>
            <div className="flex-1">
              <DemoLogTerminal />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
