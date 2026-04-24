"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

type ScrollTextBlockProps = {
  text: string;
};

const Word = ({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) => {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const y = useTransform(progress, range, [10, 0]);
  return (
    <motion.span
      style={{ opacity, y }}
      className="inline-block"
      transition={{ ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
};

export function ScrollTextBlock({ text }: ScrollTextBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: blockRef,
    offset: ["start 0.8", "start 0.4"],
  });

  const words = text.split(" ");

  return (
    <div ref={blockRef} className="bg-card border border-border shadow-none rounded-[12px] p-6 overflow-hidden rounded-3xl p-8 md:p-16">
      <p className="lg-kicker mb-6">Scroll Signal</p>
      <div className="flex flex-wrap gap-x-2.5 gap-y-2 text-2xl font-semibold leading-tight sm:text-4xl lg:text-5xl tracking-tight">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + (1 / words.length);
          return (
            <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
              {word}
            </Word>
          );
        })}
      </div>
    </div>
  );
}
