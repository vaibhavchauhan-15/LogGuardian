import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { LogViewerApp } from "@/components/logs/log-viewer-app";

export const metadata: Metadata = {
  title: "Log Viewer",
  description: "Advanced filtering and drill-down view for LogGuardian logs.",
};

export default function LogsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <LogViewerApp />
    </div>
  );
}
