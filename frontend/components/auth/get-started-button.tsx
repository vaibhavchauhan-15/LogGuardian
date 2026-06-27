"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { USER_ID_STORAGE_KEY } from "@/lib/api";
import { Button, type ButtonProps } from "@/components/ui/button";

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

  const handleClick = useCallback(() => {
    if (isChecking) {
      return;
    }

    setIsChecking(true);

    const nextTarget = nextPath ?? dashboardPath;
    const loginTarget = `${loginPath}?next=${encodeURIComponent(nextTarget)}`;

    // A signed-in user has their Firebase UID cached in localStorage.
    const signedIn =
      typeof window !== "undefined" && Boolean(window.localStorage.getItem(USER_ID_STORAGE_KEY));

    router.push(signedIn ? dashboardPath : loginTarget);
    setIsChecking(false);
  }, [dashboardPath, isChecking, loginPath, nextPath, router]);

  return (
    <Button type="button" onClick={handleClick} disabled={isChecking} {...buttonProps}>
      {children}
    </Button>
  );
}
