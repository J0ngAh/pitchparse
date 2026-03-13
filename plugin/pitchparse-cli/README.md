# Pitch|Parse CLI Plugin for Claude Code

AI-powered sales call quality assurance, directly in your terminal. Pitch|Parse CLI is a Claude Code plugin that transcribes sales calls, scores them against a structured KPI framework, and delivers actionable coaching — all through simple slash commands.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- `ANTHROPIC_API_KEY` — required for transcript analysis (Claude API)
- `DEEPGRAM_API_KEY` — optional, required only for audio/video transcription

## Installation

### Via install script

```bash
cd your-project/
curl -fsSL https://pitchparse.com/install.sh | sh
```

Or clone and run locally:

```bash
git clone https://github.com/jinga-lala/pitchparse-cli.git
cd pitchparse-cli
sh install.sh
```

### Manual install

Copy the `.claude/` directory into your project root:

```bash
cp -rn pitchparse-cli/.claude/ /path/to/your-project/.claude/
```

## Command Reference

| Command | Description |
|---------|-------------|
| `/sales-qa:transcribe` | Transcribe audio/video with speaker diarization |
| `/sales-qa:analyze` | Score a transcript against 10 KPIs |
| `/sales-qa:report` | Generate a coaching report for a consultant |
| `/sales-qa:manager-overview` | Aggregate dashboard across multiple calls |
| `/sales-qa:generate-synthetic` | Create test transcripts for pipeline testing |
| `/sales-qa:pipeline` | Full end-to-end: transcribe → analyze → dashboard |

## Quick Start

A typical workflow looks like this:

```bash
# 1. Transcribe a sales call recording
/sales-qa:transcribe path/to/call-recording.mp3

# 2. Analyze the transcript against KPIs
/sales-qa:analyze path/to/transcript.md

# 3. Generate a coaching report
/sales-qa:report path/to/analysis.md

# Or run the full pipeline in one shot
/sales-qa:pipeline path/to/call-recording.mp3
```

## Output Directory

All outputs (transcripts, analyses, reports) are saved to a `data/` directory in your project root. This directory is created automatically on first run.

## License

MIT
