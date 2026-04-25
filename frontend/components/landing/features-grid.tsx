"use client";

import { motion, useInView } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  BellRing,
  BrainCircuit,
  Gauge,
  LayoutDashboard,
} from "lucide-react";
import { useRef } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

type FeatureCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  visual?: React.ReactNode;
};

const sparkline = (path: string, id: string) => (
  <svg viewBox="0 0 180 48" className="h-12 w-full" role="img" aria-label="Sparkline chart">
    <path d="M4 44 H176" stroke="rgba(161,161,170,0.3)" strokeWidth="1" fill="none" />
    <path d={path} stroke={`url(#${id})`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <defs>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3ecf8e" />
        <stop offset="100%" stopColor="#8ef8c7" />
      </linearGradient>
    </defs>
  </svg>
);

const features: FeatureCard[] = [
  {
    title: "Anomaly Detection",
    description:
      "Isolation Forest + Autoencoder hybrid. Catches what rule-based systems miss.",
    icon: Activity,
    className: "lg:col-span-2",
    visual: (
      <div className="mt-6 rounded-xl border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>score</span>
          <span className="text-brand">0.94</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#1a1a1a]">
          <div
            className="h-full w-[94%] rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgba(62,207,142,0.5), rgba(62,207,142,0.85), #ff4d4f)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>0.0</span>
          <span>0.94</span>
        </div>
      </div>
    ),
  },
  {
    title: "NLP Embeddings",
    description:
      "sentence-transformers converts your logs into semantic vectors for deeper understanding.",
    icon: BrainCircuit,
  },
  {
    title: "Real-time Alerts",
    description:
      "Telegram, Email, and Slack notifications with deduplication and priority levels.",
    icon: BellRing,
  },
  {
    title: "Dashboard",
    description:
      "Drill-down analytics with live anomaly timeline, error trends, and service graphs.",
    icon: LayoutDashboard,
    className: "lg:col-span-2",
    visual: (
      <div className="mt-6 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
        {sparkline("M4 38 C24 38, 26 26, 44 26 C66 26, 70 40, 92 38 C118 36, 124 16, 150 14 C160 14, 168 18, 176 20", "spark-a")}
        {sparkline("M4 36 C24 34, 30 32, 46 34 C64 36, 74 22, 92 24 C118 26, 128 34, 150 30 C160 28, 168 24, 176 22", "spark-b")}
        {sparkline("M4 40 C24 38, 28 20, 48 18 C68 18, 74 34, 92 35 C112 36, 130 30, 150 24 C160 22, 170 18, 176 16", "spark-c")}
      </div>
    ),
  },
  {
    title: "Failure Prediction",
    description:
      "LSTM time-series model predicts CPU spikes and downtime before they happen.",
    icon: Gauge,
    className: "lg:col-span-2",
    visual: (
      <div className="mt-6 rounded-xl border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground">
        <p>Predicted outage window: 03m 12s</p>
        <p className="mt-1 text-brand">Confidence: 89%</p>
      </div>
    ),
  },
  {
    title: "Zero Cost",
    description: "100% open-source. Self-host on any machine. MIT licensed.",
    icon: BadgeCheck,
    visual: (
      <div className="mt-6 inline-flex items-center rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-xs text-brand">
        MIT
      </div>
    ),
  },
];

export function FeaturesGrid() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.section
      id="features"
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6"
    >
      <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Features
      </motion.p>
      <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-normal tracking-[-0.03em] md:text-5xl">
        Everything you need. Nothing you don&apos;t.
      </motion.h2>

      <motion.div variants={staggerContainer} className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              variants={fadeUpVariant}
              whileHover={{ y: -3, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
              className={`group relative overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] p-6 transition-all duration-300 hover:border-[#3ecf8e]/20 ${
                feature.className ?? ""
              }`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  boxShadow: "inset 0 0 40px rgba(62,207,142,0.04)",
                }}
              />

              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3ecf8e]/25 bg-[#3ecf8e]/10 text-[#3ecf8e] transition-all duration-300 group-hover:border-[#3ecf8e]/40 group-hover:bg-[#3ecf8e]/15">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-medium tracking-tight text-[#fafafa]">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#898989]">{feature.description}</p>
              {feature.visual}
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
