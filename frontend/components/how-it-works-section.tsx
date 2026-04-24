"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  ChartNoAxesCombined,
  Database,
  GitBranch,
  Sparkles,
} from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

type HowItWorksStep = {
  title: string;
  detail: string;
};

type HowItWorksSectionProps = {
  steps: HowItWorksStep[];
};

type Incident = {
  id: string;
  severity: "Critical" | "High" | "Medium";
  service: string;
  detail: string;
  score: number;
};

type StructuredRowItem = {
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO";
  service: string;
  message: string;
};

const RAW_LOGS = [
  "10:11:22 auth-api INFO request /v1/session started",
  "10:11:23 edge-gateway INFO GET /v1/login 200",
  "10:11:24 db-proxy WARN retrying read replica",
  "10:11:25 auth-api ERROR database timeout 2.8s",
  "10:11:26 jobs-worker INFO replay queue drained",
  "10:11:27 notifier INFO slack payload prepared",
  "10:11:28 cache-node WARN eviction burst detected",
  "10:11:29 auth-api ERROR timeout spike fingerprint=a8f4",
];

const STRUCTURED_ROWS: StructuredRowItem[] = [
  {
    timestamp: "10:11:24.118",
    level: "WARN",
    service: "db-proxy",
    message: "retry budget crossing threshold",
  },
  {
    timestamp: "10:11:25.442",
    level: "ERROR",
    service: "auth-api",
    message: "database timeout 2.8s",
  },
  {
    timestamp: "10:11:27.013",
    level: "INFO",
    service: "notifier",
    message: "incident candidate prepared",
  },
  {
    timestamp: "10:11:29.304",
    level: "ERROR",
    service: "auth-api",
    message: "timeout spike fingerprint=a8f4",
  },
];

const INCIDENTS_UNSORTED: Incident[] = [
  {
    id: "inc-91",
    severity: "Medium",
    service: "billing-api",
    detail: "retry variance up 22%",
    score: 0.62,
  },
  {
    id: "inc-94",
    severity: "Critical",
    service: "auth-api",
    detail: "timeout spike + login drop",
    score: 0.92,
  },
  {
    id: "inc-89",
    severity: "High",
    service: "search-cache",
    detail: "latency tail at p99",
    score: 0.81,
  },
];

const INCIDENTS_SORTED: Incident[] = [
  {
    id: "inc-94",
    severity: "Critical",
    service: "auth-api",
    detail: "timeout spike + login drop",
    score: 0.92,
  },
  {
    id: "inc-89",
    severity: "High",
    service: "search-cache",
    detail: "latency tail at p99",
    score: 0.81,
  },
  {
    id: "inc-91",
    severity: "Medium",
    service: "billing-api",
    detail: "retry variance up 22%",
    score: 0.62,
  },
];

