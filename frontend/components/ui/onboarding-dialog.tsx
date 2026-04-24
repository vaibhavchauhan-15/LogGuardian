"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const slides = [
  {
    id: "visibility",
    alt: "System visibility overview",
    title: "See anomalies before outages",
    description:
      "Monitor spikes, model confidence, and service drift from a single operational surface.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "workflows",
    alt: "Alert workflows",
    title: "Route incidents with context",
    description:
      "Escalate suspicious patterns with event context so triage is faster and less noisy.",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "insights",
    alt: "Insights trends",
    title: "Track risk over time",
    description:
      "Compare warning, alert, and suspicious trends to understand where resilience is improving.",
    image:
      "https://images.unsplash.com/photo-1551281044-8b5bd5f9f8b2?auto=format&fit=crop&w=1400&q=80",
  },
] as const;

interface OnboardingDialogProps {
  defaultOpen?: boolean;
}

export function OnboardingDialog({ defaultOpen = false }: OnboardingDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      setOpen(false);
      return;
    }
    emblaApi?.scrollNext();
  };

  const handlePrev = () => emblaApi?.scrollPrev();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => emblaApi?.scrollTo(0), 50);
        }}
        className="rounded-xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) px-4 py-2 text-sm font-medium transition-colors hover:bg-(--lg-accent-soft)"
      >
        Open Guided Tour
      </button>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/65" onClick={() => setOpen(false)} />

          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-(--border) bg-(--bg-card border border-border shadow-none rounded-[12px] p-6-strong) shadow-(none)"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="p-4 sm:p-5">
              <div ref={emblaRef} className="overflow-hidden rounded-xl">
                <div className="flex">
                  {slides.map((slide) => (
                    <div key={slide.id} className="min-w-0 flex-[0_0_100%]">
                      <img
                        src={slide.image}
                        alt={slide.alt}
                        className="aspect-video w-full rounded-xl object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(idx)}
                    aria-label={`Go to ${slide.title}`}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      idx === activeIndex ? "w-8 bg-foreground" : "w-4 bg-(--border)"
                    )}
                  />
                ))}
              </div>

              <div className="mt-4 min-h-24 px-1">
                <h2 className="text-lg font-semibold tracking-tight">{slides[activeIndex]?.title}</h2>
                <p className="mt-2 text-sm text-(--muted-foreground)">{slides[activeIndex]?.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between px-1 pb-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isFirst}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-(--muted-foreground) transition-colors hover:bg-(--lg-accent-soft) disabled:opacity-40"
                >
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-(--muted-foreground) transition-colors hover:bg-(--lg-accent-soft)"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-lg border border-(--border) bg-(--lg-accent-strong) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[color-mix(in_oklab,var(--lg-accent-strong),black_10%)]"
                  >
                    {isLast ? "Start Monitoring" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
