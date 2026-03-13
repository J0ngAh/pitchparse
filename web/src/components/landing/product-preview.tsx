"use client";

import dynamic from "next/dynamic";
import { SectionWrapper } from "./section-wrapper";
import { Phone, Target, AlertTriangle, TrendingUp } from "lucide-react";
import { getScoreColor } from "@/lib/constants";

const ScoreGauge = dynamic(
  () => import("@/components/charts/score-gauge").then((mod) => mod.ScoreGauge),
  { ssr: false },
);

const MetricCard = dynamic(
  () => import("@/components/cards/metric-card").then((mod) => mod.MetricCard),
  { ssr: false },
);

const WaveformBg = dynamic(
  () => import("@/components/effects/waveform-bg").then((mod) => mod.WaveformBg),
  { ssr: false },
);

export function ProductPreview() {
  return (
    <SectionWrapper className="py-24" id="product-preview">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            Product Preview
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Your command center for call quality
          </h2>
        </div>

        {/* Dashboard mockup */}
        <div className="gradient-border overflow-hidden rounded-2xl">
          <div className="relative bg-card p-6 md:p-8">
            {/* Waveform accent */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 opacity-15">
              <WaveformBg height={80} barCount={80} />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Metric row */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard value={87} label="Avg Score" icon={Target} color="signal" />
                <MetricCard value={142} label="Calls Analyzed" icon={Phone} color="violet" />
                <MetricCard value={3} label="Below 60" icon={AlertTriangle} color="rose" />
                <MetricCard
                  value={73}
                  label="Next-Step Conv."
                  icon={TrendingUp}
                  color="emerald"
                  suffix="%"
                />
              </div>

              {/* Center gauge */}
              <div className="flex justify-center py-4">
                <ScoreGauge score={87} size={200} />
              </div>

              {/* Fake leaderboard rows */}
              <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4">
                <p className="font-display text-sm font-semibold text-muted-foreground">
                  Consultant Leaderboard
                </p>
                {[
                  { name: "Sarah Chen", score: 92, calls: 34 },
                  { name: "Mike Torres", score: 85, calls: 28 },
                  { name: "Alex Kim", score: 78, calls: 41 },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/30"
                  >
                    <span className="text-sm font-medium">{row.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.calls} calls
                      </span>
                      <span
                        className="font-mono text-sm font-semibold"
                        style={{ color: getScoreColor(row.score) }}
                      >
                        {row.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
