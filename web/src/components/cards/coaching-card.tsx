"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE, DURATION } from "@/lib/motion";
import type { CoachingEntry } from "@/types/api";

interface CoachingCardProps {
  coaching: CoachingEntry;
  defaultExpanded?: boolean;
}

const levelColors: Record<string, string> = {
  HIGH: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const priorityGlow: Record<number, string> = {
  1: "hover:shadow-[0_0_24px_rgba(244,63,94,0.12)]",
  2: "hover:shadow-[0_0_24px_rgba(251,191,36,0.12)]",
  3: "hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
};

export function CoachingCard({ coaching, defaultExpanded = true }: CoachingCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const level = coaching.level || "MEDIUM";

  return (
    <Card
      className={cn(
        "border-border bg-card/80 transition-all duration-300",
        priorityGlow[coaching.priority] || "",
      )}
    >
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
            {coaching.priority}
          </span>
          <CardTitle className="font-display text-sm font-semibold">
            {coaching.title || `Recommendation ${coaching.priority}`}
          </CardTitle>
          <Badge variant="outline" className={cn("ml-auto text-[10px]", levelColors[level])}>
            {level}
          </Badge>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{
              duration: DURATION.fast,
              ease: EASE.snappy,
            }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </CardHeader>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: DURATION.normal, ease: EASE.smooth },
              opacity: { duration: DURATION.fast },
            }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-3 pt-0 text-sm">
              {coaching.issue && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Issue</p>
                  <p className="mt-0.5 leading-relaxed">{coaching.issue}</p>
                </div>
              )}
              {coaching.impact && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Impact</p>
                  <p className="mt-0.5 leading-relaxed">{coaching.impact}</p>
                </div>
              )}
              {coaching.action && (
                <div>
                  <p className="text-xs font-semibold text-primary">Action</p>
                  <p className="mt-0.5 leading-relaxed">{coaching.action}</p>
                </div>
              )}
              {coaching.example && (
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Example</p>
                  <p className="mt-0.5 font-mono text-xs leading-relaxed">{coaching.example}</p>
                </div>
              )}
              {coaching.drill && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Drill</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{coaching.drill}</p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
