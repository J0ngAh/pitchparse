"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";
import { EASE, DURATION, STAGGER } from "@/lib/motion";

interface Tier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted?: boolean;
}

const tiers: Tier[] = [
  {
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Try Pitch|Parse with up to 5 calls. No credit card required.",
    cta: "Get Started",
    features: [
      { text: "5 call analyses", included: true },
      { text: "10-KPI scoring", included: true },
      { text: "AI coaching feedback", included: true },
      { text: "1 user", included: true },
      { text: "Team analytics", included: false },
      { text: "Custom KPI weights", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Starter",
    monthlyPrice: 99,
    annualPrice: 82,
    description: "For growing teams that need consistent call quality.",
    cta: "Get Started",
    highlighted: true,
    features: [
      { text: "100 calls / month", included: true },
      { text: "10-KPI scoring", included: true },
      { text: "AI coaching feedback", included: true },
      { text: "Up to 5 users", included: true },
      { text: "Team analytics", included: true },
      { text: "Custom KPI weights", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Team",
    monthlyPrice: 249,
    annualPrice: 207,
    description: "For teams that need full visibility and customization.",
    cta: "Get Started",
    features: [
      { text: "Unlimited calls", included: true },
      { text: "10-KPI scoring", included: true },
      { text: "AI coaching feedback", included: true },
      { text: "Unlimited users", included: true },
      { text: "Team analytics", included: true },
      { text: "Custom KPI weights", included: true },
      { text: "API access", included: true },
    ],
  },
];

function AnimatedPrice({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{
          duration: DURATION.fast,
          ease: EASE.snappy,
        }}
        className="inline-block"
      >
        ${value}
      </motion.span>
    </AnimatePresence>
  );
}

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <SectionWrapper className="py-24" id="pricing">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            Pricing
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              !annual ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              annual ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                annual && "translate-x-5",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium",
              annual ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Annual <span className="text-xs text-primary">(2 months free)</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <SectionWrapper key={tier.name} delay={i * STAGGER.slow}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6",
                  tier.highlighted
                    ? "gradient-border border-transparent"
                    : "border-border bg-card/80",
                )}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-bold">
                      <AnimatedPrice value={annual ? tier.annualPrice : tier.monthlyPrice} />
                    </span>
                    {tier.monthlyPrice > 0 && (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          feature.included ? "text-foreground" : "text-muted-foreground/60",
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="mt-auto">
                  <Button
                    className={cn(
                      "w-full",
                      tier.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-signal-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
