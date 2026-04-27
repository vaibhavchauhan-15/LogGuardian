import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { DashboardApp } from "@/components/dashboard/dashboard-app";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Operational workspace for realtime monitoring and ingestion controls.",
};

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <DashboardApp />
    </div>
  );
}
