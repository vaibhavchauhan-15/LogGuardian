"use client";

import type { LogRecord } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LogDetailModalProps = {
  log: LogRecord | null;
  onClose: () => void;
};

function scoreColor(score: number): string {
  if (score >= 0.7) return "#ff4d4f";
  if (score >= 0.4) return "#f59e0b";
  return "#3ecf8e";
}

function severityLabel(sev: string): string {
  if (sev === "critical") return "Critical";
  if (sev === "suspicious") return "Suspicious";
  return "Normal";
}

function AnomalyGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const radius = 52;
  const cx = 70;
  const cy = 70;
  const arcStart = Math.PI;
  const arcEnd = 2 * Math.PI;
  const angle = arcStart + score * Math.PI;

  const x1 = cx + radius * Math.cos(arcStart);
  const y1 = cy + radius * Math.sin(arcStart);
  const x2 = cx + radius * Math.cos(arcEnd);
  const y2 = cy + radius * Math.sin(arcEnd);

  const ix = cx + radius * Math.cos(angle);
  const iy = cy + radius * Math.sin(angle);

  const bgPath = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  const scorePath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${score > 0.5 ? 1 : 0} 1 ${ix} ${iy}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={140} height={80} viewBox="0 0 140 80">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="#2e2e2e" strokeWidth={10} strokeLinecap="round" />
        {/* Score arc */}
        {score > 0.01 && (
          <path d={scorePath} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
        )}
        {/* Needle dot */}
        <circle cx={ix} cy={iy} r={5} fill={color} />
        {/* Center text */}
        <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize={18} fontWeight={600} fontFamily="IBM Plex Mono">
          {score.toFixed(2)}
        </text>
      </svg>
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color }}>
        {score >= 0.7 ? "Critical" : score >= 0.4 ? "Suspicious" : "Normal"}
      </p>
    </div>
  );
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const color = scoreColor(log.anomaly_score);
  const sev = severityLabel(log.severity);

  return (
    <Dialog open={!!log} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest text-[#898989]">
            Log Detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score gauge + severity */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[#2e2e2e] py-4">
            <AnomalyGauge score={log.anomaly_score} />
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold font-mono uppercase tracking-widest"
              style={{ background: `${color}20`, color }}
            >
              {sev}
            </span>
            <p className="text-center text-xs text-[#898989] max-w-xs">
              Score based on semantic distance from normal log patterns
            </p>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              { label: "Service", value: log.service },
              { label: "Level", value: log.level },
              { label: "Timestamp", value: new Date(log.timestamp).toLocaleString() },
              { label: "Score", value: log.anomaly_score.toFixed(4) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-[#2e2e2e] p-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#898989]">{label}</p>
                <p className="mt-1 font-semibold truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="rounded-xl border border-[#2e2e2e] p-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#898989]">Message</p>
            <p className="text-sm leading-relaxed break-words">{log.message}</p>
          </div>

          {/* Explanation */}
          {log.explanation && (
            <div className="rounded-xl border border-[#2e2e2e] p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#898989]">Explanation</p>
              <p className="text-xs text-[#898989] leading-relaxed">{log.explanation}</p>
            </div>
          )}

          {/* Model breakdown */}
          {log.model_breakdown && Object.keys(log.model_breakdown).length > 0 && (
            <div className="rounded-xl border border-[#2e2e2e] p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#898989]">Model Breakdown</p>
              <div className="space-y-2">
                {Object.entries(log.model_breakdown).map(([key, val]) => {
                  const pct = Math.min(100, Math.round(val * 100));
                  const c = scoreColor(val);
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-mono text-[#898989]">{key}</span>
                        <span style={{ color: c }} className="font-semibold">{val.toFixed(3)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#2e2e2e]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
