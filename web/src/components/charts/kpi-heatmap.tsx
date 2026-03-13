"use client";

import { ResponsiveHeatMap } from "@nivo/heatmap";
import { nivoDarkTheme } from "@/styles/chart-theme";
import { KPI_SHORT_NAMES } from "@/lib/constants";

interface HeatmapAnalysis {
  consultant_name?: string | null;
  scorecard?: Record<string, { score: number }> | null;
}

interface KpiHeatmapProps {
  analyses: HeatmapAnalysis[];
}

export function KpiHeatmap({ analyses }: KpiHeatmapProps) {
  // Aggregate: consultant -> kpi -> scores
  const byConsultant: Record<string, Record<string, number[]>> = {};
  const allKpis = new Set<string>();

  for (const a of analyses) {
    const name = a.consultant_name || "Unknown";
    if (!byConsultant[name]) byConsultant[name] = {};
    for (const [kpi, data] of Object.entries(a.scorecard || {})) {
      allKpis.add(kpi);
      if (!byConsultant[name][kpi]) byConsultant[name][kpi] = [];
      byConsultant[name][kpi].push(data.score);
    }
  }

  const kpiList = Array.from(allKpis);
  const data = Object.entries(byConsultant).map(([consultant, kpis]) => ({
    id: consultant,
    data: kpiList.map((kpi) => {
      const scores = kpis[kpi] || [];
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        x: KPI_SHORT_NAMES[kpi] || kpi,
        y: Math.round(avg * 10) / 10,
      };
    }),
  }));

  if (data.length === 0) return null;

  return (
    <div style={{ height: Math.max(200, data.length * 60 + 80) }}>
      <ResponsiveHeatMap
        data={data}
        margin={{ top: 40, right: 20, bottom: 20, left: 100 }}
        axisTop={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -30,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        colors={{
          type: "sequential",
          scheme: "red_yellow_green",
          minValue: 0,
          maxValue: 5,
        }}
        emptyColor="rgba(255,255,255,0.05)"
        borderRadius={4}
        borderWidth={2}
        borderColor="rgba(0,0,0,0.3)"
        labelTextColor={{ from: "color", modifiers: [["darker", 3]] }}
        theme={nivoDarkTheme}
        animate
      />
    </div>
  );
}
