import type { Metadata } from "next";

import { DashboardProjectsApp } from "@/components/dashboard/dashboard-projects-app";

export const metadata: Metadata = {
  title: "Dashboards",
  description: "Project-based LogGuardian dashboards with strict data isolation.",
};

export default function DashboardPage() {
  return <DashboardProjectsApp />;
}
