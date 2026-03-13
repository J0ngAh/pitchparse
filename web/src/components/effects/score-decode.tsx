"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getScoreColor, getScoreGlow } from "@/lib/constants";

interface ScoreDecodeProps {
  score: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Score Decode Animation — numbers rapidly cycle through
 * digits before settling on the final value, like decoding a signal.
 * Respects prefers-reduced-motion by showing final value immediately.
 */
export function ScoreDecode({ score, className, size = "md" }: ScoreDecodeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isDecoding, setIsDecoding] = useState(true);
  const elRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number>(0);
  const color = getScoreColor(score);
  const glow = getScoreGlow(score);

  useEffect(() => {
    if (isNaN(score)) return;

    // Skip animation for reduced motion
    if (prefersReducedMotion()) {
      requestAnimationFrame(() => {
        setDisplayValue(score);
        setIsDecoding(false);
      });
      return;
    }

    const totalDuration = 1200;
    const decodeDuration = 800;
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
        const range = Math.max(1, Math.round((1 - progress) * 30));
        const noise = Math.round(Math.random() * range - range / 2);
        const approaching = Math.round(progress * score);
        currentValue = Math.max(0, Math.min(100, approaching + noise));
        setDisplayValue(currentValue);
        frameRef.current = requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        const settleProgress = (elapsed - decodeDuration) / (totalDuration - decodeDuration);
        const eased = 1 - Math.pow(1 - settleProgress, 3);
        currentValue = Math.round(currentValue + (score - currentValue) * eased);
        setDisplayValue(currentValue);
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(score);
        setIsDecoding(false);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  return (
    <span
      ref={elRef}
      className={cn(
        "font-mono font-bold tabular-nums transition-all",
        sizeClasses[size],
        isDecoding && "blur-[0.5px]",
        className,
      )}
      style={{
        color,
        textShadow: isDecoding ? `0 0 20px ${glow}` : `0 0 12px ${glow}`,
      }}
    >
      {displayValue}
    </span>
  );
}
