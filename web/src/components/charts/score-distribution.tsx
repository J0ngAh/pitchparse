"use client";

import { ResponsiveBar } from "@nivo/bar";
import { nivoDarkTheme } from "@/styles/chart-theme";
import { COLORS, DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { AnalysisResponse } from "@/types/api";

interface ScoreDistributionProps {
  analyses: AnalysisResponse[];
}

export function ScoreDistribution({ analyses }: ScoreDistributionProps) {
  const t = DEFAULT_THRESHOLDS;
  const bins = [
    {
      label: "Critical",
      range: [0, t.poor - 1],
      color: COLORS.red,
      count: 0,
    },
    {
      label: "Poor",
      range: [t.poor, t.needs_improvement - 1],
      color: COLORS.orange,
      count: 0,
    },
    {
      label: "Needs Imp.",
      range: [t.needs_improvement, t.good - 1],
      color: COLORS.yellow,
      count: 0,
    },
    {
      label: "Good",
      range: [t.good, t.exceptional - 1],
      color: COLORS.green,
      count: 0,
    },
    {
      label: "Exceptional",
      range: [t.exceptional, 100],
      color: COLORS.signal,
      count: 0,
    },
  ];

  for (const a of analyses) {
    if (a.overall_score == null) continue;
    for (const bin of bins) {
      if (a.overall_score >= bin.range[0] && a.overall_score <= bin.range[1]) {
        bin.count++;
        break;
      }
    }
  }

  const data = bins.map((b) => ({
    category: b.label,
    count: b.count,
    color: b.color,
  }));

  return (
    <div className="h-72">
      <ResponsiveBar
        data={data}
        keys={["count"]}
        indexBy="category"
        margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
        padding={0.4}
        colors={({ data: d }) => (d as unknown as { color: string }).color}
        borderRadius={4}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        labelSkipWidth={20}
        labelSkipHeight={20}
        labelTextColor={COLORS.text}
        theme={nivoDarkTheme}
        isInteractive
        animate
      />
    </div>
  );
}
