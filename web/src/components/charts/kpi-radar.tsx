"use client";

import { ResponsiveRadar } from "@nivo/radar";
import { nivoDarkTheme } from "@/styles/chart-theme";
import { COLORS, KPI_SHORT_NAMES, BANT_KPIS } from "@/lib/constants";
import type { ScorecardEntry } from "@/types/api";

interface KpiRadarProps {
  scorecard: Record<string, ScorecardEntry>;
  type?: "kpi" | "bant";
}

export function KpiRadar({ scorecard, type = "kpi" }: KpiRadarProps) {
  const kpis =
    type === "bant" ? BANT_KPIS : Object.keys(scorecard).filter((k) => !k.startsWith("BANT"));

  const data = kpis.map((kpi) => ({
    kpi: KPI_SHORT_NAMES[kpi] || kpi,
    score: scorecard[kpi]?.score || 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-72">
      <ResponsiveRadar
        data={data}
        keys={["score"]}
        indexBy="kpi"
        maxValue={5}
        margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
        gridShape="circular"
        gridLevels={5}
        gridLabelOffset={16}
        dotSize={8}
        dotColor={COLORS.signalLight}
        dotBorderWidth={2}
        dotBorderColor={COLORS.signal}
        colors={[COLORS.signal]}
        fillOpacity={0.2}
        borderWidth={2}
        borderColor={COLORS.signal}
        theme={nivoDarkTheme}
        isInteractive
      />
    </div>
  );
}
