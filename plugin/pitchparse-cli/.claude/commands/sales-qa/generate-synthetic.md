---
description: Generate synthetic sales call transcripts for testing
argument-hint: "[count] [quality-level: excellent|good|poor|terrible] [scenario]"
model: sonnet
allowed-tools: Read, Write, Glob
---

# Generate Synthetic Sales Call Transcript

**Your role:** You are a sales training content creator who has spent years writing realistic call simulations for rep training programs. You know what real sales conversations sound like — the awkward pauses, the prospect who won't stop talking about their vacation, the rep who nervously pitches too early. Your transcripts are so realistic that when people read them, they cringe (on bad calls) or take notes (on good ones). You write prospects as real humans with personalities, not answer-bots, and consultants with recognizable habits and tics.

Generate a realistic synthetic transcript of a PitchParse discovery call between an AI Consultant and a prospect. The transcript must be usable for testing the analysis pipeline.

## Arguments

Parse from: `$ARGUMENTS`

- `$1` — **Count** (optional): A number (e.g., `5`, `10`) to generate multiple transcripts in batch. If the first argument is a number, treat it as count. Default: 1.
- `$2` — Quality level: `excellent`, `good`, `poor`, or `terrible` (default: random). When generating a batch, this sets the quality for ALL transcripts — or omit it to get a realistic distribution (see Batch Mode below).
- `$3` — Optional scenario description (e.g., "prospect is a CFO who is skeptical about AI")

If no arguments provided, generate a single transcript with a random quality level and scenario.

### Batch Mode

When count > 1, generate each transcript sequentially. **Each transcript MUST be unique** — different company, industry, prospect personality, consultant name, and scenario.

**Quality distribution** (when no quality level specified):
- For batches of 4+, use a realistic distribution: ~10% excellent, ~30% good, ~40% poor, ~20% terrible
- For smaller batches, randomly assign quality levels ensuring at least 2 different levels appear
- If a specific quality level IS provided, all transcripts get that quality level

**Consultant reuse:** To make the dataset realistic for manager dashboards, reuse 2-3 consultant names across the batch (so the same rep appears in multiple calls with different prospects). This tests the dashboard's per-consultant aggregation.

**Progress reporting:** After each transcript, print a one-liner:
```
✓ [3/10] poor — Marcus → Sarah Chen (TechCorp) → data/transcripts/synthetic-poor-techcorp-2026-03-10.md
```

**Batch summary:** After all transcripts are generated, show:
```
Synthetic Batch Complete — [N] transcripts generated
─────────────────────────────────────────────────────
Quality    Count   Files
excellent  1       synthetic-excellent-meridian-logistics-2026-03-10.md
good       3       synthetic-good-*.md
poor       4       synthetic-poor-*.md
terrible   2       synthetic-terrible-*.md

Consultants used: Marcus (4 calls), Julia (3 calls), Derek (3 calls)

→ Run /sales-qa:pipeline to process all of these through analysis and dashboard.
```

## Safety Guardrails

- **Write path assertion:** All output MUST be written inside `data/transcripts/`. Verify the path before saving.

## Instructions

1. **Read the call script and KPI rubric** from the skill references:
   - `.claude/references/call-script.md`
   - `.claude/references/kpi-rubric.md`

2. **Generate a prospect profile:**
   - Company name, industry, size (employees + revenue range)
   - Prospect's name, title, personality (e.g., skeptical, enthusiastic, busy/distracted)
   - Their primary pain point and what they filled in on the AI Strategy widget
   - Budget situation, decision-making authority, timeline pressure

3. **Generate a consultant profile:**
   - Name
   - Experience level (matches quality — excellent = 6 months in, terrible = first week)

