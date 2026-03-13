"use client";

import { motion } from "motion/react";
import { EASE, DURATION, VIEWPORT } from "@/lib/motion";

export function SectionDivider() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <motion.div
        className="section-divider-glow"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={VIEWPORT}
        transition={{
          duration: DURATION.reveal,
          ease: EASE.smooth,
        }}
        style={{ transformOrigin: "center" }}
      />
    </div>
  );
}
