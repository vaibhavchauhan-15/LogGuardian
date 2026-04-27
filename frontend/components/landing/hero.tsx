"use client";

import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";

import { GetStartedButton } from "@/components/auth/get-started-button";
import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/landing/terminal-demo";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 pb-14 pt-28 md:px-6 md:pb-20 md:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(62,207,142,0.18), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-[58%] h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(62,207,142,0.45), transparent)",
          animation: "scanPulse 4s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0, ease: easeOut }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-xs text-brand"
        >
          <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Open Source - Free Forever - v1.0
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
          className="mt-7 max-w-4xl text-4xl font-normal leading-[0.97] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-[80px]"
        >
          Catch failures
          <br />
          before they <span className="text-brand">catch you.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
          className="mt-7 max-w-xl text-base text-muted-foreground md:text-lg"
        >
          Real-time anomaly detection powered by open-source ML.
          <br className="hidden sm:block" />
          Monitor logs, predict failures, and ship with confidence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: easeOut }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <GetStartedButton className="h-11 bg-brand px-6 text-sm font-semibold text-black hover:bg-brand/90">
            <span className="inline-flex items-center gap-2">
              Deploy in 5 minutes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </GetStartedButton>

          <Button variant="ghost" className="h-11 px-5 text-sm" asChild>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View on GitHub
            </a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: easeOut }}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          <span>✦ No credit card</span>
          <span>✦ MIT License</span>
          <span>✦ Self-hostable</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: easeOut }}
          className="mt-10 w-full max-w-3xl"
        >
          <TerminalDemo />
        </motion.div>
      </div>
    </section>
  );
}
