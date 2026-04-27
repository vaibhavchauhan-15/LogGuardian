"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ExternalLink, Shield, Star } from "lucide-react";
import { useState } from "react";

import { GetStartedButton } from "@/components/auth/get-started-button";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Docs", href: "/docs" },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "GitHub", href: "https://github.com" },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 60);
  });

  return (
    <motion.nav
      className={`fixed inset-x-0 top-0 z-50 h-15 border-b bg-background/80 backdrop-blur-md ${
        scrolled ? "border-border" : "border-border/60"
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-brand/40 bg-brand/15 text-brand">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">LogGuardian</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target={link.label === "GitHub" ? "_blank" : undefined}
              rel={link.label === "GitHub" ? "noreferrer" : undefined}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 items-center gap-1.5 px-3 text-xs text-muted-foreground sm:inline-flex"
            asChild
          >
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="Star on GitHub">
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Star on GitHub</span>
              <span className="font-mono text-[11px] text-foreground">2.1k</span>
            </a>
          </Button>

          <GetStartedButton
            size="sm"
            className="h-9 bg-brand px-4 text-xs font-semibold text-black hover:bg-brand/90"
          >
            <span className="inline-flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Get Started
            </span>
          </GetStartedButton>
        </div>
      </div>
    </motion.nav>
  );
}
