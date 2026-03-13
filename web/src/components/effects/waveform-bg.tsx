"use client";

import { useEffect, useRef, useMemo } from "react";
import { COLORS } from "@/lib/constants";

/** Seeded PRNG (Park-Miller) for deterministic "random" waveform heights. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface WaveformBgProps {
  height?: number;
  barCount?: number;
  color?: string;
  className?: string;
  paused?: boolean;
}

/**
 * Animated waveform background — the signature visual motif.
 * Renders a procedural audio waveform that gently pulses.
 * Throttled to 30fps. Respects prefers-reduced-motion.
 * Pass `paused` to stop animation (WCAG 2.2 SC 2.2.2).
 */
export function WaveformBg({
  height = 80,
  barCount = 64,
  color = COLORS.signal,
  className,
  paused = false,
}: WaveformBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const baseHeights = useMemo(() => {
    const random = seededRandom(42);
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / barCount;
      const envelope = Math.exp(-Math.pow((t - 0.5) * 3, 2));
      const noise = 0.3 + random() * 0.7;
      bars.push(envelope * noise);
    }
    return bars;
  }, [barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    resizeObserver.observe(canvas);

    const reducedMotion = prefersReducedMotion();

    // Draw a single static frame for reduced motion or paused state
    const drawStatic = () => {
      const w = canvas.offsetWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = Math.max(2, (w / barCount) * 0.6);
      const gap = w / barCount;

      for (let i = 0; i < barCount; i++) {
        const barH = baseHeights[i] * h * 0.8;
        const x = i * gap + (gap - barWidth) / 2;
        const y = (h - barH) / 2;
        const alpha = 0.15 + baseHeights[i] * 0.5;
        ctx.fillStyle =
          color +
          Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }
    };

    if (reducedMotion || paused) {
      // Render one static frame, no animation loop
      requestAnimationFrame(() => drawStatic());
      return () => resizeObserver.disconnect();
    }

    // Animated loop throttled to ~30fps
    const FRAME_INTERVAL = 33; // ~30fps
    let lastFrameTime = 0;

    const draw = (time: number) => {
      if (time - lastFrameTime < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = time;

      const w = canvas.offsetWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = Math.max(2, (w / barCount) * 0.6);
      const gap = w / barCount;

      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(time * 0.001 + i * 0.15) * 0.15 + 0.85;
        const breath = Math.sin(time * 0.0005 + i * 0.05) * 0.1 + 0.9;
        const barH = baseHeights[i] * wave * breath * h * 0.8;

        const x = i * gap + (gap - barWidth) / 2;
        const y = (h - barH) / 2;

        const alpha = 0.15 + baseHeights[i] * 0.5;
        ctx.fillStyle =
          color +
          Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
    };
  }, [baseHeights, barCount, color, height, paused]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height }} />;
}
