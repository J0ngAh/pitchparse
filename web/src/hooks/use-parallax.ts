"use client";

import { useRef } from "react";
import { useScroll, useTransform, type MotionValue } from "motion/react";

/**
 * Lightweight scroll-linked parallax offset.
 * Returns a MotionValue<number> that shifts from +range to -range
 * as the target element scrolls through the viewport.
 */
export function useParallax(range = 40): {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

  return { ref, y };
}
