"use client";

import React, { FC, useMemo } from "react";
import {
  type LatestPayment,
  type SaleDataPoint,
  useRealtimeSalesData,
} from "@/demos/hooks/useRealtimeSalesData";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  DollarSign,
  ShieldAlert,
} from "lucide-react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

const MetricCard: FC<MetricCardProps> = ({ title, value, icon, description }) => (
  <Card className="min-w-55">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-(--muted-foreground)">{description}</p>
    </CardContent>
  </Card>
);

interface TrendChartProps {
  data: SaleDataPoint[];
  title: string;
  dataKey: keyof SaleDataPoint;
  stroke: string;
  formatter?: (value: number) => string;
}

const TrendChart: FC<TrendChartProps> = ({ data, title, dataKey, stroke, formatter }) => {
  const chartData = useMemo(() => data.slice(-18), [data]);

  return (
    <Card className="min-w-70 flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-(--lg-accent-strong)" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-70 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={(value) =>
                  formatter ? formatter(Number(value)).replace("$", "") : String(value)
                }
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card border border-border shadow-none rounded-[12px] p-6-strong)",
                }}
                formatter={(value) =>
                  formatter ? formatter(Number(value ?? 0)) : Number(value ?? 0).toFixed(2)
                }
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

function classificationBadge(payment: LatestPayment) {
  if (payment.classification === "critical") return <Badge variant="destructive">critical</Badge>;
  if (payment.classification === "warning") return <Badge variant="warning">warning</Badge>;
  return <Badge variant="secondary">normal</Badge>;
}

export function ActiveAnomalyTracker({ compact = false }: { compact?: boolean }) {
  const {
    totalRevenue,
    cumulativeRevenueData,
    salesCount,
    averageSale,
    salesChartData,
    latestPayments,
  } = useRealtimeSalesData();

  const suspiciousCount = useMemo(
    () => salesChartData.reduce((acc, point) => acc + point.anomalies, 0),
    [salesChartData]
  );

  const criticalCount = useMemo(
    () => salesChartData.reduce((acc, point) => acc + point.alerts, 0),
    [salesChartData]
  );

  const exposureIndex = useMemo(
    () => Math.round(suspiciousCount * 1.4 + criticalCount * 5),
    [criticalCount, suspiciousCount]
  );

  return (
    <TooltipProvider>
      <div className={compact ? "w-full" : "w-full rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6) p-4 md:p-6"}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Active Anomaly Tracker</h2>
            <p className="text-sm text-(--muted-foreground)">
              Live stream of suspicious behavior and operational risk.
            </p>
          </div>
          <Badge variant={criticalCount > 0 ? "destructive" : "default"}>
            {criticalCount > 0 ? "high attention" : "stable stream"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Event Throughput"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="h-4 w-4 text-(--muted-foreground)" />}
            description="Total event value in the active stream"
          />
          <MetricCard
            title="Total Transactions"
            value={salesCount.toLocaleString()}
            icon={<Activity className="h-4 w-4 text-(--muted-foreground)" />}
            description="Processed records in current session"
          />
          <MetricCard
            title="Suspicious Signals"
            value={suspiciousCount.toLocaleString()}
            icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
            description="Heuristic warnings over recent windows"
          />
          <MetricCard
            title="Exposure Index"
            value={exposureIndex.toLocaleString()}
            icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
            description="Weighted severity from warnings + critical"
          />
        </div>

        <div className="my-5">
          <Separator />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <TrendChart
            data={salesChartData}
            title="Signal Volume (2.5s ticks)"
            dataKey="sales"
            stroke="#4b89ff"
            formatter={formatCurrency}
          />
          <TrendChart
            data={cumulativeRevenueData}
            title="Cumulative Event Pressure"
            dataKey="sales"
            stroke="#00b38f"
            formatter={formatCurrency}
          />
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-(--lg-accent-strong)" />
              Latest Suspicious Activity
            </CardTitle>
            <CardDescription>Most recent anomaly-adjacent events.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-60">
              <div className="divide-y divide-(--border)">
                {latestPayments.length === 0 ? (
                  <p className="p-4 text-sm text-(--muted-foreground)">Waiting for incoming events...</p>
                ) : (
                  latestPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-(--muted-foreground)">
                          {payment.product} · {payment.customer}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {classificationBadge(payment)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-xs text-(--muted-foreground)">{payment.time}</span>
                          </TooltipTrigger>
                          <TooltipContent>Event captured at {payment.time}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="text-xs text-(--muted-foreground)">
            Average transaction value: {formatCurrency(averageSale)}
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
