"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Upload, FileAudio, Mic, TrendingUp } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { STAGGER } from "@/lib/motion";
import { getScoreColor } from "@/lib/constants";
import {
  DEMO_TRANSCRIPT_LINES,
  DEMO_KPIS,
  DEMO_COACHING,
  DEMO_SCORE,
  DEMO_STEPS,
} from "@/lib/demo-data";

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

/* ── Step indicator dots ── */
function StepIndicator({ activeStep }: { activeStep: number }) {
  return (
    <div className="hidden flex-col items-center gap-3 lg:flex">
      {DEMO_STEPS.map((step, i) => (
        <div key={step.title} className="flex flex-col items-center">
          <div
            className="h-3 w-3 rounded-full border-2 transition-all duration-300"
            style={{
              borderColor: i <= activeStep ? "var(--signal)" : "var(--border)",
              backgroundColor: i === activeStep ? "var(--signal)" : "transparent",
              boxShadow: i === activeStep ? "0 0 8px var(--signal-glow)" : "none",
            }}
          />
          {i < DEMO_STEPS.length - 1 && (
            <div
              className="h-6 w-px transition-colors duration-300"
              style={{
                backgroundColor: i < activeStep ? "var(--signal)" : "var(--border)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Upload mockup ── */
function UploadMockup({ opacity }: { opacity: number }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity }}>
      <div className="w-full max-w-sm rounded-xl border-2 border-dashed border-primary/30 bg-card/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <p className="font-display text-sm font-semibold">Drop your call recording</p>
        <p className="mt-1 text-xs text-muted-foreground">MP3, WAV, MP4 up to 500MB</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <FileAudio className="h-3.5 w-3.5" />
          <span>sales-call-2024-03.mp3</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Transcript mockup ── */
function TranscriptMockup({ opacity }: { opacity: number }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity }}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-card/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold">Live Transcript</span>
        </div>
        {DEMO_TRANSCRIPT_LINES.map((line, i) => (
          <div key={i} className="flex gap-3">
            <span
              className={`shrink-0 text-xs font-semibold ${line.speaker === "Rep" ? "text-primary" : "text-violet-400"}`}
            >
              {line.speaker}
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">{line.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Score mockup ── */
function ScoreMockup({ opacity }: { opacity: number }) {
  const scoreColor = getScoreColor(DEMO_SCORE);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity }}>
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-5xl font-bold tabular-nums" style={{ color: scoreColor }}>
            {DEMO_SCORE}
          </span>
          <span className="text-xs text-muted-foreground">/100 Overall Score</span>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4">
          {DEMO_KPIS.map((kpi) => (
            <div key={kpi.name} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{kpi.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${kpi.score}%`,
                      backgroundColor: getScoreColor(kpi.score),
                    }}
                  />
                </div>
                <span
                  className="w-6 text-right font-mono text-xs font-semibold"
                  style={{ color: getScoreColor(kpi.score) }}
                >
                  {kpi.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Coach mockup ── */
function CoachMockup({ opacity }: { opacity: number }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity }}>
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold">Coaching Insights</span>
        </div>
        {DEMO_COACHING.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`h-2 w-2 rounded-full ${item.type === "strength" ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              <span
                className={`text-xs font-semibold ${item.type === "strength" ? "text-emerald-400" : "text-amber-400"}`}
              >
                {item.type === "strength" ? "Strength" : "Opportunity"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Desktop: Sticky scroll product demo ── */
function DesktopProductDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const activeStep = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 0, 1, 2, 3]);

  // Opacity ranges for each mockup
  const uploadOpacity = useTransform(scrollYProgress, [0, 0.2, 0.25, 0.3], [1, 1, 0.5, 0]);
  const transcriptOpacity = useTransform(scrollYProgress, [0.2, 0.3, 0.45, 0.55], [0, 1, 1, 0]);
  const scoreOpacity = useTransform(scrollYProgress, [0.45, 0.55, 0.7, 0.8], [0, 1, 1, 0]);
  const coachOpacity = useTransform(scrollYProgress, [0.7, 0.8, 1], [0, 1, 1]);

  // Text opacities — one per step (no hooks in loops)
  const text0Opacity = useTransform(scrollYProgress, [0, 0.05, 0.2, 0.25], [0, 1, 1, 0]);
  const text1Opacity = useTransform(scrollYProgress, [0.25, 0.3, 0.45, 0.5], [0, 1, 1, 0]);
  const text2Opacity = useTransform(scrollYProgress, [0.5, 0.55, 0.7, 0.75], [0, 1, 1, 0]);
  const text3Opacity = useTransform(scrollYProgress, [0.75, 0.8, 1], [0, 1, 1]);
  const textOpacities = [text0Opacity, text1Opacity, text2Opacity, text3Opacity];

  const indicatorOpacity = useTransform(activeStep, (v) => (v >= 0 ? 1 : 0));

  return (
    <div ref={sectionRef} style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: scrolling text panels */}
          <div className="flex items-center gap-6">
            <motion.div className="shrink-0" style={{ opacity: indicatorOpacity }}>
              <StepIndicator activeStep={Math.round(activeStep.get())} />
            </motion.div>
            <div className="relative h-48 flex-1">
              {DEMO_STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  className="absolute inset-0 flex flex-col justify-center"
                  style={{ opacity: textOpacities[i] }}
                >
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    Step {i + 1}
                  </span>
                  <h3 className="font-display text-2xl font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{step.subtitle}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: pinned product mockup */}
          <div className="relative flex min-h-[400px] items-center justify-center">
            <div className="gradient-border w-full overflow-hidden rounded-2xl">
              <div className="relative h-[400px] bg-card p-6">
                <UploadMockup opacity={uploadOpacity as unknown as number} />
                <TranscriptMockup opacity={transcriptOpacity as unknown as number} />
                <ScoreMockup opacity={scoreOpacity as unknown as number} />
                <CoachMockup opacity={coachOpacity as unknown as number} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile: simple vertical stack ── */
function MobileProductDemo() {
  const icons = [Upload, Mic, TrendingUp, TrendingUp];

  return (
    <div className="space-y-8">
      {DEMO_STEPS.map((step, i) => (
        <SectionWrapper key={step.title} delay={i * STAGGER.slow}>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              {(() => {
                const Icon = icons[i];
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Step {i + 1}
              </span>
              <h3 className="font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </SectionWrapper>
      ))}
    </div>
  );
}

export function ProductDemo() {
  const isMobile = useIsMobile();

  return (
    <section id="product-preview">
      <div className="mx-auto max-w-7xl px-6">
        <SectionWrapper className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            See It In Action
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            From upload to coaching in seconds
          </h2>
        </SectionWrapper>
      </div>

      {isMobile ? (
        <div className="mx-auto max-w-7xl px-6">
          <MobileProductDemo />
        </div>
      ) : (
        <DesktopProductDemo />
      )}
    </section>
  );
}
