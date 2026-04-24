import { AnomalyShowcase } from "@/components/landing/anomaly-showcase";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { StatsBar } from "@/components/landing/stats-bar";
import { TechStack } from "@/components/landing/tech-stack";

export default function Home() {
  return (
    <div className="overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <HowItWorks />
        <FeaturesGrid />
        <AnomalyShowcase />
        <TechStack />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
