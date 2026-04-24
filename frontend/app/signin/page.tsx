import { Suspense } from "react";
import type { Metadata } from "next";

import { SignInExperience } from "@/components/auth/signin-experience";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to LogGuardian with Google and start monitoring logs in real time.",
};

export default function SignInPage() {
  // useSearchParams() inside SignInExperience requires a Suspense boundary.
  return (
    <Suspense>
      <SignInExperience />
    </Suspense>
  );
}
