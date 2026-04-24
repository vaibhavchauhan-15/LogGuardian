"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  LineChart,
  Siren,
  TerminalSquare,
} from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

const STAGE_LABELS = ["Logs stream", "Pattern forms", "Anomaly detected", "Alert escalates"];

const LOG_LINES = [
  "11:07:11 edge-router INFO request /login 200",
  "11:07:12 auth-service INFO token minted for user 4382",
  "11:07:12 queue-service INFO batch=142 accepted",
  "11:07:13 worker-node INFO p95 latency 128ms",
  "11:07:14 auth-service WARN retrying read replica",
  "11:07:15 cache-layer INFO hit rate 96.2%",
  "11:07:16 payments INFO checkout request queued",
  "11:07:17 auth-service WARN saturation trend increasing",
  "11:07:18 model-service INFO baseline drift detected",
  "11:07:19 auth-service ERROR timeout spike +187%",
  "11:07:20 notifier INFO Slack + Telegram route selected",
  "11:07:21 incidents INFO grouped by fingerprint",
  "11:07:22 ops-bot INFO runbook patch/cache-timeout",
  "11:07:23 dashboard INFO critical timeline updated",
  "11:07:24 oncall INFO acknowledged in 24 seconds",
];

function trendPath() {
  return "M 8 80 C 24 76, 42 68, 58 63 C 72 58, 88 54, 102 49 C 116 45, 128 32, 142 24 C 154 18, 165 12, 174 10";
}

