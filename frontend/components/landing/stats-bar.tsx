"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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

type StatConfig = {
  label: string;
  value: number;
  formatter: (value: number) => string;
};

const stats: StatConfig[] = [
  {
    label: "Detection Latency",
    value: 200,
    formatter: (value) => `< ${Math.max(0, Math.round(value))}ms`,
  },
  {
    label: "Accuracy",
    value: 99.9,
    formatter: (value) => `${Math.min(99.9, value).toFixed(1)}%`,
  },
  {
    label: "Logs / sec",
    value: 10000,
    formatter: (value) => `${Math.max(0, Math.round(value / 1000))}k+`,
  },
  {
    label: "Forever Free",
    value: 0,
    formatter: (value) => `${Math.max(0, Math.round(value))}$`,
  },
];

function CountUpStat({ stat, inView, withDivider }: { stat: StatConfig; inView: boolean; withDivider: boolean }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    damping: 24,
    stiffness: 130,
  });

  const [text, setText] = useState(stat.formatter(0));

  useEffect(() => {
    if (inView) {
      motionValue.set(stat.value);
    }
  }, [inView, motionValue, stat.value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setText(stat.formatter(latest));
    });

    return unsubscribe;
  }, [spring, stat]);

  return (
    <motion.div
      variants={fadeUpVariant}
      className={`flex flex-1 flex-col items-center px-8 text-center ${
        withDivider ? "md:border-r md:border-[#2a2a2a]" : ""
      }`}
    >
      <p className="font-mono text-[28px] font-medium leading-none tracking-[-0.02em] text-brand">{text}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#555]">{stat.label}</p>
    </motion.div>
  );
}

export function StatsBar() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.section
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="relative border-y border-[#1f1f1f] py-8"
      style={{
        background:
          "linear-gradient(to bottom, rgba(17,17,17,0.9), rgba(10,10,10,0.9))",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 md:flex-row md:items-center md:gap-0 md:px-6">
        {stats.map((stat, index) => (
          <CountUpStat key={stat.label} stat={stat} inView={inView} withDivider={index < stats.length - 1} />
        ))}
      </div>
    </motion.section>
  );
}
