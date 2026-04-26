"use client";

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3 animate-pulse">
      <div className="h-2.5 w-24 rounded bg-[var(--muted)]" />
      <div className="mt-3 h-6 w-16 rounded bg-[var(--muted)]" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-[280px] w-full animate-pulse rounded-lg bg-[var(--muted)] flex items-end gap-2 p-4">
      {[40, 65, 30, 80, 55, 70, 45, 90, 35, 60].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-[var(--border)]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function AlertSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-1 rounded-full bg-[var(--border)] self-stretch" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-24 rounded bg-[var(--muted)]" />
        <div className="h-2.5 w-full rounded bg-[var(--muted)]" />
        <div className="h-2 w-20 rounded bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function LogRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 animate-pulse">
      <div className="h-3 w-28 rounded bg-[var(--muted)]" />
      <div className="h-3 w-16 rounded bg-[var(--muted)]" />
      <div className="h-3 flex-1 rounded bg-[var(--muted)]" />
      <div className="h-5 w-14 rounded-full bg-[var(--muted)]" />
    </div>
  );
}
