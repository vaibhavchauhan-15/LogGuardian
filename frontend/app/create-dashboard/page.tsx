import type { Metadata } from "next";

import { CreateDashboardApp } from "@/components/dashboard/create-dashboard-app";

export const metadata: Metadata = {
  title: "Create Dashboard",
  description: "Create a new isolated LogGuardian dashboard workspace.",
};

export default function CreateDashboardPage() {
  return <CreateDashboardApp />;
}
