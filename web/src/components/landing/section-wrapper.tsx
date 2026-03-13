"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE, DURATION, VIEWPORT } from "@/lib/motion";

type Variant = "fade-up" | "fade-in" | "scale-in";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
  variant?: Variant;
}

const variantMap: Record<Variant, { opacity: number; y?: number; scale?: number }> = {
  "fade-up": { opacity: 0, y: 32 },
  "fade-in": { opacity: 0 },
  "scale-in": { opacity: 0, scale: 0.95 },
};

export function SectionWrapper({
  children,
  className,
  delay = 0,
  id,
  variant = "fade-up",
}: SectionWrapperProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      initial={reducedMotion ? { opacity: 1 } : variantMap[variant]}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEWPORT}
      transition={{
        duration: DURATION.slow,
        ease: EASE.smooth,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
