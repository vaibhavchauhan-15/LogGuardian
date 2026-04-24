"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";

type AnimatedKeywordProps = {
  words: string[];
  intervalMs?: number;
};

export function AnimatedKeyword({ words, intervalMs = 2400 }: AnimatedKeywordProps) {
  const safeWords = useMemo(() => words.filter(Boolean), [words]);
  const [activeIndex, setActiveIndex] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (safeWords.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeWords.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, safeWords.length]);

  if (safeWords.length === 0) {
    return null;
  }

  const activeWord = safeWords[activeIndex];

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition key={activeWord} nodeRef={nodeRef} timeout={320} classNames="lg-word">
        <span ref={nodeRef} className="inline-block min-w-[11ch] text-left">
          {activeWord}
        </span>
      </CSSTransition>
    </SwitchTransition>
  );
}