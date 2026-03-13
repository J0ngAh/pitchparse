"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getScoreColor } from "@/lib/constants";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import type { PhaseEntry } from "@/types/api";

interface PhaseTimelineProps {
  phases: PhaseEntry[];
  className?: string;
}

/**
 * Interactive Phase Journey Timeline — navigate through call phases
 * like scenes in a film. Click a phase to expand its detail view.
 */
export function PhaseTimeline({ phases, className }: PhaseTimelineProps) {
  const [activePhase, setActivePhase] = useState<number | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Timeline rail */}
      <div className="relative flex items-center gap-1">
        {/* Connecting line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />

        {phases.map((phase, i) => {
          const pct = phase.max > 0 ? (phase.score / phase.max) * 100 : 0;
          const color = getScoreColor(pct);
          const isActive = activePhase === phase.number;

          return (
            <button
              key={phase.number}
              onClick={() => setActivePhase(isActive ? null : phase.number)}
              className={cn(
                "group relative z-10 flex flex-1 flex-col items-center gap-2 rounded-xl py-3 transition-all duration-300",
                isActive ? "bg-card" : "hover:bg-card/50",
              )}
            >
              {/* Phase node */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-sm font-bold transition-all duration-300",
                  isActive ? "scale-110" : "group-hover:scale-105",
                )}
                style={{
                  borderColor: color,
                  backgroundColor: isActive ? color + "20" : "var(--card)",
                  color,
                  boxShadow: isActive ? `0 0 16px ${color}40` : "none",
                }}
              >
                {phase.number}
              </div>

              {/* Phase name */}
              <span className="max-w-20 text-center text-[10px] font-medium leading-tight text-muted-foreground">
                {phase.name}
              </span>

              {/* Score pill */}
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                style={{
                  backgroundColor: color + "20",
                  color,
                }}
              >
                {phase.score}/{phase.max}
              </span>

              {/* Connector arrow (except last) */}
              {i < phases.length - 1 && (
                <ChevronRight className="absolute -right-2 top-5 h-3 w-3 text-muted-foreground/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded phase detail */}
      <AnimatePresence mode="wait">
        {activePhase !== null && (
          <motion.div
            key={activePhase}
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {(() => {
              const phase = phases.find((p) => p.number === activePhase);
              if (!phase) return null;
              const pct = phase.max > 0 ? (phase.score / phase.max) * 100 : 0;
              const color = getScoreColor(pct);

              return (
                <div
                  className="rounded-xl border bg-card/80 p-5"
                  style={{ borderColor: color + "30" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold">
                        Phase {phase.number}: {phase.name}
                      </h3>
                      {phase.timestamps && (
                        <span className="font-mono text-xs text-muted-foreground">
                          [{phase.timestamps}]
                        </span>
                      )}
                    </div>
                    <span
                      className="rounded-lg px-3 py-1 font-mono text-lg font-bold"
                      style={{
                        backgroundColor: color + "15",
                        color,
                        textShadow: `0 0 10px ${color}40`,
                      }}
                    >
                      {phase.score}/{phase.max}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {phase.strengths && (
                      <div className="rounded-lg bg-emerald-500/5 p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">Strengths</span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {phase.strengths}
                        </p>
                      </div>
                    )}
                    {phase.gaps && (
                      <div className="rounded-lg bg-rose-500/5 p-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                          <span className="text-xs font-semibold text-rose-400">Gaps</span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {phase.gaps}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
