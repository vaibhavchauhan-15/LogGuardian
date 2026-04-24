"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AnomalyPulseCardProps {
  warningCount?: number;
  alertCount?: number;
  suspiciousCount?: number;
  enableAnimations?: boolean;
  onMoreDetails?: () => void;
}

function buildRing(count: number, radius: number, cx: number, cy: number) {
  const dots: Array<{ x: number; y: number; delay: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    dots.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      delay: i * 0.012,
    });
  }
  return dots;
}

export function AnomalyPulseCard({
  warningCount = 31,
  alertCount = 9,
  suspiciousCount = 18,
  enableAnimations = true,
  onMoreDetails,
}: AnomalyPulseCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !prefersReducedMotion;

  const total = warningCount + alertCount + suspiciousCount;

  const outerRing = useMemo(() => buildRing(40, 102, 126, 126), []);
  const innerRing = useMemo(() => buildRing(30, 78, 126, 126), []);

  return (
    <motion.div
      className="w-full max-w-md"
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6) p-5 shadow-(none)">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-(--muted-foreground)">
            Threat Mix
          </p>
          <span className="rounded-full border border-(--border) px-2 py-1 text-xs text-(--muted-foreground)">
            live
          </span>
        </div>

        <div className="relative mx-auto h-63 w-63 overflow-hidden rounded-full">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(4,118,217,0.13),transparent_55%)]" />
          <svg viewBox="0 0 252 252" className="relative h-full w-full">
            {outerRing.map((dot, idx) => (
              <motion.circle
                key={`outer-${idx}`}
                cx={dot.x}
                cy={dot.y}
                r="4"
                fill="#4b89ff"
                initial={shouldAnimate ? { opacity: 0, scale: 0 } : false}
                animate={{ opacity: 0.55, scale: 1 }}
                transition={{ delay: dot.delay, duration: 0.3 }}
              />
            ))}
            {innerRing.map((dot, idx) => (
              <motion.circle
                key={`inner-${idx}`}
                cx={dot.x}
                cy={dot.y}
                r="4"
                fill="#00b38f"
                initial={shouldAnimate ? { opacity: 0, scale: 0 } : false}
                animate={{ opacity: 0.48, scale: 1 }}
                transition={{ delay: dot.delay * 0.9, duration: 0.28 }}
              />
            ))}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-(--muted-foreground)">active signals</p>
            <p className="text-5xl font-semibold tracking-tight">{total}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-3">
            <p className="text-(--muted-foreground)">Warnings</p>
            <p className="mt-1 text-xl font-semibold text-amber-300">{warningCount}</p>
          </div>
          <div className="rounded-xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-3">
            <p className="text-(--muted-foreground)">Alerts</p>
            <p className="mt-1 text-xl font-semibold text-red-300">{alertCount}</p>
          </div>
          <div className="rounded-xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) p-3">
            <p className="text-(--muted-foreground)">Suspicious</p>
            <p className="mt-1 text-xl font-semibold text-blue-300">{suspiciousCount}</p>
          </div>
        </div>

        <motion.button
          type="button"
          className="mt-4 w-full rounded-xl border border-(--border) bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-(--lg-accent-soft)"
          onClick={onMoreDetails}
          whileHover={shouldAnimate ? { scale: 1.01 } : {}}
          whileTap={shouldAnimate ? { scale: 0.99 } : {}}
        >
          Explore Signal Details
        </motion.button>
      </div>
    </motion.div>
  );
}
