"use client";

import { motion, useInView } from "framer-motion";
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

const stackItems = [
  "FastAPI",
  "Next.js",
  "PyTorch",
  "scikit-learn",
  "PostgreSQL",
  "sentence-transformers",
  "Redis",
  "Docker",
  "Tailwind",
  "Kafka",
];

export function TechStack() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6"
    >
      <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Built With
      </motion.p>
      <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
        Open-source all the way down.
      </motion.h2>

      <motion.div variants={fadeUpVariant} className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-3">
          {[...stackItems, ...stackItems].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-full border border-border bg-muted px-4 py-1.5 font-mono text-sm text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUpVariant} className="mt-10 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Feature</th>
              <th className="px-4 py-3">LogGuardian</th>
              <th className="px-4 py-3">Datadog</th>
              <th className="px-4 py-3">Self-built</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="px-4 py-3">Cost</td>
              <td className="px-4 py-3 text-brand">Free</td>
              <td className="px-4 py-3">$$$</td>
              <td className="px-4 py-3">Dev time</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3">Anomaly ML</td>
              <td className="px-4 py-3">Yes</td>
              <td className="px-4 py-3">Yes</td>
              <td className="px-4 py-3">Manual</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3">Open Source</td>
              <td className="px-4 py-3">Yes</td>
              <td className="px-4 py-3">No</td>
              <td className="px-4 py-3">Yes</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3">Setup time</td>
              <td className="px-4 py-3">5 min</td>
              <td className="px-4 py-3">1 hr</td>
              <td className="px-4 py-3">Weeks</td>
            </tr>
          </tbody>
        </table>
      </motion.div>
    </motion.section>
  );
}
