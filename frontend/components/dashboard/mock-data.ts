import type { AnomalyTimelinePoint } from "@/components/dashboard/anomaly-timeline-chart";

// All values are fully deterministic — no Math.random() to avoid SSR/client hydration mismatches.

const HOURLY_TOTALS = [28, 35, 22, 18, 41, 67, 89, 92, 78, 65, 54, 70, 83, 77, 61, 58, 49, 44, 38, 52, 66, 74, 60, 45];
const HOURLY_CRITICAL = [1, 2, 0, 0, 3, 5, 7, 6, 4, 3, 2, 4, 6, 5, 3, 2, 1, 2, 1, 3, 4, 5, 3, 2];

export const MOCK_TREND_DATA = HOURLY_TOTALS.map((total, i) => ({
  day: `2024-01-15T${String(i).padStart(2, "0")}:00:00`,
  total,
  critical: HOURLY_CRITICAL[i],
}));

export const MOCK_SERVICE_DATA = [
  { service: "api-gateway",   total: 92, critical: 7 },
  { service: "auth-service",  total: 68, critical: 2 },
  { service: "db-service",    total: 54, critical: 5 },
  { service: "payment-svc",   total: 41, critical: 3 },
  { service: "cache-service", total: 28, critical: 1 },
  { service: "ml-service",    total: 21, critical: 0 },
];

// Pre-computed scores: deterministic baseline with known spikes at indices 8, 17, 29, 35
const TIMELINE_SCORES: number[] = [
  0.12, 0.18, 0.09, 0.22, 0.15, 0.31, 0.27, 0.19,
  0.87, // spike
  0.24, 0.13, 0.20, 0.33, 0.28, 0.16, 0.11, 0.25,
  0.74, // spike
  0.22, 0.19, 0.14, 0.30, 0.26, 0.18, 0.23, 0.17,
  0.21, 0.15, 0.29,
  0.93, // spike
  0.27, 0.20, 0.16, 0.24, 0.12,
  0.65, // spike
  0.28, 0.19, 0.23, 0.17, 0.21,
];

export const MOCK_ANOMALY_TIMELINE: AnomalyTimelinePoint[] = TIMELINE_SCORES.map((score, i) => {
  const severity: "normal" | "suspicious" | "critical" =
    score >= 0.7 ? "critical" : score >= 0.4 ? "suspicious" : "normal";
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const min = i % 2 === 0 ? "00" : "30";
  return { time: `${hour}:${min}`, score, severity };
});

