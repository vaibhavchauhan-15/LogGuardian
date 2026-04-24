"use client";

import { Command, Shield, Zap, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from 'next/link';

import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 50], ["transparent", "var(--background)"]);
  const navBorder = useTransform(scrollY, [0, 50], ["transparent", "var(--border-subtle)"]);

  const features = [
    { icon: Shield, title: "Threat Intelligence", desc: "Automated anomaly detection across your entire cluster." },
    { icon: Zap, title: "Velocity Tracing", desc: "Sub-millisecond query evaluation and bottleneck analysis." },
    { icon: Sparkles, title: "Smart Diagnostics", desc: "Contextual resolution protocols via secure LLMs." }
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <motion.nav
        style={{ backgroundColor: navBg, borderBottomColor: navBorder, borderBottomWidth: 1, borderBottomStyle: 'solid' }}
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 backdrop-blur-md"
      >
        <div className="supabase-container h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-primary-foreground">
             <Command className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-lg text-foreground">LogGuardian</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="nav-link">Product</a>
            <a href="#developers" className="nav-link">Developers</a>
            <a href="#pricing" className="nav-link">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="default" className="h-8 px-4 text-[13px]">
                Start your project
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="supabase-section min-h-screen flex items-center pt-32 lg:pt-0">
        <div className="supabase-container grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
              <span className="tech-label">System Initialization v2.0</span>
            </div>
            
            <h1 className="hero-title text-foreground tracking-tight max-w-150 mt-4 mb-4">
              Build in a weekend. <br className="hidden md:block"/> Scale to millions.
            </h1>
            
            <p className="text-body text-muted-foreground max-w-lg mb-8 text-lg">
              LogGuardian is the open source Log Intelligence alternative. Start your project with a Postgres database, Authentication, real-time alerts, and intelligent trace insights.
            </p>
            
            <div className="flex flex-wrap gap-3 pt-6">
              <Link href="/dashboard">
                <Button size="lg" variant="default" className="rounded-full px-8 text-[14px]">
                  Start your project
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="secondary" size="lg" className="rounded-full px-8 text-[14px]">
                  Request a demo
                </Button>
              </Link>
            </div>
          </div>
          
           <div className="relative h-100 hidden lg:block">
             <div className="absolute inset-0 transition duration-1000 bg-brand/5 blur-[100px] rounded-full pointer-events-none"></div>
             
             {/* Decorative IDE window */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#171717] border border-[#2e2e2e] rounded-xl shadow-none overflow-hidden">
                <div className="bg-[#0f0f0f] px-4 py-3 border-b border-[#2e2e2e] flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#393939]"></div>
                   <div className="w-3 h-3 rounded-full bg-[#393939]"></div>
                   <div className="w-3 h-3 rounded-full bg-[#393939]"></div>
                </div>
                <div className="p-6 font-mono text-[13px] text-[#fafafa] space-y-2">
                   <div className="text-[#898989]">-- Initialize LogGuardian client</div>
                   <div><span className="text-[#3ecf8e]">import</span> { '{' } createClient { '}' } <span className="text-[#3ecf8e]">from</span> <span className="text-[#00c573]">&apos;@logguardian/js&apos;</span>;</div>
                   <br/>
                   <div><span className="text-[#3ecf8e]">const</span> client = createClient(<span className="text-[#00c573]">&apos;https://api.logguardian.io&apos;</span>, <span className="text-[#00c573]">&apos;public-anon-key&apos;</span>);</div>
                   <br/>
                   <div className="text-[#898989]">-- Subscribe to log events</div>
                   <div><span className="text-[#3ecf8e]">await</span> client.channel(<span className="text-[#00c573]">&apos;custom-all-channel&apos;</span>)</div>
                   <div className="pl-4 text-[#b4b4b4]">.on(</div>
                   <div className="pl-8"><span className="text-[#00c573]">&apos;postgres_changes&apos;</span>,</div>
                   <div className="pl-8">{ '{' } event: <span className="text-[#00c573]">&apos;*&apos;</span>, schema: <span className="text-[#00c573]">&apos;public&apos;</span>, table: <span className="text-[#00c573]">&apos;logs&apos;</span> { '}' },</div>
                   <div className="pl-8">(payload) =&gt; console.log(payload)</div>
                   <div className="pl-4 text-[#b4b4b4]">)</div>
                   <div className="pl-4 text-[#b4b4b4]">.subscribe();</div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="supabase-section bg-secondary/20 relative border-t border-border">
        <div className="supabase-container">
          <div className="max-w-3xl mb-16">
            <h2 className="title-section mb-4">Core Capabilities</h2>
            <p className="text-body text-muted-foreground text-lg">All the database features you need. Built for performance and reliability at any scale.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl p-8 hover:border-border-strong transition-colors cursor-default">
                <div className="w-12 h-12 rounded-xl bg-background border border-border text-foreground flex items-center justify-center mb-6">
                  <feature.icon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="title-card mb-3">{feature.title}</h3>
                <p className="text-body text-muted-foreground mb-6">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="supabase-section text-center relative overflow-hidden bg-background">
        <div className="supabase-container relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="hero-title mb-10">
            Build in a weekend, <br /> scale to millions
          </h2>
          <Button size="lg" variant="default" className="rounded-full px-8 text-[14px]">
            Start your project
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-16">
        <div className="supabase-container grid md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Command className="w-5 h-5 text-muted-foreground" />
              <span className="font-bold text-foreground">LogGuardian</span>
            </div>
            <div className="flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground font-medium mb-2">Product</span>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Database</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Auth</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Functions</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground font-medium mb-2">Resources</span>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Documentation</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Guides</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">API Reference</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground font-medium mb-2">Company</span>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Blog</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Careers</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}