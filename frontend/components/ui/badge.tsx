import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-(--lg-accent-strong)/20 text-foreground",
        secondary: "border-transparent bg-(--lg-accent-soft) text-foreground",
        warning: "border-transparent bg-amber-500/20 text-amber-300 dark:text-amber-200",
        destructive: "border-transparent bg-red-500/20 text-red-300 dark:text-red-200",
        outline: "border-(--border) text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
