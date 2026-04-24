"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ServiceBreakdown } from "@/lib/api";

type ServiceActivityChartProps = {
  services: ServiceBreakdown[];
};

function ServiceActivityChartBase({ services }: ServiceActivityChartProps) {
  const data = services.slice(0, 8).map((entry) => ({
    name: entry.service,
    total: entry.total,
    critical: entry.critical,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#242424" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#555", fontSize: 11, fontFamily: "IBM Plex Mono" }}
            axisLine={{ stroke: "#2e2e2e" }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#555", fontSize: 11, fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2e2e2e",
              borderRadius: "8px",
              fontFamily: "IBM Plex Mono",
              fontSize: "12px",
              color: "#b4b4b4",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#3ecf8e" fillOpacity={0.8} />
          <Bar dataKey="critical" radius={[4, 4, 0, 0]} fill="#ff4d4f" fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const ServiceActivityChart = memo(ServiceActivityChartBase);