const STAGE_WINDOWS: [number, number][] = [
  [0, 0.24],
  [0.18, 0.42],
  [0.36, 0.62],
  [0.56, 0.82],
  [0.76, 1],
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function useStageWindow(
  progress: MotionValue<number>,
  start: number,
  end: number,
  feather = 0.09
) {
  return useTransform(
    progress,
    [Math.max(0, start - feather), start, end, Math.min(1, end + feather)],
    [0, 1, 1, 0]
  );
}

function formatMetric(
  value: number,
  decimals = 0,
  suffix = "",
  prefix = ""
) {
  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function severityClasses(severity: Incident["severity"]) {
  if (severity === "Critical") {
    return "border-[#ff7a90]/55 bg-[#ff7a90]/16 text-[#ffc7d1]";
  }

  if (severity === "High") {
    return "border-[#ffb061]/55 bg-[#ffb061]/16 text-[#ffd8a6]";
  }

  return "border-[#f2dc79]/55 bg-[#f2dc79]/16 text-[#fff2bd]";
}

function levelClasses(level: StructuredRowItem["level"]) {
  if (level === "ERROR") {
    return "border-[#ff8ca0]/45 bg-[#ff8ca0]/14 text-[#ffd1da]";
  }

  if (level === "WARN") {
    return "border-[#ffc57b]/45 bg-[#ffc57b]/14 text-[#ffe2b6]";
  }

  return "border-[#81d6ff]/45 bg-[#81d6ff]/12 text-[#cdefff]";
}

function MetricCounter({
  progress,
  start,
  end,
  from,
  to,
  label,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  from: number;
  to: number;
  label: string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const animated = useTransform(progress, [start, end], [from, to]);
  const [text, setText] = useState(formatMetric(from, decimals, suffix, prefix));

  useMotionValueEvent(animated, "change", (latest) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const clamped = Math.min(max, Math.max(min, latest));
    setText(formatMetric(clamped, decimals, suffix, prefix));
  });

  return (
    <div className="rounded-xl border border-(--border) bg-[#061932]/72 px-2.5 py-2">
      <p className="font-mono text-xs font-semibold text-(--lg-accent-strong)">{text}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#89a8cb]">{label}</p>
    </div>
  );
}

function PipelineConnector({
  progress,
  start,
  end,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0.24, 1]);
  const scaleX = useTransform(progress, [start, end], [0.18, 1]);
  const pulseX = useTransform(progress, [start, end], [0, 78]);

  return (
    <motion.div
      style={{ opacity }}
      className="hidden items-center gap-3 px-3 lg:flex"
      aria-hidden="true"
    >
      <div className="relative h-1 w-20 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--border),transparent_15%)]">
        <motion.span
          style={{ scaleX }}
          className="absolute inset-0 origin-left rounded-full bg-[linear-gradient(90deg,var(--lg-accent),var(--lg-accent-strong))]"
        />
        <motion.span
          style={{ x: pulseX }}
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-(--lg-accent-strong) shadow-[0_0_20px_color-mix(in_oklab,var(--lg-accent-strong),transparent_30%)]"
        />
      </div>
      <ArrowRight className="h-4 w-4 text-(--lg-accent-strong)" />
    </motion.div>
  );
}

function StageChip({
  progress,
  label,
  start,
  end,
}: {
  progress: MotionValue<number>;
  label: string;
  start: number;
  end: number;
}) {
  const active = useStageWindow(progress, start, end, 0.08);
  const opacity = useTransform(active, [0, 1], [0.45, 1]);
  const scale = useTransform(active, [0, 1], [0.96, 1]);
  const borderColor = useTransform(
    active,
    [0, 1],
    ["rgba(149,170,204,0.18)", "rgba(114,188,255,0.62)"]
  );

  return (
    <motion.li
      style={{ opacity, scale, borderColor }}
      className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--muted-foreground) md:text-xs"
    >
      {label}
    </motion.li>
  );
}

function PipelinePanel({
  progress,
  start,
  end,
  children,
  className = "",
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  children: React.ReactNode;
  className?: string;
}) {
  const active = useStageWindow(progress, start, end);
  const opacity = useTransform(active, [0, 1], [0.34, 1]);
  const scale = useTransform(active, [0, 1], [0.975, 1]);
  const blur = useTransform(active, [0, 1], ["blur(1.8px)", "blur(0px)"]);
  const borderColor = useTransform(
    active,
    [0, 1],
    ["rgba(149,170,204,0.18)", "rgba(114,188,255,0.64)"]
  );

  return (
    <motion.article
      style={{ opacity, scale, filter: blur, borderColor }}
      className={`relative min-h-90 w-[min(80vw,430px)] overflow-hidden rounded-3xl border bg-[color-mix(in_oklab,var(--bg-card border border-border shadow-none rounded-[12px] p-6-strong),transparent_8%)] p-5 shadow-[0_16px_42px_rgba(3,10,24,0.42)] md:w-[min(62vw,520px)] ${className}`}
    >
      {children}
    </motion.article>
  );
}

function MobileTimelineCard({
  progress,
  start,
  end,
  stageLabel,
  stageNumber,
  children,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  stageLabel: string;
  stageNumber: string;
  children: React.ReactNode;
}) {
  const active = useStageWindow(progress, start, end, 0.08);
  const opacity = useTransform(active, [0, 1], [0.32, 1]);
  const y = useTransform(active, [0, 1], [16, 0]);
  const scale = useTransform(active, [0, 1], [0.97, 1]);
  const borderColor = useTransform(
    active,
    [0, 1],
    ["rgba(149,170,204,0.18)", "rgba(114,188,255,0.62)"]
  );

  return (
    <motion.article
      style={{ opacity, y, scale, borderColor }}
      className="relative rounded-2xl border bg-[#041528]/74 p-4"
    >
      <span className="absolute -left-11 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-(--border) bg-[#06203c] text-xs font-semibold text-(--lg-accent-strong)">
        {stageNumber}
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--lg-accent-strong)">
        {stageLabel}
      </p>
      {children}
    </motion.article>
  );
}

