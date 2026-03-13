"use client";

import { ChevronRight } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { UploadIcon, AnalyzeIcon, CoachIcon } from "./animated-icons";
import { STAGGER } from "@/lib/motion";
import type { FC } from "react";

interface Step {
  number: number;
  title: string;
  description: string;
  IconComponent: FC;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Upload",
    description:
      "Drop in a call recording or paste a transcript. We support all major audio and video formats.",
    IconComponent: UploadIcon,
  },
  {
    number: 2,
    title: "Analyze",
    description:
      "AI scores the call across 10 KPIs including BANT qualification, objection handling, and talk-to-listen ratio.",
    IconComponent: AnalyzeIcon,
  },
  {
    number: 3,
    title: "Coach",
    description:
      "Get instant, actionable coaching with specific transcript citations and improvement tactics.",
    IconComponent: CoachIcon,
  },
];

export function HowItWorks() {
  return (
    <SectionWrapper className="py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            How It Works
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Three steps to better calls
          </h2>
        </div>

        <div className="relative grid gap-12 md:grid-cols-3 md:gap-8">
          {/* Connecting gradient line with CSS scroll-driven animation */}
          <div className="pointer-events-none absolute top-24 left-[16.67%] right-[16.67%] hidden md:block">
            <div className="h-px w-full origin-left bg-gradient-to-r from-transparent via-primary/30 to-transparent scroll-reveal" />
          </div>

          {/* Chevron arrows */}
          <div className="pointer-events-none absolute top-24 left-[16.67%] right-[16.67%] hidden -translate-y-1/2 md:block">
            <ChevronRight
              className="absolute left-[33%] -translate-x-1/2 animate-pulse text-primary/40"
              size={20}
            />
            <ChevronRight
              className="absolute left-[66%] -translate-x-1/2 animate-pulse text-primary/40"
              size={20}
              style={{ animationDelay: "0.5s" }}
            />
          </div>

          {steps.map((step, i) => (
            <SectionWrapper
              key={step.number}
              delay={i * STAGGER.slow}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">
                {step.number}
              </div>

              {/* Animated SVG icon */}
              <div className="mb-6 flex h-32 w-32 items-center justify-center">
                <step.IconComponent />
              </div>

              <h3 className="mb-2 font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
