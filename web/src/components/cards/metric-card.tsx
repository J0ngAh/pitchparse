"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/hooks/use-count-up";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  color?: "signal" | "violet" | "emerald" | "rose" | "amber";
  suffix?: string;
}

const colorMap = {
  signal: "text-orange-400 bg-orange-500/15",
  violet: "text-violet-400 bg-violet-500/15",
  emerald: "text-emerald-400 bg-emerald-500/15",
  rose: "text-rose-400 bg-rose-500/15",
  amber: "text-amber-400 bg-amber-500/15",
};

const glowMap = {
  signal: "group-hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  violet: "group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  emerald: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
  rose: "group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  amber: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]",
};

function CountUpValue({ end }: { end: number }) {
  const { ref, displayValue } = useCountUp(end);

  return <span ref={ref}>{displayValue}</span>;
}

export function MetricCard({
  value,
  label,
  icon: Icon,
  color = "signal",
  suffix,
}: MetricCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(value) || 0;
  const isNumeric = !(typeof value === "string" && isNaN(parseFloat(value)));

  return (
    <Card
      className={cn(
        "group border-border bg-card/80 backdrop-blur-sm transition-all duration-300",
        "hover:border-border/80 hover:bg-card",
        glowMap[color],
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            colorMap[color],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {isNumeric ? (
              <>
                <CountUpValue end={numericValue} />
                {suffix}
              </>
            ) : (
              <>
                {value}
                {suffix}
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
