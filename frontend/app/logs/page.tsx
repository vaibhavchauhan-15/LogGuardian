import type { Metadata } from "next";

import { LogViewerApp } from "@/components/logs/log-viewer-app";

export const metadata: Metadata = {
  title: "Log Viewer",
  description: "Advanced filtering and drill-down view for LogGuardian logs.",
};

export default function LogsPage() {
  return <LogViewerApp />;
}
