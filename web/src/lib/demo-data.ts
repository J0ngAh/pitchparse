export const DEMO_TRANSCRIPT_LINES = [
  {
    speaker: "Rep",
    text: "Thanks for taking the time today, Sarah. I know your team's been scaling fast.",
  },
  {
    speaker: "Prospect",
    text: "Yeah, we've doubled the sales team this quarter and QA is falling behind.",
  },
  {
    speaker: "Rep",
    text: "That's exactly why I wanted to connect. How are you handling call reviews right now?",
  },
  {
    speaker: "Prospect",
    text: "Manually. Our managers listen to maybe 5% of calls. It's not sustainable.",
  },
  {
    speaker: "Rep",
    text: "What would it mean for your team if you could review 100% of calls automatically?",
  },
];

export const DEMO_KPIS = [
  { name: "Talk Ratio", score: 72 },
  { name: "Question Quality", score: 88 },
  { name: "Active Listening", score: 91 },
  { name: "Objection Handling", score: 65 },
  { name: "Next Steps", score: 84 },
];

export const DEMO_COACHING = [
  {
    type: "strength" as const,
    text: "Strong discovery — uncovered core pain point around manual QA at 2:14",
  },
  {
    type: "opportunity" as const,
    text: 'Budget qualification skipped. Try: "What does solving this look like investment-wise?"',
  },
  {
    type: "strength" as const,
    text: "Excellent active listening — mirrored prospect's language about 'scaling fast'",
  },
];

export const DEMO_SCORE = 87;

export const DEMO_STEPS = [
  {
    title: "Upload",
    subtitle: "Drop in any call recording",
    description: "Support for all major audio and video formats. Drag, drop, done.",
  },
  {
    title: "Transcribe",
    subtitle: "AI-powered diarization",
    description: "Speaker-separated transcript with timestamps in seconds.",
  },
  {
    title: "Score",
    subtitle: "10-KPI analysis",
    description:
      "Every call scored across talk ratio, BANT qualification, objection handling, and more.",
  },
  {
    title: "Coach",
    subtitle: "Actionable feedback",
    description: "Specific, citation-backed coaching recommendations your reps can act on today.",
  },
] as const;
