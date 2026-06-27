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

export function DashboardCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="px-4 pb-3 pt-4">
        <div className="skeleton h-6 w-20 rounded-md" />
        <div className="skeleton mt-3 h-5 w-3/4 rounded" />
        <div className="skeleton mt-2 h-3.5 w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--card)] px-4 py-3">
          <div className="skeleton h-2.5 w-10 rounded" />
          <div className="skeleton mt-2 h-6 w-16 rounded" />
        </div>
        <div className="bg-[var(--card)] px-4 py-3">
          <div className="skeleton h-2.5 w-16 rounded" />
          <div className="skeleton mt-2 h-6 w-14 rounded" />
        </div>
      </div>
      <div className="border-t border-[var(--border)] px-4 py-2.5">
        <div className="skeleton h-3 w-40 rounded" />
      </div>
      <div className="mt-auto border-t border-[var(--border)] px-4 py-3">
        <div className="skeleton h-3.5 w-28 rounded" />
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
