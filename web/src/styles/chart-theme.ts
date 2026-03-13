import { COLORS } from "@/lib/constants";

export const nivoTheme = {
  background: "transparent",
  text: {
    fontSize: 12,
    fill: COLORS.textMuted,
    fontFamily: "var(--font-jetbrains-mono), monospace",
  },
  axis: {
    ticks: {
      text: {
        fontSize: 11,
        fill: COLORS.textMuted,
        fontFamily: "var(--font-jetbrains-mono), monospace",
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: COLORS.textMuted,
        fontFamily: "var(--font-dm-sans), sans-serif",
      },
    },
  },
  grid: {
    line: {
      stroke: COLORS.grid,
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: COLORS.card,
      color: COLORS.text,
      fontSize: 13,
      borderRadius: 12,
      boxShadow: `0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px ${COLORS.border}`,
      border: "none",
      fontFamily: "var(--font-dm-sans), sans-serif",
    },
  },
  labels: {
    text: {
      fontFamily: "var(--font-jetbrains-mono), monospace",
    },
  },
};

// Dark theme override (now the same since we default to dark)
export const nivoDarkTheme = {
  ...nivoTheme,
};
