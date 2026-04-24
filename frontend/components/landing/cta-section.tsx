"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Check, Clipboard } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const command = "docker run -p 8000:8000 logguardian/logguardian:latest";

export function CtaSection() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section ref={ref} className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand/5 to-transparent" />
      <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[clamp(72px,18vw,220px)] font-semibold tracking-[0.2em] text-foreground opacity-[0.03]">
        LOGGUARDIAN
      </p>

      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={fadeUpVariant}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center md:px-6"
      >
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Start monitoring in 5 minutes.</h2>
        <p className="mt-4 text-muted-foreground md:text-lg">One Docker command. No credit card. No lock-in.</p>

        <div className="mt-7 w-full rounded-xl border border-border bg-[#0d0d0d] p-3 text-left">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">bash</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[11px] text-zinc-300 hover:text-white"
              aria-label="Copy docker command"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="block overflow-x-auto font-mono text-sm text-brand">{command}</code>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button className="h-11 bg-brand px-6 text-sm font-semibold text-black hover:bg-brand/90" asChild>
            <Link href="/docs">Read the Docs</Link>
          </Button>
          <Button variant="ghost" className="h-11 px-5 text-sm" asChild>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              Star on GitHub 2.1k
            </a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
