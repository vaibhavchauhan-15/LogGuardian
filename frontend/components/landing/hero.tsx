"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/landing/terminal-demo";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 pb-14 pt-28 md:px-6 md:pb-20 md:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(250,250,250,0.15) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, rgba(62,207,142,0.15), rgba(62,207,142,0.03) 36%, transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-[60%] h-px bg-linear-to-r from-transparent via-brand/40 to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0, ease: easeOut }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-xs text-brand"
        >
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          Open Source - Free Forever - v1.0
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
          className="mt-7 max-w-4xl text-4xl font-normal leading-none tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-[72px]"
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
          <Button className="h-11 bg-brand px-6 text-sm font-semibold text-black hover:bg-brand/90" asChild>
            <Link href="/signin" className="inline-flex items-center gap-2">
              Deploy in 5 minutes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

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