function StructuredRow({
  row,
  index,
  progress,
  baseStart = 0.24,
}: {
  row: StructuredRowItem;
  index: number;
  progress: MotionValue<number>;
  baseStart?: number;
}) {
  const start = baseStart + index * 0.035;
  const end = start + 0.12;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [16, 0]);

  return (
    <motion.li
      style={{ opacity, y }}
      className="grid grid-cols-[auto_auto_auto_1fr] items-center gap-2 rounded-xl border border-(--border) bg-[rgba(7,22,40,0.56)] px-3 py-2.5"
    >
      <span className="font-mono text-[11px] text-[#a9c6e5]">{row.timestamp}</span>
      <span
        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${levelClasses(
          row.level
        )}`}
      >
        {row.level}
      </span>
      <span className="rounded-md border border-(--border) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8d2f0]">
        {row.service}
      </span>
      <span className="truncate text-[11px] text-[#d7e9ff]">{row.message}</span>
    </motion.li>
  );
}

function IncidentList({
  incidents,
  progress,
  start,
  end,
}: {
  incidents: Incident[];
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [12, 0]);

  return (
    <motion.ul style={{ opacity, y }} className="space-y-2">
      {incidents.map((item) => (
        <li
          key={item.id}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-(--border) bg-[rgba(6,20,36,0.62)] px-3 py-2"
        >
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${severityClasses(
              item.severity
            )}`}
          >
            {item.severity}
          </span>
          <div>
            <p className="text-sm font-medium text-[#deedff]">{item.service}</p>
            <p className="text-xs text-[#9fbad9]">{item.detail}</p>
          </div>
          <span className="font-mono text-xs text-[color-mix(in_oklab,var(--lg-accent-strong),white_25%)]">
            {item.score.toFixed(2)}
          </span>
        </li>
      ))}
    </motion.ul>
  );
}

