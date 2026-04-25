"use client";

import { motion, useInView } from "framer-motion";
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

export function AnomalyShowcase() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 md:px-6 lg:grid-cols-2 lg:items-center"
    >
      <div>
        <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Anomaly Detection
        </motion.p>
        <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-normal tracking-[-0.03em] md:text-5xl">
          Catch the exact moment things go wrong.
        </motion.h2>
        <motion.p variants={fadeUpVariant} className="mt-5 max-w-xl text-muted-foreground md:text-lg">
          LogGuardian assigns every log an anomaly score from 0 to 1.
          <br />
          When patterns deviate from baseline, you know instantly - with full context, not just a raw alert.
        </motion.p>
      </div>

      <motion.article
        variants={fadeUpVariant}
        className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
      >
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Live anomaly timeline</p>

          <svg viewBox="0 0 360 130" className="mt-3 h-36 w-full" role="img" aria-label="Anomaly spike chart">
            <path d="M 8 112 H 352" stroke="rgba(161,161,170,0.35)" strokeWidth="1.5" fill="none" />
            <motion.path
              d="M 8 98 C 70 98, 124 97, 188 96 C 218 95, 234 94, 248 93 C 258 92, 268 90, 278 78 C 288 66, 296 42, 306 24 C 320 8, 336 10, 352 22"
              stroke="url(#anomalyLine)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
            <defs>
              <linearGradient id="anomalyLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3ecf8e" />
                <stop offset="100%" stopColor="#ff6b6b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
          <span className="rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-brand">Score: 0.94</span>
          <span className="rounded-full border border-red-400/35 bg-red-400/10 px-3 py-1 text-red-300">Level: CRITICAL</span>
          <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-muted-foreground">Service: db-primary</span>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-[#0d0d0d] p-4 font-mono text-xs leading-relaxed text-zinc-300">
          <p className="border-l-2 border-brand pl-3 text-brand">AI Insight</p>
          <p className="mt-2">Root cause: DB connection pool exhausted (pool_size=10, active=10)</p>
          <p className="mt-1 text-zinc-400">Recommendation: Scale pool or restart service.</p>
        </div>
      </motion.article>
    </motion.section>
  );
}
