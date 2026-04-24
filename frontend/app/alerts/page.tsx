import type { Metadata } from "next";

import { AlertsPanelApp } from "@/components/alerts/alerts-panel-app";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Deduplicated incident alerts with priority and status workflows.",
};

export default function AlertsPage() {
  return <AlertsPanelApp />;
}
