import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { CreateDashboardApp } from "@/components/dashboard/create-dashboard-app";

export const metadata: Metadata = {
  title: "Create Dashboard",
  description: "Create a new isolated LogGuardian dashboard workspace.",
};

export default function CreateDashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <CreateDashboardApp />
    </div>
  );
}