4. **Write the full transcript** following these rules:

   For **excellent** calls (target analysis score: **90-100**):
   - All 5 phases present and executed at textbook level
   - Talk ratio ~30-35% consultant — prospect does most of the talking
   - Deep follow-up questions (3+ levels) on every pain point
   - All 4 BANT criteria uncovered with specific numbers, names, and dates
   - Objections handled masterfully with named frameworks (feel-felt-found, reframe, etc.)
   - Specific next step booked: date, time, attendees, agenda all confirmed
   - Prospect actively warms throughout — moves from guarded to enthusiastic
   - Consultant uses prospect's exact language back (mirroring)
   - Multiple case studies referenced with specific metrics
   - Every KPI should deserve a 4 or 5 score

   For **good** calls (target analysis score: **75-89**):
   - All 5 phases present, 1-2 slightly weak
   - Talk ratio ~40-45% consultant
   - Some good follow-up, some surface level
   - 3 of 4 BANT criteria covered well, one vague
   - Objections mostly handled but technique not always clean
   - Next step agreed but missing one detail (date or attendees)
   - Most KPIs should deserve a 3 or 4 score

   For **poor** calls (target analysis score: **40-59**):
   - 1-2 phases missing or very weak
   - Talk ratio ~55-60% consultant (over-talking)
   - Mostly closed questions, surface-level follow-up
   - Only 1-2 BANT criteria addressed, answers accepted without probing
   - Objections deflected or ignored
   - Vague next step ("I'll send you some info")
   - Prospect engagement clearly drops mid-call
   - Most KPIs should deserve a 1 or 2 score

   For **terrible** calls (target analysis score: **0-39**):
   - Skips discovery entirely, jumps to product pitch within 2 minutes
   - Talk ratio >65% consultant — monologue-style
   - No open questions at all, only rhetorical or closed
   - No BANT qualification attempted whatsoever
   - Objections trigger visible defensiveness or argument
   - No next step — prospect ends the call early
   - Prospect is clearly disengaged, giving one-word answers
   - Most KPIs should deserve a 0 or 1 score

5. **Format the transcript:**

```
---
type: synthetic
quality_level: [excellent|good|poor|terrible]
generated_date: [today's date]
consultant: [name]
prospect: [name, title, company]
duration_minutes: [25-35]
---

## Call Metadata
- **Date:** [date]
- **Consultant:** [name]
- **Prospect:** [name], [title] at [company]
- **Company Size:** [employees], [revenue range]
- **Industry:** [industry]
- **Source:** AI Strategy Widget — indicated challenges with [topic]

## Transcript

[00:00] **Consultant ([name]):** [dialogue]

[00:15] **Prospect ([name]):** [dialogue]

[continues with realistic timestamps throughout 25-35 minutes]
```

6. **Save the file** to the project's `data/transcripts/` directory (create if needed) with filename: `synthetic-[quality]-[company-name-slug]-[date].md`

7. **Report what you generated:**
   - **Single transcript:** Report quality level, key characteristics, and file path. Suggest: "Run `/sales-qa:analyze` on it next."
   - **Batch:** Show the batch summary table (see Batch Mode above). Suggest: "Run `/sales-qa:pipeline` to process all of these through analysis and dashboard."

## Realism Guidelines

- Include natural speech patterns: filler words ("um", "you know"), interruptions, side comments
- Vary sentence length — some people are verbose, others terse
- Include realistic company names and scenarios (fintech, healthcare, logistics, retail, etc.)
- Prospects should have personality — not robotic
- Bad calls should feel cringe-worthy but realistic (we've all been on those calls)
- Include 2-3 moments per call where the prospect gives a signal (positive or negative) that a good consultant would pick up on

## Anti-patterns — DO NOT do these:

- **Don't write prospects as answer-bots.** Real prospects go off-topic, tell stories about their weekend, complain about their boss, or answer a different question than what was asked. Include at least 1-2 of these tangents.
- **Don't make every line of dialogue perfectly formed.** Real people start sentences, stop, restart. "So we — actually, let me back up. The real issue isn't the software, it's that our team doesn't — well, they don't trust the data."
- **Don't distribute quality evenly.** A "poor" call shouldn't be uniformly poor. Real poor calls have 1-2 good moments (so the coaching report has something to build on) and real excellent calls have 1 minor gap (nobody's perfect).
- **Don't make bad consultants cartoonishly bad.** They should be recognizably human — nervous, over-prepared, trying too hard. Not a parody.
- **Don't write a transcript that's "too easy" to analyze.** The best test transcripts have ambiguous moments where reasonable people could disagree on the score. Include at least one gray area per call.
