"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getScoreColor } from "@/lib/constants";
import type { PhaseEntry } from "@/types/api";

/** Deterministic PRNG to avoid Math.random() inside useMemo (react-hooks/purity). */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface WaveformRailProps {
  phases: PhaseEntry[];
  className?: string;
  onPhaseClick?: (phaseNumber: number) => void;
  activePhase?: number | null;
}

/**
 * A stylized waveform rail that visualizes call phases as
 * color-coded segments. The height of each segment represents
 * the phase score. Clicking a segment navigates to that phase.
 */
export function WaveformRail({ phases, className, onPhaseClick, activePhase }: WaveformRailProps) {
  const totalBars = 48;

  // Distribute bars across phases proportionally
  const barData = useMemo(() => {
    if (phases.length === 0) return [];

    const random = seededRandom(42);
    const barsPerPhase = Math.floor(totalBars / phases.length);
    const bars: Array<{ height: number; color: string; phaseNumber: number; phaseIdx: number }> =
      [];

    phases.forEach((phase, phaseIdx) => {
      const pct = phase.max > 0 ? (phase.score / phase.max) * 100 : 0;
      const color = getScoreColor(pct);

      for (let j = 0; j < barsPerPhase; j++) {
        // Create a natural waveform shape within each phase
        const t = j / barsPerPhase;
        const envelope = 0.4 + 0.6 * Math.sin(t * Math.PI);
        const baseHeight = (pct / 100) * envelope;
        // Add slight noise for organic feel
        const noise = 0.9 + random() * 0.2;

        bars.push({
          height: Math.max(0.08, baseHeight * noise),
          color,
          phaseNumber: phase.number,
          phaseIdx,
        });
      }
    });

    return bars;
  }, [phases]);

  if (barData.length === 0) return null;

  return (
    <div className={cn("flex h-12 items-center gap-[2px]", className)}>
      {barData.map((bar, i) => {
        const isActive = activePhase === bar.phaseNumber;
        const isNewPhase = i === 0 || barData[i - 1].phaseNumber !== bar.phaseNumber;

        return (
          <button
            key={i}
            onClick={() => onPhaseClick?.(bar.phaseNumber)}
            className={cn(
              "relative flex-1 rounded-full transition-all duration-200",
              isActive ? "opacity-100" : "opacity-60 hover:opacity-80",
              isNewPhase && i > 0 && "ml-1",
            )}
            style={{
              height: `${bar.height * 100}%`,
              minHeight: 4,
              backgroundColor: bar.color,
              boxShadow: isActive ? `0 0 8px ${bar.color}60` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