function trendPath() {
  return "M 8 86 C 26 82, 42 74, 56 67 C 72 60, 82 57, 98 50 C 112 43, 126 42, 140 36 C 153 30, 164 14, 176 18 C 186 22, 194 36, 200 38";
}

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  const desktopSectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileSectionRef = useRef<HTMLDivElement>(null);

  const [activeStageDesktop, setActiveStageDesktop] = useState(1);
  const [activeStageMobile, setActiveStageMobile] = useState(1);

  const distance = useMotionValue(0);
  const x = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: desktopSectionRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: mobileProgress } = useScroll({
    target: mobileSectionRef,
    offset: ["start start", "end end"],
  });

  const meterWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const logsY = useTransform(scrollYProgress, [0, 0.24], [34, -154]);
  const rawBlur = useTransform(
    scrollYProgress,
    [0, 0.24, 0.38],
    ["blur(3px)", "blur(0px)", "blur(0px)"]
  );
  const rawOpacity = useTransform(scrollYProgress, [0, 0.24, 0.4], [1, 1, 0.14]);
  const structuredOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.34, 0.46],
    [0, 0.9, 1]
  );

  const chartPathLength = useTransform(scrollYProgress, [0.42, 0.66], [0.04, 1]);
  const spikeScale = useTransform(scrollYProgress, [0.48, 0.58, 0.7], [0.74, 1.28, 1]);
  const spikeGlow = useTransform(
    scrollYProgress,
    [0.48, 0.58, 0.7],
    ["rgba(114,188,255,0.2)", "rgba(114,188,255,0.7)", "rgba(114,188,255,0.28)"]
  );
  const spikePulseOpacity = useTransform(
    scrollYProgress,
    [0.48, 0.58, 0.7],
    [0.2, 0.7, 0.26]
  );
  const spikeOutline = useMotionTemplate`0 0 0 1px ${spikeGlow}`;

  const unsortedOpacity = useTransform(scrollYProgress, [0.6, 0.74, 0.84], [1, 1, 0]);
  const sortedOpacity = useTransform(scrollYProgress, [0.66, 0.78, 0.88], [0, 0.65, 1]);

  const alertOpacity = useTransform(scrollYProgress, [0.84, 1], [0, 1]);
  const alertSlide = useTransform(scrollYProgress, [0.84, 1], [72, 0]);
  const alertScale = useTransform(scrollYProgress, [0.84, 0.98], [0.94, 1]);
  const alertShake = useTransform(
    scrollYProgress,
    [0.88, 0.92, 0.96, 0.99, 1],
    [0, -3, 3, -2, 0]
  );

  const mobileMeterWidth = useTransform(mobileProgress, [0, 1], ["0%", "100%"]);
  const mobileLogsY = useTransform(mobileProgress, [0, 0.24], [14, -84]);
  const mobileRawOpacity = useTransform(mobileProgress, [0, 0.24, 0.4], [1, 1, 0.16]);
  const mobileStructuredOpacity = useTransform(
    mobileProgress,
    [0.2, 0.34, 0.46],
    [0, 0.9, 1]
  );
  const mobilePathLength = useTransform(mobileProgress, [0.42, 0.66], [0.04, 1]);
  const mobileSpikeScale = useTransform(mobileProgress, [0.48, 0.6, 0.72], [0.72, 1.24, 1]);
  const mobileSpikeOpacity = useTransform(
    mobileProgress,
    [0.48, 0.6, 0.72],
    [0.2, 0.72, 0.26]
  );
  const mobileUnsortedOpacity = useTransform(
    mobileProgress,
    [0.6, 0.74, 0.84],
    [1, 1, 0]
  );
  const mobileSortedOpacity = useTransform(
    mobileProgress,
    [0.66, 0.78, 0.9],
    [0, 0.65, 1]
  );
  const mobileAlertOpacity = useTransform(mobileProgress, [0.84, 1], [0, 1]);
  const mobileAlertY = useTransform(mobileProgress, [0.84, 1], [36, 0]);

  const stageTitles = [
    steps[0]?.title ?? "Logs",
    steps[1]?.title ?? "Processing",
    steps[2]?.title ?? "AI",
    steps[3]?.title ?? "Insights",
    steps[4]?.title ?? "Alerts",
  ];

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const eased = easeInOutCubic(clamp01(latest));
    x.set(-eased * distance.get());

    const stage = Math.min(5, Math.max(1, Math.floor(latest * 5) + 1));
    setActiveStageDesktop((previous) => (previous === stage ? previous : stage));
  });

  useMotionValueEvent(mobileProgress, "change", (latest) => {
    const stage = Math.min(5, Math.max(1, Math.floor(latest * 5) + 1));
    setActiveStageMobile((previous) => (previous === stage ? previous : stage));
  });

  useEffect(() => {
    const measure = () => {
      if (!viewportRef.current || !trackRef.current) {
        return;
      }

      const viewportWidth = viewportRef.current.clientWidth;
      const trackWidth = trackRef.current.scrollWidth;
      const nextDistance = Math.max(0, trackWidth - viewportWidth);
      distance.set(nextDistance);

      const eased = easeInOutCubic(clamp01(scrollYProgress.get()));
      x.set(-eased * nextDistance);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);

      if (viewportRef.current) {
        observer.observe(viewportRef.current);
      }

      if (trackRef.current) {
        observer.observe(trackRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [distance, scrollYProgress, x]);

  return (
    <section id="flow" className="lg-section pt-8">
      <div className="max-w-4xl">
        <p className="lg-eyebrow">Visual Story</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          Logs flow in. AI decides. Action happens fast.
        </h2>
        <p className="lg-subtle mt-4 max-w-3xl text-base leading-relaxed md:text-lg">
          Scroll through the chain to watch raw events become ranked incidents and decisive alerts.
        </p>
      </div>

      <div ref={desktopSectionRef} className="relative mt-10 hidden h-[340vh] md:block">
        <div className="sticky top-[5.8rem]">
          <div className="bg-card border border-border shadow-none rounded-[12px] p-6 overflow-hidden rounded-3xl p-4 md:p-6">
            <div className="pointer-events-none absolute inset-x-10 top-20 h-64 rounded-full bg-[radial-gradient(circle,rgba(114,188,255,0.16),transparent_68%)] blur-2xl" />

            <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
              <ul className="flex flex-wrap items-center gap-2">
                {stageTitles.map((label, index) => {
                  const [start, end] = STAGE_WINDOWS[index];

                  return (
                    <StageChip
                      key={label}
                      progress={scrollYProgress}
                      label={label}
                      start={start}
                      end={end}
                    />
                  );
                })}
              </ul>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted-foreground)">
                Active stage:{" "}
                <span className="text-(--lg-accent-strong)">
                  {activeStageDesktop.toString().padStart(2, "0")}
                </span>
              </p>
            </div>

            <div
              ref={viewportRef}
              className="relative overflow-hidden rounded-2xl border border-(--border) bg-[#031224]/70 p-3 md:p-4"
            >
              <motion.div
                ref={trackRef}
                style={{ x }}
                className="flex w-max items-stretch gap-2 md:gap-3"
              >
                <PipelinePanel
                  progress={scrollYProgress}
                  start={0}
                  end={0.24}
                  className="w-[min(84vw,450px)]"
                >
                  <p className="lg-kicker inline-flex items-center gap-2">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    Log Ingestion
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Events stream from every service.
                  </h3>

                  <div className="mt-4 rounded-2xl border border-(--border) bg-[#04152d]/72 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-[#97b2d1]">
                      <span>live_socket://pipeline/events</span>
                      <span className="rounded-full border border-(--border) px-2 py-0.5 uppercase tracking-[0.12em]">
                        connected
                      </span>
                    </div>
                    <div className="relative h-52 overflow-hidden rounded-xl border border-(--border) bg-[#020d1d]/78 p-2.5">
                      <motion.div
                        style={{ y: logsY, filter: rawBlur, opacity: rawOpacity }}
                        className="space-y-1.5"
                      >
                        {RAW_LOGS.concat(RAW_LOGS).map((line, index) => (
                          <p
                            key={`${line}-${index}`}
                            className="rounded-md border border-transparent px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-[#a8c4e6]"
                          >
                            {line}
                          </p>
                        ))}
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0}
                      end={0.24}
                      from={1450}
                      to={11840}
                      label="events throughput"
                      suffix="/s"
                    />
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0}
                      end={0.24}
                      from={480}
                      to={92}
                      label="ingest lag"
                      suffix="ms"
                    />
                  </div>
                </PipelinePanel>

                <PipelineConnector progress={scrollYProgress} start={0.2} end={0.34} />

                <PipelinePanel
                  progress={scrollYProgress}
                  start={0.18}
                  end={0.42}
                  className="w-[min(84vw,520px)]"
                >
                  <p className="lg-kicker inline-flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                    Processing
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Raw noise becomes structured telemetry.
                  </h3>

                  <motion.div
                    style={{ opacity: structuredOpacity }}
                    className="mt-4 rounded-2xl border border-(--border) bg-[#04162d]/68 p-3"
                  >
                    <div className="mb-2 grid grid-cols-[auto_auto_auto_1fr] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#84a4c9]">
                      <span>Timestamp</span>
                      <span>Level</span>
                      <span>Service</span>
                      <span>Message</span>
                    </div>
                    <ul className="space-y-2">
                      {STRUCTURED_ROWS.map((row, index) => (
                        <StructuredRow
                          key={`${row.timestamp}-${row.service}`}
                          row={row}
                          index={index}
                          progress={scrollYProgress}
                          baseStart={0.24}
                        />
                      ))}
                    </ul>
                  </motion.div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.18}
                      end={0.42}
                      from={82.2}
                      to={99.4}
                      label="parse success"
                      suffix="%"
                      decimals={1}
                    />
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.18}
                      end={0.42}
                      from={2.1}
                      to={5.4}
                      label="normalized rows"
                      suffix="M"
                      decimals={1}
                    />
                  </div>
                </PipelinePanel>

                <PipelineConnector progress={scrollYProgress} start={0.4} end={0.54} />

                <PipelinePanel
                  progress={scrollYProgress}
                  start={0.36}
                  end={0.62}
                  className="w-[min(84vw,520px)]"
                >
                  <p className="lg-kicker inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    AI Detection
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Anomaly confidence spikes in context.
                  </h3>

                  <div className="mt-4 rounded-2xl border border-(--border) bg-[#04162d]/70 p-3">
                    <div className="flex items-center justify-between text-xs text-[#9cb9d9]">
                      <span className="inline-flex items-center gap-1.5">
                        <ChartNoAxesCombined
                          className="h-3.5 w-3.5 text-(--lg-accent-strong)"
                          aria-hidden="true"
                        />
                        hybrid-ml score timeline
                      </span>
                      <span>confidence: 0.92</span>
                    </div>

                    <div className="mt-3 rounded-xl border border-(--border) bg-[#031023]/72 p-3">
                      <svg
                        viewBox="0 0 208 96"
                        className="h-28 w-full"
                        role="img"
                        aria-label="Anomaly confidence line chart"
                      >
                        <path
                          d="M 8 86 H 200"
                          stroke="rgba(155,176,205,0.34)"
                          strokeWidth="1.4"
                          fill="none"
                        />
                        <motion.path
                          d={trendPath()}
                          stroke="url(#howFlowGradient)"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          style={{ pathLength: chartPathLength }}
                        />
                        <motion.circle
                          cx="176"
                          cy="18"
                          r="6"
                          style={{ scale: spikeScale }}
                          fill="url(#howFlowGradient)"
                        />
                        <motion.circle
                          cx="176"
                          cy="18"
                          r="12"
                          fill="#72bcff"
                          style={{ scale: spikeScale, opacity: spikePulseOpacity }}
                        />
                        <defs>
                          <linearGradient
                            id="howFlowGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#3fd5b9" />
                            <stop offset="100%" stopColor="#72bcff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <motion.div
                      style={{ boxShadow: spikeOutline }}
                      className="mt-3 rounded-xl border border-(--border) bg-[#06172f]/78 px-3 py-2 text-sm text-[#d2e8ff]"
                    >
                      Highlighted event: auth-api database timeout fingerprint=a8f4
                    </motion.div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.36}
                      end={0.62}
                      from={0.2}
                      to={3.6}
                      label="anomaly rate"
                      suffix="%"
                      decimals={1}
                    />
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.36}
                      end={0.62}
                      from={54}
                      to={92}
                      label="model confidence"
                      suffix="%"
                    />
                  </div>
                </PipelinePanel>

                <PipelineConnector progress={scrollYProgress} start={0.6} end={0.74} />

                <PipelinePanel
                  progress={scrollYProgress}
                  start={0.56}
                  end={0.82}
                  className="w-[min(84vw,520px)]"
                >
                  <p className="lg-kicker inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Insights
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Incidents are ranked by risk and urgency.
                  </h3>

                  <div className="relative mt-4 rounded-2xl border border-(--border) bg-[#04162d]/72 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#90afd1]">
                      Priority engine
                    </p>

                    <motion.div
                      style={{ opacity: unsortedOpacity }}
                      className="absolute inset-x-3 top-10"
                    >
                      <IncidentList
                        incidents={INCIDENTS_UNSORTED}
                        progress={scrollYProgress}
                        start={0.6}
                        end={0.74}
                      />
                    </motion.div>

                    <motion.div style={{ opacity: sortedOpacity }} className="pt-7">
                      <IncidentList
                        incidents={INCIDENTS_SORTED}
                        progress={scrollYProgress}
                        start={0.68}
                        end={0.84}
                      />
                    </motion.div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.56}
                      end={0.82}
                      from={42}
                      to={7}
                      label="triage backlog"
                    />
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.56}
                      end={0.82}
                      from={61}
                      to={94}
                      label="priority confidence"
                      suffix="%"
                    />
                  </div>
                </PipelinePanel>

                <PipelineConnector progress={scrollYProgress} start={0.8} end={0.94} />

                <PipelinePanel
                  progress={scrollYProgress}
                  start={0.76}
                  end={1}
                  className="w-[min(84vw,500px)]"
                >
                  <p className="lg-kicker inline-flex items-center gap-2">
                    <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                    Alerts
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Escalation lands where responders already work.
                  </h3>

                  <motion.div
                    style={{ opacity: alertOpacity, x: alertSlide, scale: alertScale }}
                    className="mt-4 space-y-3"
                  >
                    <motion.article
                      style={{ x: alertShake }}
                      className="rounded-2xl border border-[color-mix(in_oklab,var(--lg-accent-strong),transparent_35%)] bg-[color-mix(in_oklab,var(--lg-accent-soft),transparent_40%)] p-4"
                    >
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--lg-accent-strong)">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Critical anomaly detected
                      </p>
                      <h4 className="mt-2 text-lg font-semibold">
                        auth-api timeout surge impacting logins
                      </h4>

                      <div className="mt-3 grid gap-2 text-sm text-[#d8ebff]">
                        <p className="flex items-center justify-between rounded-lg border border-(--border) bg-[#06203d]/62 px-3 py-2">
                          <span>Service</span>
                          <span className="font-semibold">Auth API</span>
                        </p>
                        <p className="flex items-center justify-between rounded-lg border border-(--border) bg-[#06203d]/62 px-3 py-2">
                          <span>Confidence</span>
                          <span className="font-semibold text-(--lg-accent-strong)">
                            92%
                          </span>
                        </p>
                        <p className="flex items-center justify-between rounded-lg border border-(--border) bg-[#06203d]/62 px-3 py-2">
                          <span>Delivery</span>
                          <span className="font-semibold">Slack + Email</span>
                        </p>
                      </div>
                    </motion.article>
                  </motion.div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.76}
                      end={1}
                      from={230}
                      to={41}
                      label="ack time"
                      suffix="ms"
                    />
                    <MetricCounter
                      progress={scrollYProgress}
                      start={0.76}
                      end={1}
                      from={88.2}
                      to={99.8}
                      label="delivery success"
                      suffix="%"
                      decimals={1}
                    />
                  </div>
                </PipelinePanel>
              </motion.div>
            </div>

            <div className="relative z-10 mt-5">
              <div className="h-1.5 w-full rounded-full bg-[color-mix(in_oklab,var(--border),transparent_10%)]">
                <motion.div
                  style={{ width: meterWidth }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--lg-accent),var(--lg-accent-strong))] shadow-[0_0_16px_color-mix(in_oklab,var(--lg-accent-strong),transparent_40%)]"
                />
              </div>
              <p className="lg-subtle mt-2 text-xs uppercase tracking-[0.12em]">
                Decision progress
              </p>
            </div>
          </div>
        </div>
      </div>

      <div ref={mobileSectionRef} className="relative mt-10 h-[270vh] md:hidden">
        <div className="sticky top-[5.6rem]">
          <div className="bg-card border border-border shadow-none rounded-[12px] p-6 rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--muted-foreground)">
                Mobile pipeline timeline
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted-foreground)">
                Stage {activeStageMobile.toString().padStart(2, "0")}
              </p>
            </div>

            <div className="h-1.5 w-full rounded-full bg-[color-mix(in_oklab,var(--border),transparent_10%)]">
              <motion.div
                style={{ width: mobileMeterWidth }}
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--lg-accent),var(--lg-accent-strong))]"
              />
            </div>

            <div className="relative mt-4 pl-10">
              <div className="absolute left-3 top-2 h-[calc(100%-1rem)] w-px bg-[color-mix(in_oklab,var(--border),transparent_5%)]" />

              <div className="space-y-3">
                <MobileTimelineCard
                  progress={mobileProgress}
                  start={0}
                  end={0.24}
                  stageLabel="Log Ingestion"
                  stageNumber="01"
                >
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    Events stream in real-time
                  </h3>
                  <div className="mt-2 rounded-xl border border-(--border) bg-[#031426]/82 p-2.5">
                    <div className="relative h-20 overflow-hidden rounded-lg border border-(--border) bg-[#020d1d]/78 p-2">
                      <motion.div
                        style={{ y: mobileLogsY, opacity: mobileRawOpacity }}
                        className="space-y-1"
                      >
                        {RAW_LOGS.slice(0, 6).map((line) => (
                          <p
                            key={`mobile-${line}`}
                            className="truncate font-mono text-[10px] text-[#a8c4e6]"
                          >
                            {line}
                          </p>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={mobileProgress}
                      start={0}
                      end={0.24}
                      from={1450}
                      to={11840}
                      label="events/s"
                      suffix="/s"
                    />
                    <MetricCounter
                      progress={mobileProgress}
                      start={0}
                      end={0.24}
                      from={480}
                      to={92}
                      label="lag"
                      suffix="ms"
                    />
                  </div>
                </MobileTimelineCard>

                <MobileTimelineCard
                  progress={mobileProgress}
                  start={0.18}
                  end={0.42}
                  stageLabel="Processing"
                  stageNumber="02"
                >
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    Structure and enrich each event
                  </h3>
                  <motion.div
                    style={{ opacity: mobileStructuredOpacity }}
                    className="mt-2 space-y-1.5"
                  >
                    {STRUCTURED_ROWS.slice(0, 2).map((row, index) => (
                      <StructuredRow
                        key={`mobile-row-${row.timestamp}`}
                        row={row}
                        index={index}
                        progress={mobileProgress}
                        baseStart={0.22}
                      />
                    ))}
                  </motion.div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.18}
                      end={0.42}
                      from={82.2}
                      to={99.4}
                      label="success"
                      suffix="%"
                      decimals={1}
                    />
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.18}
                      end={0.42}
                      from={2.1}
                      to={5.4}
                      label="rows"
                      suffix="M"
                      decimals={1}
                    />
                  </div>
                </MobileTimelineCard>

                <MobileTimelineCard
                  progress={mobileProgress}
                  start={0.36}
                  end={0.62}
                  stageLabel="AI Detection"
                  stageNumber="03"
                >
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    The anomaly spike is isolated
                  </h3>
                  <div className="mt-2 rounded-xl border border-(--border) bg-[#031023]/72 p-2.5">
                    <svg
                      viewBox="0 0 208 96"
                      className="h-22 w-full"
                      role="img"
                      aria-label="Mobile anomaly chart"
                    >
                      <path
                        d="M 8 86 H 200"
                        stroke="rgba(155,176,205,0.34)"
                        strokeWidth="1.4"
                        fill="none"
                      />
                      <motion.path
                        d={trendPath()}
                        stroke="url(#howFlowGradientMobile)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        style={{ pathLength: mobilePathLength }}
                      />
                      <motion.circle
                        cx="176"
                        cy="18"
                        r="6"
                        style={{ scale: mobileSpikeScale }}
                        fill="url(#howFlowGradientMobile)"
                      />
                      <motion.circle
                        cx="176"
                        cy="18"
                        r="11"
                        fill="#72bcff"
                        style={{ scale: mobileSpikeScale, opacity: mobileSpikeOpacity }}
                      />
                      <defs>
                        <linearGradient
                          id="howFlowGradientMobile"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#3fd5b9" />
                          <stop offset="100%" stopColor="#72bcff" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.36}
                      end={0.62}
                      from={0.2}
                      to={3.6}
                      label="anomaly"
                      suffix="%"
                      decimals={1}
                    />
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.36}
                      end={0.62}
                      from={54}
                      to={92}
                      label="confidence"
                      suffix="%"
                    />
                  </div>
                </MobileTimelineCard>

                <MobileTimelineCard
                  progress={mobileProgress}
                  start={0.56}
                  end={0.82}
                  stageLabel="Insights"
                  stageNumber="04"
                >
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    Incidents reorder by urgency
                  </h3>
                  <div className="relative mt-2 rounded-xl border border-(--border) bg-[#04162d]/70 p-2.5">
                    <motion.div
                      style={{ opacity: mobileUnsortedOpacity }}
                      className="absolute inset-x-2.5 top-2.5"
                    >
                      <IncidentList
                        incidents={INCIDENTS_UNSORTED}
                        progress={mobileProgress}
                        start={0.6}
                        end={0.74}
                      />
                    </motion.div>
                    <motion.div style={{ opacity: mobileSortedOpacity }} className="pt-4">
                      <IncidentList
                        incidents={INCIDENTS_SORTED}
                        progress={mobileProgress}
                        start={0.68}
                        end={0.88}
                      />
                    </motion.div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.56}
                      end={0.82}
                      from={42}
                      to={7}
                      label="backlog"
                    />
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.56}
                      end={0.82}
                      from={61}
                      to={94}
                      label="priority"
                      suffix="%"
                    />
                  </div>
                </MobileTimelineCard>

                <MobileTimelineCard
                  progress={mobileProgress}
                  start={0.76}
                  end={1}
                  stageLabel="Alerts"
                  stageNumber="05"
                >
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    Alert is delivered to responders
                  </h3>
                  <motion.article
                    style={{ opacity: mobileAlertOpacity, y: mobileAlertY }}
                    className="mt-2 rounded-xl border border-[color-mix(in_oklab,var(--lg-accent-strong),transparent_35%)] bg-[color-mix(in_oklab,var(--lg-accent-soft),transparent_42%)] p-3"
                  >
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--lg-accent-strong)">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Critical anomaly
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#dceeff]">
                      auth-api timeout surge • Confidence 92%
                    </p>
                    <p className="mt-1 text-xs text-[#9fbad9]">Delivered: Slack + Email</p>
                  </motion.article>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.76}
                      end={1}
                      from={230}
                      to={41}
                      label="ack"
                      suffix="ms"
                    />
                    <MetricCounter
                      progress={mobileProgress}
                      start={0.76}
                      end={1}
                      from={88.2}
                      to={99.8}
                      label="delivery"
                      suffix="%"
                      decimals={1}
                    />
                  </div>
                </MobileTimelineCard>
              </div>
            </div>

            <p className="lg-subtle mt-3 text-xs uppercase tracking-[0.12em]">
              Cinematic mobile timeline
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
