"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignInExperience() {
  const prefersReducedMotion = useReducedMotion();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const redirectTimerRef = useRef<number | undefined>(undefined);
  const animationSrc = "https://lottie.host/9883ccce-8ae7-4b8a-b4c7-046497275c5b/vQQlFXyBLC.lottie";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const authEnabled = Boolean(supabaseUrl);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== undefined) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleGoogleSignIn = () => {
    if (!authEnabled || isSigningIn) {
      return;
    }

    setIsSigningIn(true);

    const redirectTo = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL ?? `${window.location.origin}/dashboard`;
    const params = new URLSearchParams({
      provider: "google",
      redirect_to: redirectTo,
      response_type: "token",
    });

    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign(`${supabaseUrl}/auth/v1/authorize?${params.toString()}`);
    }, 820);
  };

  return (
    <div className="min-h-screen bg-background h-dvh overflow-hidden">
      <motion.div
        className="pointer-events-none absolute -left-24 top-[-16%] h-[56dvh] w-[72vw] rounded-full bg-[radial-gradient(circle,rgba(63,213,185,0.22),transparent_62%)] blur-3xl"
        animate={prefersReducedMotion ? undefined : { x: [0, 22, -10, 0], y: [0, 14, -8, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-[-16%] h-[56dvh] w-[70vw] rounded-full bg-[radial-gradient(circle,rgba(114,188,255,0.24),transparent_64%)] blur-3xl"
        animate={prefersReducedMotion ? undefined : { x: [0, -18, 6, 0], y: [0, -10, 8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(115,170,230,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(115,170,230,0.08)_1px,transparent_1px)] bg-size-[30px_30px] opacity-30 mask-[radial-gradient(circle_at_center,black_34%,transparent_82%)]" />

      <main className="mx-auto flex h-full w-full max-w-3xl items-center px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <motion.section
          className="bg-card border border-border shadow-none relative mx-auto flex h-full w-full max-h-215 flex-col overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-8"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.003, boxShadow: "0 22px 52px rgba(18,34,57,0.28)" }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  borderColor: isSigningIn ? "rgba(114,188,255,0.5)" : "rgba(150,193,255,0.2)",
                }
          }
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_12%,rgba(114,188,255,0.2),transparent_45%),radial-gradient(circle_at_14%_88%,rgba(63,213,185,0.14),transparent_34%)]" />

          <h1 className="relative z-10 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Sign in to LogGuardian</h1>

          <motion.div
            className="relative z-10 mt-5 flex min-h-70 flex-1 items-center justify-center rounded-2xl border border-[rgba(122,175,229,0.24)] bg-[rgba(4,17,36,0.42)] p-3 sm:min-h-80 sm:p-4"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    boxShadow: isSigningIn
                      ? "0 0 0 1px rgba(114,188,255,0.46), 0 0 38px rgba(114,188,255,0.28)"
                      : "0 0 0 1px rgba(122,175,229,0.12), 0 0 20px rgba(114,188,255,0.1)",
                  }
            }
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <DotLottieReact src={animationSrc} loop autoplay={!prefersReducedMotion} className="h-full w-full" />
          </motion.div>

          <div className="relative z-10 mt-5">
            <motion.div
              whileHover={!isSigningIn && authEnabled && !prefersReducedMotion ? { scale: 1.01 } : undefined}
              whileTap={!isSigningIn && authEnabled && !prefersReducedMotion ? { scale: 0.99 } : undefined}
            >
              <Button
                type="button"
                size="lg"
                variant="default"
                className="w-full justify-center"
                onClick={handleGoogleSignIn}
                disabled={!authEnabled || isSigningIn}
              >
                {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {!isSigningIn ? (
                  <>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#1a73e8]">
                      G
                    </span>
                    Continue with Google
                  </>
                ) : null}
                {isSigningIn ? <span>Continue with Google</span> : null}
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
