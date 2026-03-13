import type { Variants } from "motion/react";

type CubicBezier = [number, number, number, number];

/* ── Easing ── */
export const EASE = {
  smooth: [0.4, 0, 0.2, 1] as CubicBezier,
  snappy: [0.22, 1, 0.36, 1] as CubicBezier,
  spring: { type: "spring" as const, stiffness: 300, damping: 24 },
  gentle: { type: "spring" as const, stiffness: 150, damping: 20 },
};

/* ── Durations (seconds) ── */
export const DURATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  reveal: 0.7,
};

/* ── Stagger delays ── */
export const STAGGER = {
  fast: 0.05,
  normal: 0.08,
  slow: 0.12,
};

/* ── Viewport settings ── */
export const VIEWPORT = { once: true, margin: "-80px" as const };

/* ── Factory: fade-up reveal ── */
export function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT,
    transition: { duration: DURATION.reveal, ease: EASE.smooth, delay },
  };
}

/* ── Factory: fade-in (opacity only) ── */
export function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: VIEWPORT,
    transition: { duration: DURATION.slow, ease: EASE.smooth, delay },
  };
}

/* ── Factory: scale-in ── */
export function scaleIn(delay = 0) {
  return {
    initial: { opacity: 0, scale: 0.95 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: VIEWPORT,
    transition: { duration: DURATION.slow, ease: EASE.smooth, delay },
  };
}

/* ── Stagger container + child variants ── */
export function staggerContainer(staggerDelay = STAGGER.normal): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: staggerDelay },
    },
  };
}

export function staggerChild(): Variants {
  return {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.normal, ease: EASE.smooth },
    },
  };
}

/**
 * Will-change convention note:
 * Framer Motion manages will-change automatically for its own animations.
 * For custom rAF components (WaveformBg, ScoreDecode, ScoreGauge),
 * apply will-change only during active animation and remove when done.
 */
