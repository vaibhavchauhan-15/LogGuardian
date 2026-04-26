"use client";

import { memo } from "react";
import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AnomalyTimelinePoint = {
  time: string;
  score: number;
  severity: "normal" | "suspicious" | "critical";
  service?: string;
};

type AnomalyTimelineChartProps = {
  data: AnomalyTimelinePoint[];
};

function severityColor(severity: string): string {
  if (severity === "critical") return "#ff4d4f";
  if (severity === "suspicious") return "#f59e0b";
  return "#3ecf8e";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const color = severityColor(payload?.severity ?? "normal");
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3.5}
      fill={color}
      stroke={color}
      strokeWidth={1}
      fillOpacity={0.9}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomActiveDot(props: any) {
  const { cx, cy, payload } = props;
  const color = severityColor(payload?.severity ?? "normal");
  return (
    <Dot cx={cx} cy={cy} r={5} fill={color} stroke={color} strokeWidth={2} />
  );
}

function AnomalyTimelineChartBase({ data }: AnomalyTimelineChartProps) {
  const chartData = data.slice(-40).map((point) => ({
    ...point,
    time: point.time.length > 16 ? point.time.slice(11, 16) : point.time,
  }));

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 12, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#242424"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            axisLine={{ stroke: "#2e2e2e" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fill: "#555", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              background: "#141414",
              border: "1px solid #2e2e2e",
              borderRadius: "8px",
              fontFamily: "IBM Plex Mono",
              fontSize: "11px",
              color: "#b4b4b4",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, _name: any, entry: any) => {
              const sev: string = (entry?.payload as AnomalyTimelinePoint | undefined)?.severity ?? "normal";
              const color = severityColor(sev);
              const num = typeof value === "number" ? value : 0;
              return [
                <span key="val" style={{ color }}>
                  {num.toFixed(3)} ({sev})
                </span>,
                "Score",
              ];
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => `Time: ${String(label)}`}
            cursor={{ stroke: "#2e2e2e", strokeWidth: 1 }}
          />
          {/* Suspicious threshold reference line */}
          <ReferenceLine
            y={0.4}
            stroke="#f59e0b"
            strokeDasharray="4 3"
            strokeOpacity={0.6}
            label={{
              value: "Suspicious 0.4",
              position: "insideTopRight",
              fill: "#f59e0b",
              fontSize: 9,
              fontFamily: "IBM Plex Mono",
            }}
          />
          {/* Critical threshold reference line */}
          <ReferenceLine
            y={0.7}
            stroke="#ff4d4f"
            strokeDasharray="4 3"
            strokeOpacity={0.6}
            label={{
              value: "Critical 0.7",
              position: "insideTopRight",
              fill: "#ff4d4f",
              fontSize: 9,
              fontFamily: "IBM Plex Mono",
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#3ecf8e"
            strokeWidth={1.5}
            dot={<CustomDot />}
            activeDot={<CustomActiveDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const AnomalyTimelineChart = memo(AnomalyTimelineChartBase);
