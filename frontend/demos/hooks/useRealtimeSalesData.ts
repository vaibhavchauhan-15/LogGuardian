"use client";

import { useEffect, useMemo, useState } from "react";

export type AlertClass = "normal" | "warning" | "critical";

export interface SaleDataPoint {
  time: string;
  sales: number;
  anomalies: number;
  alerts: number;
}

export interface LatestPayment {
  id: string;
  amount: number;
  product: string;
  customer: string;
  time: string;
  classification: AlertClass;
}

const products = ["API Gateway", "Billing", "Auth", "Queue Worker", "Storage"];
const customers = ["Falcon Inc", "Nova Labs", "Skyline", "Aster", "Delta Core", "Hexa Team"];

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getClassification(anomalies: number, alerts: number): AlertClass {
  if (alerts > 0) return "critical";
  if (anomalies > 2) return "warning";
  return "normal";
}

export function useRealtimeSalesData() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [averageSale, setAverageSale] = useState(0);
  const [salesChartData, setSalesChartData] = useState<SaleDataPoint[]>([]);
  const [cumulativeRevenueData, setCumulativeRevenueData] = useState<SaleDataPoint[]>([]);
  const [latestPayments, setLatestPayments] = useState<LatestPayment[]>([]);

  useEffect(() => {
    let tick = 0;
    let runningRevenue = 6800;
    let runningCount = 132;

    const seedSeries: SaleDataPoint[] = [];
    const seedCumulative: SaleDataPoint[] = [];

    for (let i = 20; i >= 1; i -= 1) {
      tick += 1;
      const at = new Date(Date.now() - i * 2500);
      const base = 130 + Math.sin(tick / 3) * 42 + (tick % 6 === 0 ? 90 : 0);
      const noise = ((tick * 19) % 11) - 5;
      const amount = Math.max(24, base + noise);
      const anomalies = amount > 200 ? 4 : amount > 165 ? 2 : amount > 140 ? 1 : 0;
      const alerts = amount > 230 ? 1 : 0;

      runningRevenue += amount;
      runningCount += 1;

      seedSeries.push({
        time: formatTime(at),
        sales: Number(amount.toFixed(2)),
        anomalies,
        alerts,
      });
      seedCumulative.push({
        time: formatTime(at),
        sales: Number(runningRevenue.toFixed(2)),
        anomalies,
        alerts,
      });
    }

    const bootstrapTimeout = window.setTimeout(() => {
      setSalesChartData(seedSeries);
      setCumulativeRevenueData(seedCumulative);
      setTotalRevenue(Number(runningRevenue.toFixed(2)));
      setSalesCount(runningCount);
      setAverageSale(Number((runningRevenue / runningCount).toFixed(2)));
    }, 0);

    const interval = window.setInterval(() => {
      tick += 1;
      const now = new Date();
      const base = 130 + Math.sin(tick / 3) * 44 + (tick % 5 === 0 ? 78 : 0);
      const noise = ((tick * 23) % 13) - 6;
      const amount = Math.max(20, base + noise);
      const anomalies = amount > 205 ? 4 : amount > 172 ? 2 : amount > 145 ? 1 : 0;
      const alerts = amount > 235 ? 1 : 0;

      runningRevenue += amount;
      runningCount += 1;

      const point: SaleDataPoint = {
        time: formatTime(now),
        sales: Number(amount.toFixed(2)),
        anomalies,
        alerts,
      };

      setSalesChartData((prev) => [...prev.slice(-29), point]);
      setCumulativeRevenueData((prev) => [
        ...prev.slice(-29),
        { ...point, sales: Number(runningRevenue.toFixed(2)) },
      ]);

      setTotalRevenue(Number(runningRevenue.toFixed(2)));
      setSalesCount(runningCount);
      setAverageSale(Number((runningRevenue / runningCount).toFixed(2)));

      const payment: LatestPayment = {
        id: `${now.getTime()}-${tick}`,
        amount: Number(amount.toFixed(2)),
        product: products[tick % products.length],
        customer: customers[tick % customers.length],
        time: formatTime(now),
        classification: getClassification(anomalies, alerts),
      };
      setLatestPayments((prev) => [payment, ...prev].slice(0, 12));
    }, 2500);

    return () => {
      window.clearTimeout(bootstrapTimeout);
      window.clearInterval(interval);
    };
  }, []);

  const totals = useMemo(
    () => ({ totalRevenue, salesCount, averageSale }),
    [averageSale, salesCount, totalRevenue]
  );

  return {
    ...totals,
    cumulativeRevenueData,
    salesChartData,
    latestPayments,
  };
}
