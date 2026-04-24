import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  className,
}: FeatureCardProps) {
  return (
    <article className={cn("bg-card border border-border shadow-none rounded-[12px] p-6", className)}>
      <div className="inline-flex rounded-xl border border-(--border) bg-(--lg-accent-soft) p-2">
        <Icon className="h-5 w-5 text-(--lg-accent-strong)" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="lg-subtle mt-3 text-sm leading-relaxed">{description}</p>
    </article>
  );
}