export function InteractiveDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const logsY = useTransform(scrollYProgress, [0, 1], [0, -420]);
  const anomalyGlow = useTransform(
    scrollYProgress,
    [0.32, 0.5, 0.72],
    ["rgba(114,188,255,0)", "rgba(114,188,255,0.26)", "rgba(114,188,255,0.12)"]
  );
  const anomalyBorder = useTransform(
    scrollYProgress,
    [0.33, 0.56],
    ["rgba(114,188,255,0.2)", "rgba(114,188,255,0.74)"]
  );

  const chartPathLength = useTransform(scrollYProgress, [0.12, 0.82], [0.04, 1]);
  const pulseOpacity = useTransform(scrollYProgress, [0.3, 0.54, 0.74], [0, 1, 0.4]);
  const pulseScale = useTransform(scrollYProgress, [0.32, 0.58], [0.88, 1.05]);

  const alertOpacity = useTransform(scrollYProgress, [0.66, 0.84], [0, 1]);
  const alertY = useTransform(scrollYProgress, [0.66, 0.84], [24, 0]);
  const actionOpacity = useTransform(scrollYProgress, [0.82, 0.98], [0.25, 1]);

  const timelineWidth = useTransform(scrollYProgress, [0.06, 0.96], ["6%", "100%"]);

  const scoreValue = useTransform(scrollYProgress, [0.06, 0.92], [0.18, 0.97]);
  const [scoreText, setScoreText] = useState("0.18");
  const [stage, setStage] = useState(0);

  useMotionValueEvent(scoreValue, "change", (latest) => {
    const clamped = Math.min(0.99, Math.max(0.08, latest));
    setScoreText(clamped.toFixed(2));
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25) {
      setStage(0);
      return;
    }
    if (latest < 0.5) {
      setStage(1);
      return;
    }
    if (latest < 0.75) {
      setStage(2);
      return;
    }
    setStage(3);
  });

  return (
    <section id="demo" className="lg-section pt-8">
      <div className="max-w-3xl">
        <p className="lg-eyebrow">Fullscreen Demo</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          Scroll once. Watch one anomaly get caught before users feel it.
        </h2>
      </div>

      <div ref={sectionRef} className="relative mt-8 h-[300vh]">
        <div className="sticky top-16">
          <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 md:px-8">
            <div className="bg-card border border-border shadow-none min-h-[84dvh] overflow-hidden rounded-none border-x-0 px-4 py-6 md:rounded-3xl md:border-x md:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2">
                {STAGE_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                      index <= stage
                        ? "border-[color-mix(in_oklab,var(--lg-accent-strong),transparent_30%)] bg-[color-mix(in_oklab,var(--lg-accent-soft),transparent_45%)] text-(--lg-text)"
                        : "border-(--border) text-(--muted-foreground)"
                    }`}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                      {index + 1}
                    </span>
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.22fr_0.88fr]">
                <article className="rounded-2xl border border-(--border) bg-[color-mix(in_oklab,var(--card),transparent_14%)] p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-(--muted-foreground)">
                      <TerminalSquare className="h-4 w-4 text-(--lg-accent-strong)" aria-hidden="true" />
                      Real-time event stream
                    </span>
                    <span className="rounded-full border border-(--border) px-2 py-1 text-xs text-(--muted-foreground)">
                      websocket
                    </span>
                  </div>

                  <div className="relative h-[50dvh] min-h-72 overflow-hidden rounded-xl border border-(--border) bg-[#041124]/75 p-3">
                    <motion.div style={{ y: logsY }} className="space-y-2">
                      {LOG_LINES.map((line, index) => {
                        const isAnomaly = index === 9;
                        return (
                          <motion.p
                            key={line}
                            style={isAnomaly ? { backgroundColor: anomalyGlow, borderColor: anomalyBorder } : undefined}
                            className={`rounded-lg border border-transparent px-3 py-2 font-mono text-xs md:text-[13px] ${
                              isAnomaly ? "text-[#d8edff]" : "text-[#a1bfde]"
                            }`}
                          >
                            {line}
                          </motion.p>
                        );
                      })}
                    </motion.div>
                  </div>
                </article>

                <div className="space-y-5">
                  <article className="rounded-2xl border border-(--border) bg-[color-mix(in_oklab,var(--card),transparent_8%)] p-4 md:p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-(--muted-foreground)">
                        <LineChart className="h-4 w-4 text-(--lg-accent-strong)" aria-hidden="true" />
                        Model confidence
                      </span>
                      <span className="text-xl font-semibold text-(--lg-accent-strong)">{scoreText}</span>
                    </div>

                    <div className="relative mt-4 rounded-xl border border-(--border) bg-[#06162c]/75 p-3">
                      <motion.div
                        style={{ opacity: pulseOpacity, scale: pulseScale }}
                        className="pointer-events-none absolute right-8 top-4 h-16 w-16 rounded-full border border-[rgba(114,188,255,0.65)]"
                      />

                      <svg viewBox="0 0 180 92" className="h-24 w-full" role="img" aria-label="Anomaly confidence chart">
                        <path d="M 8 80 H 174" stroke="rgba(149,170,204,0.32)" strokeWidth="1.5" fill="none" />
                        <motion.path
                          d={trendPath()}
                          stroke="url(#demoGradientStrong)"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          style={{ pathLength: chartPathLength }}
                        />
                        <defs>
                          <linearGradient id="demoGradientStrong" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3fd5b9" />
                            <stop offset="100%" stopColor="#72bcff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </article>

                  <motion.article
                    style={{ opacity: alertOpacity, y: alertY }}
                    className="rounded-2xl border border-[color-mix(in_oklab,var(--lg-accent-strong),transparent_34%)] bg-[color-mix(in_oklab,var(--lg-accent-soft),transparent_40%)] p-4 md:p-5"
                  >
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--lg-accent-strong)">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      Alert escalated
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">Critical auth-service timeout anomaly</h3>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-(--muted-foreground)">
                        <Siren className="h-4 w-4" aria-hidden="true" />
                        Slack + Telegram + Email
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-(--lg-accent-strong)">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Sent
                      </span>
                    </div>
                  </motion.article>

                  <motion.article
                    style={{ opacity: actionOpacity }}
                    className="rounded-2xl border border-(--border) bg-[color-mix(in_oklab,var(--card),transparent_8%)] p-4 md:p-5"
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-(--muted-foreground)">
                      <Bot className="h-4 w-4 text-(--lg-accent-strong)" aria-hidden="true" />
                      Recommended next action
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-(--muted-foreground)">
                      Scale read replicas and push retry backoff before latency spills into checkout.
                    </p>
                  </motion.article>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-1 w-full rounded-full bg-[color-mix(in_oklab,var(--border),transparent_10%)]">
                  <motion.div
                    style={{ width: timelineWidth }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--lg-accent),var(--lg-accent-strong))]"
                  />
                </div>
                <p className="lg-subtle mt-2 text-xs uppercase tracking-[0.12em]">Demo scroll progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
