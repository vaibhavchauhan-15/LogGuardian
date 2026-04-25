"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ExternalLink, Shield } from "lucide-react";
import { useRef } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

export function Footer() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });

  return (
    <motion.footer
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUpVariant}
      className="relative border-t border-[#1a1a1a] px-4 pb-8 pt-10 md:px-6"
      style={{ background: "linear-gradient(to bottom, #0d0d0d, #0a0a0a)" }}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/40 bg-brand/15 text-brand">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-semibold">LogGuardian</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#architecture" className="transition-colors hover:text-foreground">
              Architecture
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-muted-foreground">
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="transition-colors hover:text-foreground">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="transition-colors hover:text-foreground">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <p className="mt-6 border-t border-border pt-6 text-center font-mono text-xs text-muted-foreground">
          © 2024 LogGuardian. MIT License. Built with ♥ for the open-source community.
        </p>
      </div>
    </motion.footer>
  );
}
