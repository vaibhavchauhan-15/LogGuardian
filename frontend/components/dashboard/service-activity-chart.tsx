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
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(140, 167, 205, 0.15)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "color-mix(in oklab, var(--bg-card border border-border shadow-none rounded-[12px] p-6-strong), transparent 7%)",
              color: "var(--lg-text)",
            }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--lg-accent)" />
          <Bar dataKey="critical" radius={[6, 6, 0, 0]} fill="var(--lg-accent-strong)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const ServiceActivityChart = memo(ServiceActivityChartBase);
