"use client";

import { ResponsiveLine } from "@nivo/line";
import { nivoDarkTheme } from "@/styles/chart-theme";
import { COLORS } from "@/lib/constants";
import type { PhaseEntry } from "@/types/api";

interface SentimentTrajectoryProps {
  phases: PhaseEntry[];
}

export function SentimentTrajectory({ phases }: SentimentTrajectoryProps) {
  if (!phases.length) return null;

  const data = [
    {
      id: "score",
      data: phases.map((p) => ({
        x: `P${p.number}: ${p.name.split("[")[0].trim()}`,
        y: p.score,
      })),
    },
  ];

  const maxScore = Math.max(...phases.map((p) => p.max || 20));

  return (
    <div className="h-72">
      <ResponsiveLine
        data={data}
        margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, max: maxScore + 4 }}
        curve="cardinal"
        colors={[COLORS.signal]}
        lineWidth={3}
        pointSize={12}
        pointColor={COLORS.signalLight}
        pointBorderWidth={2}
        pointBorderColor={COLORS.signal}
        enableArea
        areaOpacity={0.08}
        areaBaselineValue={0}
        axisBottom={{
          tickSize: 0,
          tickPadding: 12,
          tickRotation: -15,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        enablePointLabel
        pointLabel={(d) => `${d.y}`}
        pointLabelYOffset={-14}
        theme={nivoDarkTheme}
        isInteractive
        animate
      />
    </div>
  );
}
