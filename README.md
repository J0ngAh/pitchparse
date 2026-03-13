# Pitch|Parse

**Every call, parsed. Every rep, sharper.** AI-powered sales call quality assurance.

Scores every call against a structured qualification framework, generates coaching recommendations with evidence, and surfaces team-wide trends. Built for the [FoundersHub AI Challenge #001](https://foundershub.ai).

Three interfaces, one framework:

- **Next.js Web App** (`web/`) — Primary frontend with the "Signal" design system, interactive visualizations, and dark-first UI
- **Claude Code Plugin** (`.claude/commands/sales-qa/`) — Slash commands for power users who live in the terminal
- **FastAPI REST API** (`api/`) — Supabase-backed endpoints with Inngest background jobs, PydanticAI structured output, Stripe billing

---

## Quick Start (Web App)

### Prerequisites

- Python 3.10+, Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com) (for analysis)
- Optional: A [Deepgram API key](https://deepgram.com) (for audio transcription)
- Optional: A [Stripe](https://stripe.com) account (for billing)

### Setup

```bash
git clone <repo-url>
cd fh-challenges

# 1. Configure environment
cp .env.example .env
# Edit .env with your Supabase, Anthropic, and optional Stripe/Deepgram keys

# 2. Set up the database
# Go to your Supabase project → SQL Editor → paste and run:
#   supabase/migrations/001_initial_schema.sql

# 3. Start the API backend (Terminal 1)
pip install -r api/requirements.txt
uvicorn api.main:app --reload
# → http://localhost:8000

# 4. Start the Next.js frontend (Terminal 2)
cd web && npm install && npm run dev
# → http://localhost:3000
```

### First Run

1. Open http://localhost:3000
2. Create an account (sign up form)
3. Upload a transcript or generate a synthetic one
4. Run an analysis — wait for polling to complete
5. View results in Dashboard and Call Detail
6. Generate a coaching report

### Pages

| Page | What It Does |
|------|-------------|
| **Dashboard** | Manager overview — waveform hero, score distribution, consultant leaderboard, KPI heatmap, alert banners |
| **Analyze** | Select a transcript, upload audio/text, or generate synthetic — run AI analysis |
| **Transcripts** | Browse all transcripts, filter by consultant/quality/status |
| **Call Detail** | Deep view — waveform rail, score gauge with decode animation, interactive phase timeline, KPI radar, coaching cards |
| **Reports** | Browse and download coaching reports (HTML) |
| **Settings** | Customize branding, KPIs, scoring thresholds, call phases, coaching config |
| **Billing** | View subscription usage, upgrade plan via Stripe Checkout |

---

## Quick Start (CLI Plugin)

```bash
# Open Claude Code in the project directory
claude

# Full pipeline: transcribe → analyze → dashboard
/sales-qa:pipeline /path/to/call-recording.m4a

# Analyze a single transcript
/sales-qa:analyze data/transcripts/recording-holloway-interview-2025-12-11.md

# Generate test data
/sales-qa:generate-synthetic poor
```

### Commands

| Command | Purpose |
|---------|---------|
| `/sales-qa:transcribe` | Audio/video → diarized transcript |
| `/sales-qa:analyze` | Transcript → scored analysis with coaching |
| `/sales-qa:report` | Analysis → consultant coaching report |
| `/sales-qa:manager-overview` | Aggregate dashboard across calls |
| `/sales-qa:generate-synthetic` | Create realistic test transcripts |
| `/sales-qa:pipeline` | Full end-to-end batch orchestrator |

---

## Architecture

```
Browser (Next.js)  →  FastAPI API  →  Supabase (Postgres + Auth + Storage)
                          ↓
                   Inngest (background)  →  Claude API / PydanticAI (analysis)
                                         →  Deepgram API (transcription)
                                         →  Stripe (billing)
```

### Data Flow

1. User signs up → Supabase Auth creates user + org
2. User uploads transcript → API stores in Postgres
3. User runs analysis → API triggers Inngest job → Claude scores the call → results saved to DB
4. Frontend polls for completion → renders dashboard/charts from API data
5. User generates report → Inngest job → Claude creates HTML coaching report → saved to DB

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js + shadcn/ui over Streamlit | Production-grade frontend with full design control, SSR, component composition |
| "Signal" design system | Dark-first, audio-inspired visual language with warm orange primary — unique in the conversation intelligence market |
| Inngest over BackgroundTasks | Durable execution with retry, persistence, observability for long-running AI analysis |
| PydanticAI structured output | Type-safe LLM responses, replaces brittle regex parsing |
| API polling instead of streaming | Simpler multi-tenant model; Inngest handles job lifecycle |

---

## Design System: "Signal"

The UI is built around the metaphor of *decoding a signal* — inspired by audio analysis environments. Dark, warm, and focused.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Near-black warm | `#0C0A14` |
| Surface/Card | Dark purple-gray | `#161324` |
| Primary (Signal) | Warm orange | `#F97316` |
| Secondary | Soft violet | `#8B5CF6` |
| Success | Emerald | `#10B981` |
| Warning | Amber | `#FBBF24` |
| Danger | Rose | `#F43F5E` |
| Text | Warm white | `#F1F0F5` |
| Muted | Lavender gray | `#6B6584` |

### Typography

| Role | Font | Source |
|------|------|--------|
| Headings | Space Grotesk | Google Fonts (`font-display`) |
| Body | Inter | Google Fonts (`font-sans`) |
| Numbers/Data | JetBrains Mono | Google Fonts (`font-mono`) |

### Interactive Features

- **Waveform Background** — Animated canvas waveform on the dashboard hero
- **Waveform Rail** — Phase-based navigation bar on call detail pages
- **Phase Journey Timeline** — Interactive horizontal timeline with expandable phase details
- **Score Decode Animation** — Numbers cycle rapidly before settling on final value
- **Glow Effects** — Score-dependent ambient glow on gauges and cards
- **Pulse Vitals** — Hover glow effects on metric cards proportional to color

---

## The Qualification Framework

Every call is scored against Pitch|Parse's 5-phase discovery call structure:

### Call Phases (0-20 each)

| Phase | Duration | Goal |
|-------|----------|------|
| Opening & Rapport | 0-3 min | Build trust, set agenda, reference prior context |
| Discovery & Pain Points | 3-15 min | Uncover genuine business pain with quantification |
| BANT Qualification | 15-22 min | Budget, Authority, Need, Timeline |
| Solution Framing | 22-26 min | Connect capabilities to their specific pain |
| Close & Next Steps | 26-30 min | Secure a concrete, specific next action |

### KPI Weights

| KPI | Weight |
|-----|--------|
| Talk-to-Listen Ratio | 10% |
| Question Quality | 15% |
| Pain Point Discovery | 15% |
| BANT — Budget | 10% |
| BANT — Authority | 10% |
| BANT — Need | 10% |
| BANT — Timeline | 10% |
| Objection Handling | 5% |
| Personalization | 5% |
| Next Step Quality | 10% |

### Score Ratings

| Range | Rating |
|-------|--------|
| 90-100 | Exceptional |
| 75-89 | Good |
| 60-74 | Needs Improvement |
| 40-59 | Poor |
| 0-39 | Critical |

---

## Project Structure

```
fh-challenges/
├── web/                              # Next.js frontend (primary)
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/               # Login, signup layouts
│   │   │   ├── (dashboard)/          # Authenticated pages
│   │   │   │   ├── calls/[id]/       # Call detail page
│   │   │   │   ├── analyze/          # Analysis workflow
│   │   │   │   ├── billing/          # Subscription management
│   │   │   │   └── ...
│   │   │   └── globals.css           # Signal design system tokens
│   │   ├── components/
│   │   │   ├── charts/               # Nivo/Recharts visualizations
│   │   │   ├── cards/                # Metric, coaching cards
│   │   │   ├── effects/              # Waveform, score decode, pulse glow
│   │   │   ├── journey/              # Phase timeline, waveform rail
│   │   │   ├── layout/               # Sidebar, topbar, page header
│   │   │   ├── shared/               # Score badge, status badge, etc.
│   │   │   └── ui/                   # shadcn/ui primitives
│   │   ├── hooks/                    # React hooks
│   │   ├── lib/                      # API client, constants, utils
│   │   ├── stores/                   # Zustand (auth, org config)
│   │   ├── styles/                   # Chart theme
│   │   └── types/                    # TypeScript interfaces
│   └── package.json
├── api/                              # FastAPI backend
│   ├── main.py                       # Entry point, CORS, health check
│   ├── config.py                     # pydantic-settings config
│   ├── database.py                   # Supabase client factory
│   ├── auth.py                       # JWT auth dependency
│   ├── models/
│   │   ├── schemas.py                # Pydantic request/response models
│   │   └── analysis_models.py        # PydanticAI structured output
│   ├── services/                     # Business logic layer
│   ├── inngest/                      # Durable background jobs
│   ├── prompts/                      # Prompt templates + references
│   ├── routers/                      # REST endpoints
│   ├── Dockerfile                    # Multi-stage production build
│   └── requirements.txt
├── app/                              # Legacy Streamlit app (frozen)
├── supabase/migrations/              # Database schema
├── .claude/                          # Claude Code plugin
│   ├── commands/sales-qa/            # Slash commands
│   ├── skills/sales-call-qa/         # Scoring framework references
│   └── todo/saas-migration.md        # Project task tracking
├── .env.example                      # All env vars documented
└── CLAUDE.md                         # Development conventions
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API for analysis |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service_role key |
| `DEEPGRAM_API_KEY` | Optional | Audio transcription |
| `STRIPE_SECRET_KEY` | Optional | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook verification |
| `STRIPE_STARTER_PRICE_ID` | Optional | Starter plan price ID |
| `STRIPE_TEAM_PRICE_ID` | Optional | Team plan price ID |
| `API_URL` | Frontend | Backend URL (default: `http://localhost:8000`) |
| `CORS_ORIGINS` | Optional | Allowed origins (default: localhost) |
| `INNGEST_EVENT_KEY` | Jobs | Inngest event key |
| `INNGEST_SIGNING_KEY` | Jobs | Inngest webhook signing key |

---

## Tool Choices

| Component | Choice | Why |
|-----------|--------|-----|
| **Frontend** | Next.js + shadcn/ui | Production-grade, App Router, full design control, component composition |
| **Design** | Signal design system | Dark-first, audio-inspired, competitive differentiation via warm orange palette |
| **State** | Zustand + React Query | Zustand for auth/global state, React Query for server state with caching |
| **Backend** | FastAPI | Async, auto-docs, Pydantic validation |
| **Background Jobs** | Inngest | Durable execution with retry, persistence, observability |
| **Database** | Supabase (Postgres) | Auth, RLS for multi-tenancy, JSONB for flexible schemas |
| **Analysis AI** | Claude + PydanticAI | Strong reasoning + type-safe structured output |
| **Transcription** | Deepgram Nova-2 | Best accuracy for conversational speech, native diarization |
| **Billing** | Stripe | Industry standard, Checkout sessions, webhooks |
| **Charts** | Nivo + Recharts | Interactive, dark-theme compatible, radar/gauge/heatmap/bar |
| **CLI** | Claude Code Plugin | Natural language, composable commands, zero infrastructure |

### Automation Estimate

| Task | Before | After |
|------|--------|-------|
| Listening to calls | 30 min/call | 0 min (automated) |
| Scoring against KPIs | 15-20 min/call | 0 min (automated) |
| Writing coaching feedback | 20-30 min/call | 0 min (generated) |
| Identifying training needs | Hours of pattern recognition | Instant aggregation |
| **Overall** | **~60-90 min/call** | **~2 min/call** |

---

## License

MIT
