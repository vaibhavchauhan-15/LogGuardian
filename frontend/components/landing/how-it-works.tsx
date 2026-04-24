"use client";

import { motion, useInView } from "framer-motion";
import { ArrowDownToLine, BellRing, BrainCircuit, ScanSearch } from "lucide-react";
import { useRef } from "react";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const steps = [
  {
    id: "01",
    title: "INGEST",
    description: "Upload via API, file, or stream",
    icon: ArrowDownToLine,
  },
  {
    id: "02",
    title: "EMBED",
    description: "NLP converts logs to vectors",
    icon: BrainCircuit,
  },
  {
    id: "03",
    title: "DETECT",
    description: "Isolation Forest + Autoencoder scores anomalies",
    icon: ScanSearch,
  },
  {
    id: "04",
    title: "ALERT",
    description: "Telegram, email, Slack notified instantly",
    icon: BellRing,
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      id="architecture"
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6"
    >
      <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        How It Works
      </motion.p>
      <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
        From raw logs to instant alerts.
      </motion.h2>
      <motion.p variants={fadeUpVariant} className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
        A four-stage pipeline that processes, understands, and acts on your logs in real time.
      </motion.p>

      <div className="relative mt-12">
        <div className="pointer-events-none absolute left-8 right-8 top-9 hidden h-px bg-linear-to-r from-brand/0 via-brand/50 to-brand/0 lg:block" />

        <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.id}
                variants={fadeUpVariant}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-xl border border-border bg-card p-6"
              >
                <p className="pointer-events-none absolute right-4 top-3 font-mono text-5xl leading-none text-brand/20">
                  {step.id}
                </p>

                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="mt-6 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
