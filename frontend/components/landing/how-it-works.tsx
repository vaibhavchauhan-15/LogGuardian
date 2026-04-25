"use client";

import { motion, useInView } from "framer-motion";
import { ArrowDownToLine, BellRing, BrainCircuit, ScanSearch } from "lucide-react";
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
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.section
      id="architecture"
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6"
    >
      <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        How It Works
      </motion.p>
      <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-normal tracking-[-0.03em] md:text-5xl">
        From raw logs to instant alerts.
      </motion.h2>
      <motion.p variants={fadeUpVariant} className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
        A four-stage pipeline that processes, understands, and acts on your logs in real time.
      </motion.p>

      <div className="relative mt-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[12%] right-[12%] top-10 hidden h-px lg:block"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(62,207,142,0.3) 20%, rgba(62,207,142,0.3) 80%, transparent 100%)",
          }}
        />

        <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.id}
                variants={fadeUpVariant}
                whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
                className="group relative overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-6 transition-colors duration-300 hover:border-[#3ecf8e]/20 hover:bg-[#111111]"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 0%, rgba(62,207,142,0.05), transparent 60%)",
                  }}
                />

                <p className="pointer-events-none absolute right-4 top-3 font-mono text-5xl leading-none text-[#3ecf8e]/10 transition-colors duration-300 group-hover:text-[#3ecf8e]/15">
                  {step.id}
                </p>

                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#3ecf8e]/20 bg-[#3ecf8e]/10 text-[#3ecf8e] transition-all duration-300 group-hover:border-[#3ecf8e]/35 group-hover:bg-[#3ecf8e]/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="mt-6 font-mono text-sm font-medium uppercase tracking-[0.12em] text-[#fafafa]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#898989]">{step.description}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
