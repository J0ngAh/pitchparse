import { describe, it, expect } from "vitest";
import {
  COLORS,
  getScoreRating,
  getScoreColor,
  getScoreGlow,
  getScoreBadgeClasses,
} from "@/lib/constants";

// ── getScoreRating ──

describe("getScoreRating", () => {
  it("returns Exceptional for scores >= 90", () => {
    expect(getScoreRating(90)).toBe("Exceptional");
    expect(getScoreRating(95)).toBe("Exceptional");
    expect(getScoreRating(100)).toBe("Exceptional");
  });

  it("returns Good for scores >= 75 and < 90", () => {
    expect(getScoreRating(75)).toBe("Good");
    expect(getScoreRating(80)).toBe("Good");
    expect(getScoreRating(89)).toBe("Good");
  });

  it("returns Needs Improvement for scores >= 60 and < 75", () => {
    expect(getScoreRating(60)).toBe("Needs Improvement");
    expect(getScoreRating(67)).toBe("Needs Improvement");
    expect(getScoreRating(74)).toBe("Needs Improvement");
  });

  it("returns Poor for scores >= 40 and < 60", () => {
    expect(getScoreRating(40)).toBe("Poor");
    expect(getScoreRating(50)).toBe("Poor");
    expect(getScoreRating(59)).toBe("Poor");
  });

  it("returns Critical for scores < 40", () => {
    expect(getScoreRating(39)).toBe("Critical");
    expect(getScoreRating(0)).toBe("Critical");
    expect(getScoreRating(10)).toBe("Critical");
  });

  it("handles boundary values precisely", () => {
    expect(getScoreRating(90)).toBe("Exceptional");
    expect(getScoreRating(89)).toBe("Good");
    expect(getScoreRating(75)).toBe("Good");
    expect(getScoreRating(74)).toBe("Needs Improvement");
    expect(getScoreRating(60)).toBe("Needs Improvement");
    expect(getScoreRating(59)).toBe("Poor");
    expect(getScoreRating(40)).toBe("Poor");
    expect(getScoreRating(39)).toBe("Critical");
  });

  it("supports custom thresholds", () => {
    const custom = { exceptional: 95, good: 80, needs_improvement: 65, poor: 50 };
    expect(getScoreRating(95, custom)).toBe("Exceptional");
    expect(getScoreRating(94, custom)).toBe("Good");
    expect(getScoreRating(80, custom)).toBe("Good");
    expect(getScoreRating(79, custom)).toBe("Needs Improvement");
    expect(getScoreRating(65, custom)).toBe("Needs Improvement");
    expect(getScoreRating(64, custom)).toBe("Poor");
    expect(getScoreRating(50, custom)).toBe("Poor");
    expect(getScoreRating(49, custom)).toBe("Critical");
  });
});

// ── getScoreColor ──

describe("getScoreColor", () => {
  it("returns signal orange for Exceptional scores", () => {
    expect(getScoreColor(90)).toBe(COLORS.signal);
    expect(getScoreColor(100)).toBe(COLORS.signal);
  });

  it("returns green for Good scores", () => {
    expect(getScoreColor(75)).toBe(COLORS.green);
    expect(getScoreColor(89)).toBe(COLORS.green);
  });

  it("returns yellow for Needs Improvement scores", () => {
    expect(getScoreColor(60)).toBe(COLORS.yellow);
    expect(getScoreColor(74)).toBe(COLORS.yellow);
  });

  it("returns red for Poor scores", () => {
    expect(getScoreColor(40)).toBe(COLORS.red);
    expect(getScoreColor(59)).toBe(COLORS.red);
  });

  it("returns red for Critical scores", () => {
    expect(getScoreColor(39)).toBe(COLORS.red);
    expect(getScoreColor(0)).toBe(COLORS.red);
  });
});

// ── getScoreGlow ──

describe("getScoreGlow", () => {
  it("returns signal glow for Exceptional scores", () => {
    expect(getScoreGlow(90)).toBe(COLORS.signalGlow);
    expect(getScoreGlow(100)).toBe(COLORS.signalGlow);
  });

  it("returns green glow for Good scores", () => {
    expect(getScoreGlow(75)).toBe("rgba(16, 185, 129, 0.4)");
    expect(getScoreGlow(89)).toBe("rgba(16, 185, 129, 0.4)");
  });

  it("returns yellow glow for Needs Improvement scores", () => {
    expect(getScoreGlow(60)).toBe("rgba(251, 191, 36, 0.3)");
    expect(getScoreGlow(74)).toBe("rgba(251, 191, 36, 0.3)");
  });

  it("returns red glow for Poor and Critical scores", () => {
    const redGlow = "rgba(244, 63, 94, 0.4)";
    expect(getScoreGlow(40)).toBe(redGlow);
    expect(getScoreGlow(59)).toBe(redGlow);
    expect(getScoreGlow(39)).toBe(redGlow);
    expect(getScoreGlow(0)).toBe(redGlow);
  });
});

// ── getScoreBadgeClasses ──

describe("getScoreBadgeClasses", () => {
  it("returns orange classes for Exceptional scores", () => {
    expect(getScoreBadgeClasses(90)).toBe("bg-orange-500/20 text-orange-400 border-orange-500/30");
  });

  it("returns emerald classes for Good scores", () => {
    expect(getScoreBadgeClasses(75)).toBe(
      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    );
  });

  it("returns amber classes for Needs Improvement scores", () => {
    expect(getScoreBadgeClasses(60)).toBe("bg-amber-500/20 text-amber-400 border-amber-500/30");
  });

  it("returns rose classes for Poor scores", () => {
    expect(getScoreBadgeClasses(40)).toBe("bg-rose-500/20 text-rose-400 border-rose-500/30");
  });

  it("returns red classes for Critical scores", () => {
    expect(getScoreBadgeClasses(39)).toBe("bg-red-500/20 text-red-400 border-red-500/30");
  });
});
