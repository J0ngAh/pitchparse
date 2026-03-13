"use client";

import { ResponsiveBar } from "@nivo/bar";
import { nivoDarkTheme } from "@/styles/chart-theme";
import { COLORS, getScoreColor } from "@/lib/constants";
import type { AnalysisResponse } from "@/types/api";

interface ConsultantComparisonProps {
  analyses: AnalysisResponse[];
}

export function ConsultantComparison({ analyses }: ConsultantComparisonProps) {
  const byConsultant: Record<string, number[]> = {};
  for (const a of analyses) {
    if (a.overall_score == null) continue;
    const name = a.consultant_name || "Unknown";
    if (!byConsultant[name]) byConsultant[name] = [];
    byConsultant[name].push(a.overall_score);
  }

  const data = Object.entries(byConsultant)
    .map(([name, scores]) => ({
      consultant: name,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      color: getScoreColor(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.avg - a.avg);

  if (data.length === 0) return null;

  return (
    <div className="h-72">
      <ResponsiveBar
        data={data}
        keys={["avg"]}
        indexBy="consultant"
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
