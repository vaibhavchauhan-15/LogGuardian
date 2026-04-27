import { Suspense } from "react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { SignInExperience } from "@/components/auth/signin-experience";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to LogGuardian with Google and start monitoring logs in real time.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <AppHeader showProfile={false} />
        <SignInExperience />
      </div>
    </Suspense>
  );
}
