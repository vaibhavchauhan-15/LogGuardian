"use client";

import { useEffect, useMemo, useState } from "react";

type LineType = "cmd" | "info" | "success" | "log" | "warn" | "error" | "alert";

type LogLine = {
  delay: number;
  type: LineType;
  text: string;
};

const LOG_LINES: LogLine[] = [
  { delay: 0, type: "cmd", text: "$ logguardian start --watch ./logs/prod.log" },
  { delay: 800, type: "info", text: "[INFO]  Connecting to log stream..." },
  { delay: 1400, type: "success", text: "[OK]    Stream connected. Watching 3 services." },
  { delay: 2200, type: "log", text: "[LOG]   2024-01-15 10:42:01 - GET /api/users 200 12ms" },
  { delay: 2600, type: "log", text: "[LOG]   2024-01-15 10:42:03 - GET /api/health 200 4ms" },
  { delay: 3000, type: "log", text: "[LOG]   2024-01-15 10:42:07 - POST /api/auth 200 89ms" },
  { delay: 3600, type: "warn", text: "[WARN]  Anomaly score: 0.71 - DB response latency spike" },
  { delay: 4200, type: "log", text: "[LOG]   2024-01-15 10:42:11 - GET /api/orders 504 12003ms" },
  { delay: 4800, type: "error", text: "[CRITICAL] score: 0.94 - Cascade failure predicted" },
  { delay: 5200, type: "alert", text: "Alert sent -> Telegram · #ops-alerts" },
  { delay: 5800, type: "info", text: "[AI]    Root cause: DB connection pool exhausted" },
];

const lineClassMap: Record<LineType, string> = {
  cmd: "text-brand",
  info: "text-muted-foreground",
  success: "text-green-400",
  log: "text-zinc-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  alert: "font-semibold text-brand",
};

export function TerminalDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycle, setCycle] = useState(0);

  const visibleLines = useMemo(() => LOG_LINES.slice(0, visibleCount), [visibleCount]);

  useEffect(() => {
    const timerIds: number[] = [];

    LOG_LINES.forEach((line, index) => {
      const id = window.setTimeout(() => {
        setVisibleCount(index + 1);
      }, line.delay);

      timerIds.push(id);
    });

    const maxDelay = LOG_LINES[LOG_LINES.length - 1]?.delay ?? 0;
    const restartId = window.setTimeout(() => {
      setVisibleCount(0);
      setCycle((previous) => previous + 1);
    }, maxDelay + 3000);

    timerIds.push(restartId);

    return () => {
      timerIds.forEach((id) => window.clearTimeout(id));
    };
  }, [cycle]);

  return (
    <div className="w-full">
      <div className="hidden overflow-hidden rounded-xl border border-border bg-[#0d0d0d] shadow-[0_32px_80px_rgba(0,0,0,0.5)] md:block">
        <div className="flex items-center justify-between border-b border-border/70 bg-black/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <p className="font-mono text-[11px] text-zinc-400">logguardian - anomaly-detector</p>
          <span className="w-10" aria-hidden="true" />
        </div>

        <div className="h-[320px] space-y-1 overflow-hidden px-5 py-4 font-mono text-[13px] leading-relaxed">
          {visibleLines.map((line, index) => (
            <p key={`${cycle}-${line.delay}`} className={lineClassMap[line.type]}>
              {line.text}
              {index === visibleLines.length - 1 ? (
                <span className="ml-1 inline-block animate-pulse text-brand">▊</span>
              ) : null}
            </p>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-[#0d0d0d] p-3 md:hidden">
        <p className="font-mono text-[11px] text-zinc-500">logguardian - live watch</p>
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          {visibleLines.slice(-4).map((line, index, arr) => (
            <p key={`${cycle}-mobile-${line.delay}`} className={lineClassMap[line.type]}>
              {line.text}
              {index === arr.length - 1 ? <span className="ml-1 animate-pulse">▊</span> : null}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
