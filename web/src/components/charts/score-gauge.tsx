"use client";

import { useEffect, useRef, useState } from "react";
import { getScoreColor, getScoreRating, getScoreGlow } from "@/lib/constants";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScoreGauge({ score, size = 180 }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isDecoding, setIsDecoding] = useState(true);
  const frameRef = useRef<number>(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);
  const glow = getScoreGlow(score);
  const rating = getScoreRating(score);

  useEffect(() => {
    if (isNaN(score)) return;

    // Skip animation for reduced motion
    if (prefersReducedMotion()) {
      requestAnimationFrame(() => {
        setAnimatedScore(score);
        setIsDecoding(false);
      });
      return;
    }

    const totalDuration = 1400;
    const decodeDuration = 900;
    let startTime: number | null = null;
    let currentValue = 0;
    let started = false;

    const animate = (timestamp: number) => {
      if (!started) {
        started = true;
        setIsDecoding(true);
      }
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed < decodeDuration) {
        const progress = elapsed / decodeDuration;
        const range = Math.max(1, Math.round((1 - progress) * 20));
        const noise = Math.round(Math.random() * range - range / 2);
        const approaching = Math.round(progress * score);
        currentValue = Math.max(0, Math.min(100, approaching + noise));
        setAnimatedScore(currentValue);
        frameRef.current = requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        const settleProgress = (elapsed - decodeDuration) / (totalDuration - decodeDuration);
        const eased = 1 - Math.pow(1 - settleProgress, 3);
        currentValue = Math.round(score * eased + currentValue * (1 - eased));
        setAnimatedScore(currentValue);
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedScore(score);
        setIsDecoding(false);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Ambient glow behind gauge */}
        <div
          className="pointer-events-none absolute inset-4 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: color }}
        />

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-border"
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: isDecoding
                ? "none"
                : "stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 8px ${glow})`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-4xl font-bold tabular-nums"
            style={{
              color,
              textShadow: `0 0 16px ${glow}`,
            }}
          >
            {animatedScore}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="text-sm font-display font-semibold" style={{ color }}>
        {rating}
      </span>
    </div>
  );
}
