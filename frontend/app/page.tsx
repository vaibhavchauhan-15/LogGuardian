import { AnomalyShowcase } from "@/components/landing/anomaly-showcase";
import { AppHeader } from "@/components/app-header";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StatsBar } from "@/components/landing/stats-bar";
import { TechStack } from "@/components/landing/tech-stack";

const SectionDivider = () => (
  <div
    aria-hidden="true"
    className="mx-auto h-px max-w-5xl"
    style={{
      background:
        "linear-gradient(to right, transparent, rgba(255,255,255,0.04), transparent)",
    }}
  />
);

export default function Home() {
  return (
    <>
      <AppHeader showProfile={false} />
      <main className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(62,207,142,0.06), transparent 60%)",
          }}
        />
        <Hero />
        <StatsBar />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <FeaturesGrid />
        <SectionDivider />
        <AnomalyShowcase />
        <SectionDivider />
        <TechStack />
        <SectionDivider />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
