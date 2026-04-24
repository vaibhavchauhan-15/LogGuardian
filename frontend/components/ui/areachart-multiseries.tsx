"use client";

import React from "react";
import {
  Area,
  AreaChart,
  AreaSeries,
  Gradient,
  GradientStop,
  Gridline,
  GridlineSeries,
  LinearXAxis,
  LinearXAxisTickLabel,
  LinearXAxisTickSeries,
  LinearYAxis,
  LinearYAxisTickSeries,
} from "reaviz";

const threatSeries = [
  {
    key: "Warnings",
    data: [
      { key: new Date(2026, 2, 1), data: 7 },
      { key: new Date(2026, 2, 8), data: 11 },
      { key: new Date(2026, 2, 15), data: 9 },
      { key: new Date(2026, 2, 22), data: 14 },
      { key: new Date(2026, 2, 29), data: 12 },
      { key: new Date(2026, 3, 5), data: 16 },
      { key: new Date(2026, 3, 12), data: 13 },
    ],
  },
  {
    key: "Alerts",
    data: [
      { key: new Date(2026, 2, 1), data: 2 },
      { key: new Date(2026, 2, 8), data: 4 },
      { key: new Date(2026, 2, 15), data: 3 },
      { key: new Date(2026, 2, 22), data: 6 },
      { key: new Date(2026, 2, 29), data: 5 },
      { key: new Date(2026, 3, 5), data: 7 },
      { key: new Date(2026, 3, 12), data: 6 },
    ],
  },
  {
    key: "Suspicious Activity",
    data: [
      { key: new Date(2026, 2, 1), data: 4 },
      { key: new Date(2026, 2, 8), data: 6 },
      { key: new Date(2026, 2, 15), data: 5 },
      { key: new Date(2026, 2, 22), data: 8 },
      { key: new Date(2026, 2, 29), data: 9 },
      { key: new Date(2026, 3, 5), data: 10 },
      { key: new Date(2026, 3, 12), data: 8 },
    ],
  },
];

export default function IncidentAreaMultiSeriesCard() {
  return (
    <div className="w-full rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6) p-4 shadow-(none)">
      <h3 className="pb-3 text-xl font-semibold tracking-tight">Incident Pressure</h3>
      <p className="pb-4 text-sm text-(--muted-foreground)">
        Multi-signal trend for warnings, alerts, and suspicious behavior.
      </p>
      <div className="h-65 w-full min-w-0 overflow-hidden">
        <AreaChart
          id="incident-multi-series"
          data={threatSeries}
          height={240}
          xAxis={
            <LinearXAxis
              type="time"
              tickSeries={
                <LinearXAxisTickSeries
                  label={
                    <LinearXAxisTickLabel
                      format={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fill="var(--muted-foreground)"
                    />
                  }
                  tickSize={10}
                />
              }
            />
          }
          yAxis={
            <LinearYAxis
              axisLine={null}
              tickSeries={<LinearYAxisTickSeries line={null} label={null} tickSize={18} />}
            />
          }
          series={
            <AreaSeries
              type="grouped"
              interpolation="smooth"
              area={
                <Area
                  gradient={
                    <Gradient
                      stops={[
                        <GradientStop key={1} stopOpacity={0.06} />,
                        <GradientStop key={2} offset="100%" stopOpacity={0.5} />,
                      ]}
                    />
                  }
                />
              }
              colorScheme={["#4b89ff", "#ff6b6b", "#00b38f"]}
            />
          }
          gridlines={<GridlineSeries line={<Gridline strokeColor="var(--border)" />} />}
        />
      </div>
    </div>
  );
}
