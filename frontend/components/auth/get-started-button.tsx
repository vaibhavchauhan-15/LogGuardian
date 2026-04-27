"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";

const HAS_SUPABASE_CONFIG = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

type GetStartedButtonProps = Omit<ButtonProps, "onClick" | "type"> & {
  children: ReactNode;
  dashboardPath?: string;
  loginPath?: string;
  nextPath?: string;
};

export function GetStartedButton({
  children,
  dashboardPath = "/dashboard",
  loginPath = "/login",
  nextPath,
  ...buttonProps
}: GetStartedButtonProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = useCallback(async () => {
    if (isChecking) {
      return;
    }

    setIsChecking(true);

    const nextTarget = nextPath ?? dashboardPath;
    const loginTarget = `${loginPath}?next=${encodeURIComponent(nextTarget)}`;
    const redirectTo = (target: string) => {
      setIsChecking(false);
      router.push(target);
    };

    if (!HAS_SUPABASE_CONFIG) {
      redirectTo(loginTarget);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        redirectTo(dashboardPath);
        return;
      }
    } catch {
      // Fall back to login when auth lookup fails.
    }

    redirectTo(loginTarget);
  }, [dashboardPath, isChecking, loginPath, nextPath, router]);

  return (
    <Button type="button" onClick={handleClick} disabled={isChecking} {...buttonProps}>
      {children}
    </Button>
  );
}
