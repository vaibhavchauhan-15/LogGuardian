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

const comparisonRows = [
  { feature: "Cost", lg: "Free", dd: "$$$", sb: "Dev time", lgColor: "text-[#3ecf8e]" },
  { feature: "Anomaly ML", lg: "✓", dd: "✓", sb: "Manual", lgColor: "text-[#fafafa]" },
  { feature: "Open Source", lg: "✓", dd: "✗", sb: "✓", lgColor: "text-[#fafafa]" },
  { feature: "Setup time", lg: "5 min", dd: "1 hr", sb: "Weeks", lgColor: "text-[#fafafa]" },
];

export function TechStack() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6"
    >
      <motion.p variants={fadeUpVariant} className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Built With
      </motion.p>
      <motion.h2 variants={fadeUpVariant} className="mt-4 text-3xl font-normal tracking-[-0.03em] md:text-5xl">
        Open-source all the way down.
      </motion.h2>

      <motion.div
        variants={fadeUpVariant}
        className="relative mt-10 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="flex w-max gap-3" style={{ animation: "marquee 35s linear infinite" }}>
          {[...stackItems, ...stackItems, ...stackItems].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="whitespace-nowrap rounded-full border border-[#242424] bg-[#0f0f0f] px-4 py-1.5 font-mono text-sm text-[#555] transition-colors duration-200 hover:border-[#3ecf8e]/30 hover:text-[#3ecf8e]/80"
            >
              {item}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUpVariant} className="mt-10 overflow-hidden rounded-2xl border border-[#1f1f1f]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
              <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">Feature</th>
              <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#3ecf8e]">
                LogGuardian
              </th>
              <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">Datadog</th>
              <th className="px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                Self-built
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, index) => (
              <tr
                key={row.feature}
                className={`border-b border-[#141414] transition-colors duration-150 hover:bg-[#0f0f0f] ${
                  index === comparisonRows.length - 1 ? "border-0" : ""
                }`}
              >
                <td className="px-5 py-4 text-[#898989]">{row.feature}</td>
                <td className={`px-5 py-4 font-medium ${row.lgColor}`}>{row.lg}</td>
                <td className="px-5 py-4 text-[#555]">{row.dd}</td>
                <td className="px-5 py-4 text-[#555]">{row.sb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.section>
  );
}
