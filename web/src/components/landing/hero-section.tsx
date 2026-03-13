"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { WaveformBg } from "@/components/effects/waveform-bg";
import { HeroVisual } from "./animated-icons";
import { useParallax } from "@/hooks/use-parallax";
import { useRef } from "react";
import { staggerContainer, staggerChild, VIEWPORT } from "@/lib/motion";

export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const { ref: parallaxRef, y: parallaxY } = useParallax(40);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const containerVariants = staggerContainer(0.1);
  const childVariants = staggerChild();

  return (
    <motion.section
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden"
      style={reducedMotion ? undefined : { opacity: heroOpacity }}
    >
      {/* Background layers */}
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />

      {/* Waveform background with parallax */}
      <motion.div
        ref={parallaxRef}
        className="pointer-events-none absolute bottom-0 left-0 right-0 opacity-20"
        style={reducedMotion ? undefined : { y: parallaxY }}
      >
        <WaveformBg height={200} barCount={120} />
      </motion.div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pt-24 pb-16 lg:grid-cols-2 lg:items-center lg:pt-32">
        {/* Left: Copy */}
        <motion.div
          className="flex flex-col gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={childVariants}
            className="font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl"
          >
            Every call, <span className="text-primary text-glow-signal">parsed</span>.
            <br />
            Every rep, <span className="text-primary text-glow-signal">sharper</span>.
          </motion.h1>

          <motion.p variants={childVariants} className="max-w-lg text-lg text-muted-foreground">
            AI-powered sales call QA that scores every conversation across 10 KPIs, delivers instant
            coaching, and turns your team into closers.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={childVariants} className="flex flex-wrap gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-signal"
              >
                Start Free Trial
              </Button>
            </Link>
            <a href="#product-preview">
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </a>
          </motion.div>

          {/* Social proof strip */}
          <motion.div variants={childVariants} className="flex items-center gap-3 pt-4">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((letter, i) => (
                <div
                  key={letter}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/30 to-violet-500/30 text-xs font-medium"
                  style={{ zIndex: 4 - i }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-foreground">200+</span> sales teams
            </p>
          </motion.div>
        </motion.div>

        {/* Right: Animated waveform visual (desktop only) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          viewport={VIEWPORT}
          className="hidden lg:flex lg:items-center lg:justify-center"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </motion.section>
  );
}
