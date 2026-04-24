import type { Metadata } from "next";

import { DashboardProjectDetailApp } from "@/components/dashboard/dashboard-project-detail-app";

type DashboardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Dashboard Detail",
  description: "Isolated metrics, alerts, and recent logs for a single LogGuardian dashboard.",
};

export default async function DashboardDetailPage({ params }: DashboardDetailPageProps) {
  const { id } = await params;
  return <DashboardProjectDetailApp dashboardId={id} />;
}
