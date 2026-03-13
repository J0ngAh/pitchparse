"use client";

/**
 * Animated SVG icons that replace broken Lottie animations.
 * Uses SVG <animate> elements (same pattern as navbar.tsx logo).
 * All animations respect prefers-reduced-motion via CSS media query.
 */

const reducedMotionStyle = `
@media (prefers-reduced-motion: reduce) {
  .animated-icon animate,
  .animated-icon animateTransform {
    dur: 0s !important;
  }
  .animated-icon .bounce-arrow { animation: none !important; }
  .animated-icon .bar-grow { animation: none !important; }
  .animated-icon .typing-dot { animation: none !important; }
}
`;

/** Larger decorative waveform for hero section (desktop only). */
export function HeroVisual() {
  const bars = [
    { x: 20, h: 40, opacity: 0.4, begin: "0s" },
    { x: 50, h: 70, opacity: 0.6, begin: "0.15s" },
    { x: 80, h: 100, opacity: 0.8, begin: "0.3s" },
    { x: 110, h: 130, opacity: 1, begin: "0.45s" },
    { x: 140, h: 120, opacity: 0.9, begin: "0.6s" },
    { x: 170, h: 80, opacity: 0.7, begin: "0.75s" },
    { x: 200, h: 110, opacity: 0.85, begin: "0.9s" },
    { x: 230, h: 60, opacity: 0.5, begin: "1.05s" },
    { x: 260, h: 90, opacity: 0.75, begin: "1.2s" },
    { x: 290, h: 50, opacity: 0.45, begin: "1.35s" },
  ];

  return (
    <div className="relative flex items-center justify-center">
      {/* Radial glow behind waveform */}
      <div className="absolute h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <svg
        width="320"
        height="200"
        viewBox="0 0 320 200"
        fill="none"
        className="animated-icon relative text-primary"
      >
        <style>{reducedMotionStyle}</style>
        <defs>
          <linearGradient id="hero-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {bars.map((bar) => {
          const cy = 100;
          const y = cy - bar.h / 2;
          const minH = bar.h * 0.4;
          const maxH = bar.h;
          return (
            <rect
              key={bar.x}
              x={bar.x}
              y={y}
              width="14"
              rx="7"
              height={bar.h}
              fill="url(#hero-bar-grad)"
              opacity={bar.opacity}
            >
              <animate
                attributeName="height"
                values={`${maxH};${minH};${maxH}`}
                dur="2s"
                repeatCount="indefinite"
                begin={bar.begin}
              />
              <animate
                attributeName="y"
                values={`${cy - maxH / 2};${cy - minH / 2};${cy - maxH / 2}`}
                dur="2s"
                repeatCount="indefinite"
                begin={bar.begin}
              />
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

/** Cloud with upload arrow — subtle bounce animation. */
export function UploadIcon() {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      className="animated-icon text-primary"
    >
      <style>{reducedMotionStyle}</style>
      <style>
        {`
          .bounce-arrow {
            animation: bounceUp 2s ease-in-out infinite;
          }
          @keyframes bounceUp {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}
      </style>
      {/* Cloud shape */}
      <path
        d="M96 72H88C88 53.2 72.8 38 54 38C38.4 38 25.2 48.4 21.6 62.4C12 64 4 72 4 82C4 93.2 13.2 102 24 102H96C108 102 118 92 118 80C118 68 108 58 96 60V72Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Upload arrow */}
      <g className="bounce-arrow">
        <path d="M64 82V54" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M50 66L64 52L78 66"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Bar chart with animated growing bars. */
export function AnalyzeIcon() {
  const bars = [
    { x: 22, h: 50, delay: "0s" },
    { x: 46, h: 70, delay: "0.15s" },
    { x: 70, h: 40, delay: "0.3s" },
    { x: 94, h: 60, delay: "0.45s" },
  ];

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      className="animated-icon text-primary"
    >
      <style>{reducedMotionStyle}</style>
      <style>
        {`
          .bar-grow {
            animation: growBar 2s ease-in-out infinite;
            transform-origin: bottom;
          }
          @keyframes growBar {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.5); }
          }
        `}
      </style>
      {/* Base line */}
      <line
        x1="14"
        y1="108"
        x2="114"
        y2="108"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Bars */}
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={108 - bar.h}
          width="16"
          height={bar.h}
          rx="4"
          fill="currentColor"
          className="bar-grow"
          style={{ animationDelay: bar.delay }}
          opacity="0.8"
        />
      ))}
    </svg>
  );
}

/** Speech bubble with typing dots indicator. */
export function CoachIcon() {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      className="animated-icon text-primary"
    >
      <style>{reducedMotionStyle}</style>
      <style>
        {`
          .typing-dot {
            animation: typingPulse 1.4s ease-in-out infinite;
          }
          @keyframes typingPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
      {/* Speech bubble */}
      <path
        d="M20 28H108C112.4 28 116 31.6 116 36V80C116 84.4 112.4 88 108 88H72L52 104V88H20C15.6 88 12 84.4 12 80V36C12 31.6 15.6 28 20 28Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Typing dots */}
      <circle
        cx="44"
        cy="58"
        r="5"
        fill="currentColor"
        className="typing-dot"
        style={{ animationDelay: "0s" }}
      />
      <circle
        cx="64"
        cy="58"
        r="5"
        fill="currentColor"
        className="typing-dot"
        style={{ animationDelay: "0.2s" }}
      />
      <circle
        cx="84"
        cy="58"
        r="5"
        fill="currentColor"
        className="typing-dot"
        style={{ animationDelay: "0.4s" }}
      />
    </svg>
  );
}
