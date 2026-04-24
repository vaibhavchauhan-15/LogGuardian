"use client";

import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/api";

type ErrorTrendChartProps = {
  trend: TrendPoint[];
};

function ErrorTrendChartBase({ trend }: ErrorTrendChartProps) {
  const data = trend.slice(-20).map((point) => ({
    day: point.day.slice(5),
    total: point.total,
    critical: point.critical,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lgCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lg-accent-strong)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--lg-accent-strong)" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="lgTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lg-accent)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--lg-accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(140, 167, 205, 0.15)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "color-mix(in oklab, var(--bg-card border border-border shadow-none rounded-[12px] p-6-strong), transparent 7%)",
              color: "var(--lg-text)",
            }}
          />
          <Area type="monotone" dataKey="total" stroke="var(--lg-accent)" fill="url(#lgTotal)" strokeWidth={2} />
          <Area
            type="monotone"
            dataKey="critical"
            stroke="var(--lg-accent-strong)"
            fill="url(#lgCritical)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const ErrorTrendChart = memo(ErrorTrendChartBase);
