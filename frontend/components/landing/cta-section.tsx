"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Check, Clipboard } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const command = "docker run -p 8000:8000 logguardian/logguardian:latest";

export function CtaSection() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });
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
    <section ref={ref} className="relative overflow-hidden py-28">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(62,207,142,0.06), transparent 70%)",
        }}
      />
      <p
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-mono font-bold tracking-[0.25em] text-white opacity-[0.025]"
        style={{ fontSize: "clamp(48px, 10vw, 140px)" }}
      >
        LOGGUARDIAN
      </p>

      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={fadeUpVariant}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center md:px-6"
      >
        <h2 className="text-3xl font-normal tracking-[-0.03em] md:text-5xl">Start monitoring in 5 minutes.</h2>
        <p className="mt-4 text-muted-foreground md:text-lg">One Docker command. No credit card. No lock-in.</p>

        <div className="mt-8 w-full max-w-xl overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-left">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#444]">bash</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2a2a] px-2.5 py-1 font-mono text-[11px] text-[#666] transition-all duration-150 hover:border-[#3ecf8e]/30 hover:text-[#3ecf8e]"
              aria-label="Copy docker command"
            >
              {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="overflow-x-auto px-4 py-4">
            <code className="block font-mono text-sm text-[#3ecf8e]">{command}</code>
          </div>
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
