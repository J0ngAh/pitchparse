"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useInView } from "motion/react";

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
  decimals?: number;
}

/**
 * Animate a number from 0 to `end` when the element enters the viewport.
 * Uses requestAnimationFrame with cubic ease-out.
 */
export function useCountUp(end: number, opts: UseCountUpOptions = {}) {
  const { duration = 800, delay = 0, decimals = 0 } = opts;
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [displayValue, setDisplayValue] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (isNaN(end)) {
      setDisplayValue(end);
      setIsComplete(true);
      return;
    }

    const factor = Math.pow(10, decimals);
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * end * factor) / factor);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
        setIsComplete(true);
      }
    };

    requestAnimationFrame(step);
  }, [end, duration, decimals]);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const timer = setTimeout(() => {
      requestAnimationFrame(() => animate());
    }, delay);
    return () => clearTimeout(timer);
  }, [isInView, animate, delay]);

  return { ref, displayValue, isComplete };
}
