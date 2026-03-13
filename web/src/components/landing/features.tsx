"use client";

import dynamic from "next/dynamic";
import { SectionWrapper } from "./section-wrapper";
import { Target, MessageSquareText, BarChart3 } from "lucide-react";
import { STAGGER, VIEWPORT } from "@/lib/motion";
import { useInView } from "motion/react";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";

const ScoreGauge = dynamic(
  () => import("@/components/charts/score-gauge").then((mod) => mod.ScoreGauge),
  { ssr: false },
);

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  glowClass: string;
  children: React.ReactNode;
}

function FeatureCard({ icon: Icon, title, description, glowClass, children }: FeatureCardProps) {
  return (
    <div
      className={`glass-card group rounded-2xl p-6 transition-all duration-300 hover:${glowClass}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center justify-center">{children}</div>
    </div>
  );
}

function CoachingPreview() {
  return (
    <div className="w-full space-y-3 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">Strength</span>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Strong discovery questions at 2:14 — uncovered core pain point around manual
        reporting.&rdquo;
      </p>
      <hr className="border-border" />
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-xs font-semibold text-amber-400">Opportunity</span>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Budget qualification skipped — try the indirect approach: &lsquo;What does solving
        this look like investment-wise?&rsquo;&rdquo;
      </p>
    </div>
  );
}

function AnimatedBarChart() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, VIEWPORT);
  const bars = [65, 72, 58, 87, 74, 91, 68, 83];

  return (
    <div ref={ref} className="flex w-full items-end justify-center gap-2 px-4 py-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-6 rounded-t-sm bg-primary/60 transition-all duration-500 group-hover:bg-primary"
          style={{
            height: isInView ? `${h}px` : "0px",
            transitionDelay: isInView ? `${i * 50}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

export function Features() {
  return (
    <SectionWrapper className="py-24" id="features">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Everything you need to coach at scale
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <SectionWrapper delay={0}>
            <FeatureCard
              icon={Target}
              title="10-KPI Scoring"
              description="Every call scored on talk ratio, question quality, BANT qualification, objection handling, and more."
              glowClass="glow-signal"
            >
              <div className="flex flex-col items-center gap-2">
                <ScoreGauge score={87} size={140} />
              </div>
            </FeatureCard>
          </SectionWrapper>

          <SectionWrapper delay={STAGGER.slow}>
            <FeatureCard
              icon={MessageSquareText}
              title="AI Coaching"
              description="Instant, actionable feedback with specific transcript citations and improvement tactics."
              glowClass="glow-violet"
            >
              <CoachingPreview />
            </FeatureCard>
          </SectionWrapper>

          <SectionWrapper delay={STAGGER.slow * 2}>
            <FeatureCard
              icon={BarChart3}
              title="Team Analytics"
              description="Track rep performance over time, identify trends, and benchmark against team averages."
              glowClass="glow-emerald"
            >
              <AnimatedBarChart />
            </FeatureCard>
          </SectionWrapper>
        </div>
      </div>
    </SectionWrapper>
  );
}
