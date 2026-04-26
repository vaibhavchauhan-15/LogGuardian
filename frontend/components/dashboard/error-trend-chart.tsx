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
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ecf8e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3ecf8e" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="fillCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d4f" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ff4d4f" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontFamily: "IBM Plex Mono",
              fontSize: "12px",
              color: "var(--text-secondary)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3ecf8e"
            strokeWidth={1.5}
            fill="url(#fillTotal)"
            dot={false}
            activeDot={{ r: 3, fill: "#3ecf8e" }}
          />
          <Area
            type="monotone"
            dataKey="critical"
            stroke="#ff4d4f"
            strokeWidth={1.5}
            fill="url(#fillCritical)"
            dot={false}
            activeDot={{ r: 3, fill: "#ff4d4f" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const ErrorTrendChart = memo(ErrorTrendChartBase);
