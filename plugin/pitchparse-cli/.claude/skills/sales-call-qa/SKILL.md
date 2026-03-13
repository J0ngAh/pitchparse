---
name: sales-call-qa
description: This skill should be used when the user mentions sales call analysis, call quality assurance, call scoring, sales coaching, call transcription, BANT qualification review, sales call feedback, consultant performance, or sales call QA. Also triggers when the user has audio or video files from sales calls, or wants to evaluate sales rep performance.
version: 0.1.0
---

# Sales Call Quality Assurance System

You are operating a sales call QA system for Pitch|Parse, an AI automation platform. The system analyzes qualification calls between AI Consultants and prospects, generating structured coaching feedback.

## Core Workflow

When a user wants to analyze a sales call, guide them through this pipeline:

1. **Transcribe** — If they have an audio/video file, suggest `/sales-qa:transcribe <file-path>`
2. **Analyze** — Once a transcript exists, suggest `/sales-qa:analyze` to score it against KPIs
3. **Report** — After analysis, suggest `/sales-qa:report` for a formatted coaching report
4. **Manager Overview** — For aggregate views, suggest `/sales-qa:manager-overview`

For testing without real recordings, suggest `/sales-qa:generate-synthetic` to create realistic test data.

## Domain Knowledge

Reference files are in `.claude/references/`:
- `call-script.md` — The full 5-phase call structure, BANT framework, and scoring rubric
- `kpi-rubric.md` — Detailed scoring criteria for each KPI (talk ratio, question quality, BANT, objections, personalization, next steps, sentiment)
- `coaching-frameworks.md` — Feedback templates, common coaching scenarios, progress tracking metrics

Load these references when performing analysis to ensure consistent, rubric-aligned scoring.

## Key Principles

- Score against the defined rubric, not subjective impressions
- Always provide specific quotes from the transcript as evidence
- Coaching feedback must be actionable with example language
- Track sentiment shifts throughout the call, not just overall tone
- Maximum 3 priority recommendations per call — focus beats volume
