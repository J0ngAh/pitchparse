"use client";

import { motion } from "motion/react";
import { SectionWrapper } from "./section-wrapper";
import { EASE, STAGGER } from "@/lib/motion";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Pitch|Parse cut our ramp time in half. New reps hit quota 3 weeks faster because they get specific, actionable coaching after every single call.",
    name: "Sarah Chen",
    role: "VP Sales",
    company: "TechFlow",
    initials: "SC",
  },
  {
    quote:
      "We went from reviewing 5% of calls to 100%. The AI catches things our managers miss, and the BANT scoring alone justified the investment.",
    name: "Marcus Rivera",
    role: "Sales Enablement Lead",
    company: "CloudStack",
    initials: "MR",
  },
  {
    quote:
      "The team analytics dashboard is a game-changer. I can spot coaching opportunities before they become missed-quota problems.",
    name: "Jessica Park",
    role: "Director of Revenue",
    company: "DataBridge",
    initials: "JP",
  },
];

export function Testimonials() {
  return (
    <SectionWrapper className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            Testimonials
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Loved by sales leaders</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <SectionWrapper key={t.name} delay={i * STAGGER.slow}>
              <motion.div
                className="glass-card flex h-full flex-col justify-between rounded-2xl p-6 transition-all duration-300 hover:glow-violet"
                whileHover={{ y: -4 }}
                transition={EASE.spring}
              >
                <blockquote className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-violet-500/30 text-xs font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
