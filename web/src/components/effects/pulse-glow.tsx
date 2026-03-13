"use client";

import { cn } from "@/lib/utils";

interface PulseGlowProps {
  color: string;
  intensity?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps children with a subtle ambient pulse glow.
 * Intensity 0-1 controls glow brightness.
 */
export function PulseGlow({ color, intensity = 0.5, children, className }: PulseGlowProps) {
  const alpha = Math.round(intensity * 0.4 * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <div className={cn("relative", className)}>
      {/* Glow layer */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-[inherit] opacity-60 blur-xl"
        style={{
          background: `radial-gradient(ellipse at center, ${color}${alpha} 0%, transparent 70%)`,
          animation: "pulse-glow 3s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `}</style>
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
