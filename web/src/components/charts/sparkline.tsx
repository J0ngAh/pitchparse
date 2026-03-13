"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { COLORS } from "@/lib/constants";
import { EASE, VIEWPORT } from "@/lib/motion";

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = COLORS.signal,
  className,
  width = 64,
  height = 24,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
              pathLength: {
                duration: 1,
                ease: EASE.smooth,
              },
              opacity: { duration: 0.2 },
            },
          },
        }}
      />
    </motion.svg>
  );
}
