// ── Signal Design System Colors ──
export const COLORS = {
  // Primary brand
  signal: "#F97316",
  signalLight: "#FB923C",
  signalGlow: "rgba(249, 115, 22, 0.4)",

  // Secondary
  violet: "#8B5CF6",
  violetLight: "#A78BFA",
  violetGlow: "rgba(139, 92, 246, 0.4)",

  // Semantic
  green: "#10B981",
  yellow: "#FBBF24",
  orange: "#F97316",
  red: "#F43F5E",
  rose: "#F43F5E",

  // Surfaces
  bg: "#0C0A14",
  card: "#161324",
  surface: "#12101E",
  surfaceHover: "#1E1A30",

  // Text
  text: "#F1F0F5",
  textMuted: "#6B6584",
  textDim: "#4A4563",

  // Lines
  grid: "rgba(255, 255, 255, 0.06)",
  gridZero: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.08)",
} as const;

// Heatmap colorscale (dark-mode optimized)
export const HEATMAP_COLORS = [
  "#3B1323", // 0 - deep rose
  "#4A2810", // 1 - deep amber
  "#3A3510", // 2 - deep yellow
  "#0D3B2A", // 3 - deep emerald
  "#1A2E4A", // 4 - deep blue
] as const;

// Chart palette (5 distinct colors for data series)
export const CHART_PALETTE = [
  "#F97316", // signal orange
  "#8B5CF6", // violet
  "#10B981", // emerald
  "#F43F5E", // rose
  "#FBBF24", // amber
  "#06B6D4", // cyan
  "#EC4899", // pink
] as const;

// Threshold type for score classification
export type Thresholds = {
  exceptional: number;
  good: number;
  needs_improvement: number;
  poor: number;
};

// Default thresholds (matches config_service.py DEFAULT_CONFIG)
export const DEFAULT_THRESHOLDS: Thresholds = {
  exceptional: 90,
  good: 75,
  needs_improvement: 60,
  poor: 40,
};

// Score rating labels
export function getScoreRating(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): string {
  if (score >= thresholds.exceptional) return "Exceptional";
  if (score >= thresholds.good) return "Good";
  if (score >= thresholds.needs_improvement) return "Needs Improvement";
  if (score >= thresholds.poor) return "Poor";
  return "Critical";
}

// Score color helper
export function getScoreColor(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): string {
  if (score >= thresholds.exceptional) return COLORS.signal;
  if (score >= thresholds.good) return COLORS.green;
  if (score >= thresholds.needs_improvement) return COLORS.yellow;
  if (score >= thresholds.poor) return COLORS.red;
  return COLORS.red;
}

// Score glow color
export function getScoreGlow(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): string {
  if (score >= thresholds.exceptional) return COLORS.signalGlow;
  if (score >= thresholds.good) return `rgba(16, 185, 129, 0.4)`;
  if (score >= thresholds.needs_improvement) return `rgba(251, 191, 36, 0.3)`;
  return `rgba(244, 63, 94, 0.4)`;
}

// Score badge color classes (Tailwind) — Signal palette
export function getScoreBadgeClasses(
  score: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): string {
  if (score >= thresholds.exceptional)
    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (score >= thresholds.good) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= thresholds.needs_improvement)
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (score >= thresholds.poor) return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

// KPI short names
export const KPI_SHORT_NAMES: Record<string, string> = {
  "Talk-to-Listen Ratio": "Talk:Listen",
  "Question Quality": "Questions",
  "Pain Point Discovery": "Pain Points",
  "BANT — Budget": "Budget",
  "BANT — Authority": "Authority",
  "BANT — Need": "Need",
  "BANT — Timeline": "Timeline",
  "Objection Handling": "Objections",
  Personalization: "Personal.",
  "Next Step Quality": "Next Step",
};

// BANT KPI names
export const BANT_KPIS = ["BANT — Budget", "BANT — Authority", "BANT — Need", "BANT — Timeline"];

// Model options
export const MODEL_OPTIONS = [
  {
    value: "claude-haiku-4-5-20251001",
    label: "Haiku 4.5",
    cost: "~$0.02",
  },
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6", cost: "~$0.05" },
  { value: "claude-opus-4-6", label: "Opus 4.6", cost: "~$0.25" },
] as const;
