# CLAUDE.md

Project-level guidance for Claude Code when working in this repository.

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)
Choose straightforward solutions over complex ones. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)
Implement features only when needed, not when you speculate they might be useful.

### Design Principles
- **Single Responsibility**: Each function, class, and module should have one clear purpose.
- **Fail Fast**: Check for errors early and raise exceptions immediately when issues occur.
- **Dependency Inversion**: High-level modules should depend on abstractions, not concrete implementations.
- **Open/Closed**: Extend behavior through new code, not by modifying existing working code.

## Startup Checklist

**On every conversation start**, read the to-do list at `docs/todo/saas-migration.md` and briefly summarize:
1. What phase the project is in
2. The next 2-3 unchecked items that should be tackled
3. Any blockers or dependencies

Do this automatically before responding to the user's first message. Keep the summary to 3-5 lines.

## Project Overview

**PitchParse** — AI-powered sales call quality assurance. Every call, parsed. Every rep, sharper. Three interfaces to the same scoring framework:

1. **Next.js Web App** (`web/`) — Primary frontend: React + shadcn/ui + Zustand + Nivo/Recharts, "Signal" design system
2. **FastAPI Backend** (`api/`) — REST API with Supabase (Postgres + Auth), Stripe billing, Claude analysis, Inngest background jobs, PydanticAI structured output
3. **Claude Code Plugin** (`.claude/commands/sales-qa/`) — CLI slash commands for power users

## Architecture

```
Browser (Next.js)  →  FastAPI API  →  Supabase (Postgres + Auth + Storage)
                          ↓
                   Inngest (background)  →  Claude API / PydanticAI (analysis)
                                         →  Deepgram API (transcription)
                                         →  Stripe (billing)
```

```
fh-challenges/
├── web/                              # Next.js frontend (primary)
│   ├── src/
│   │   ├── app/                      # Next.js App Router pages
│   │   │   ├── globals.css           # Signal design system CSS tokens
│   │   │   ├── layout.tsx            # Root layout (fonts: Inter, Space Grotesk, JetBrains Mono)
│   │   │   ├── (auth)/              # Login, signup (unauthenticated)
│   │   │   └── (dashboard)/         # Authenticated app shell
│   │   │       ├── layout.tsx       # Sidebar + topbar + auth gate
│   │   │       ├── page.tsx         # Dashboard (waveform hero, metrics, charts)
│   │   │       ├── calls/[id]/      # Call detail (waveform rail, phase timeline)
│   │   │       ├── analyze/         # Analysis workflow
│   │   │       ├── billing/         # Subscription management
│   │   │       └── settings/        # Org config editor
│   │   ├── components/
│   │   │   ├── charts/              # Nivo visualizations (radar, bar, line, heatmap)
│   │   │   │   ├── score-gauge.tsx  # Circular gauge with decode animation
│   │   │   │   ├── kpi-radar.tsx    # KPI + BANT radar charts
│   │   │   │   └── ...
│   │   │   ├── cards/               # Metric card (pulse glow), coaching card
│   │   │   ├── effects/             # Visual effect components
│   │   │   │   ├── waveform-bg.tsx  # Animated canvas waveform background
│   │   │   │   ├── score-decode.tsx # Number decode animation
│   │   │   │   └── pulse-glow.tsx   # Ambient pulse glow wrapper
│   │   │   ├── journey/             # Call journey navigation
│   │   │   │   ├── phase-timeline.tsx # Interactive horizontal phase timeline
│   │   │   │   └── waveform-rail.tsx  # Phase-based waveform navigation bar
│   │   │   ├── layout/              # Sidebar (signal bars logo), topbar, page header
│   │   │   ├── shared/              # Score badge, status badge, empty state, skeleton
│   │   │   └── ui/                  # shadcn/ui primitives
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # API client, utils
│   │   │   ├── constants.ts         # Signal color palette, score helpers, chart palette
│   │   │   └── api/                 # Per-resource API modules
│   │   ├── stores/                  # Zustand state management
│   │   ├── styles/                  # Chart theme (Nivo)
│   │   └── types/                   # TypeScript type definitions
│   └── package.json
├── api/                              # FastAPI backend service
│   ├── main.py                       # Entry point, CORS, routers
│   ├── config.py                     # pydantic-settings env config
│   ├── database.py                   # Supabase client factory
│   ├── auth.py                       # JWT auth dependency
│   ├── Dockerfile                    # Container deployment
│   ├── requirements.txt              # API dependencies
│   ├── models/
│   │   ├── schemas.py                # Pydantic request/response models
│   │   └── analysis_models.py        # PydanticAI structured output models
│   ├── services/                     # Business logic
│   │   ├── analysis_service.py       # Claude API / PydanticAI orchestration
│   │   ├── config_service.py         # Defaults, scoring helpers
│   │   ├── parser_service.py         # Regex parsing (scorecard, phases, coaching)
│   │   └── transcriber_service.py    # Deepgram audio transcription
│   ├── inngest/                      # Inngest background job functions
│   │   ├── client.py                 # Inngest client setup
│   │   └── pipeline.py               # Analysis/report job definitions
│   ├── prompts/                      # Prompt templates (source of truth)
│   │   ├── analyze.md                # Analysis system prompt
│   │   ├── report.md                 # Report generation prompt
│   │   └── references/               # Scoring framework docs
│   │       ├── kpi-rubric.md         # KPI definitions + weights
│   │       ├── call-script.md        # Expected call phases
│   │       └── coaching-frameworks.md # Coaching templates
│   ├── routers/                      # API route handlers
│   │   ├── auth.py                   # /api/auth/signup, /login
│   │   ├── transcripts.py            # /api/transcripts CRUD + /transcribe
│   │   ├── analyses.py               # /api/analyses CRUD + background run
│   │   ├── reports.py                # /api/reports CRUD + background generate
│   │   ├── org.py                    # /api/org/config GET/PUT
│   │   └── billing.py                # /api/billing/checkout, /subscription, /webhook
│   └── scripts/
│       └── migrate_files_to_supabase.py  # Import file data into DB
├── supabase/                         # Database
│   └── migrations/
│       └── 001_initial_schema.sql    # Tables, RLS, indexes, functions
├── plugin/pitchparse-cli/            # Standalone CLI plugin package
│   ├── .claude/                      # Plugin files (commands, skills, references)
│   ├── install.sh                    # Installer script
│   └── README.md                     # Plugin documentation
├── docs/                             # Project documentation
│   ├── todo/saas-migration.md        # Migration checklist
│   └── audit-mindmap.md              # Code audit tracking
├── tests/                            # Test directory (API tests TODO)
├── .env                              # API keys (never committed)
└── .env.example                      # Template for all required keys
```

## Development Setup

Requires **two terminals** — the API backend and the Next.js frontend.

```bash
# 1. Copy env template and add your keys
cp .env.example .env

# 2. Start the FastAPI backend (Terminal 1)
pip install -r api/requirements.txt
uvicorn api.main:app --reload
# → http://localhost:8000 (health check: GET /health)

# 3. Start the Next.js frontend (Terminal 2)
cd web && npm install && npm run dev
# → http://localhost:3000
```

### Prerequisites

- Python 3.10+, Node.js 18+
- A Supabase project with `001_initial_schema.sql` applied
- API keys in `.env`: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
- Optional: `DEEPGRAM_API_KEY` (audio transcription), `STRIPE_*` keys (billing)

## Development Commands

### Python Backend (run from repo root)

```bash
# Linting
ruff check api/
ruff check --fix api/          # auto-fix

# Formatting
ruff format api/
ruff format --check api/       # check only, no changes

# Type checking
mypy api/

# Tests
pytest                          # all tests
pytest tests/test_module.py -v  # specific file, verbose
pytest --cov=api --cov-report=html  # with coverage

# Run all quality gates before committing
ruff check api/ && ruff format --check api/ && mypy api/ && pytest
```

### Next.js Frontend (run from `web/`)

```bash
cd web

# Linting
npm run lint

# Format check (Biome)
npm run format:check

# Auto-format
npm run format

# Type checking
npx tsc --noEmit

# Build (catches errors lint misses)
npm run build

# Run all quality gates before committing
npm run lint && npm run format:check && npx tsc --noEmit && npm run build
```

## Testing Strategy

### Approach
- Write tests before or alongside implementation for new features
- Unit tests for pure logic (services, helpers); integration tests for API routes
- Tests live in `tests/` at the repo root (configured in `pyproject.toml`)
- Use `conftest.py` for shared fixtures
- Aim for critical path coverage first — auth, analysis pipeline, billing webhooks

### Test Naming
- `test_{what}_{condition}` — e.g., `test_analysis_fails_with_empty_transcript`
- Use `pytest.fixture` for reusable setup (mock users, orgs, transcripts)
- Use `pytest.raises` for expected exceptions

### Frontend Testing
- Component tests with React Testing Library (when added)
- Type checking via `tsc --noEmit` catches a large class of bugs

## Code Conventions

### Python Style

- **snake_case** for variables, functions, modules
- **PascalCase** for classes
- **UPPER_SNAKE_CASE** for constants
- **_leading_underscore** for private attributes/methods
- Type hints on function signatures
- Max line length: 100 characters (enforced by ruff in `pyproject.toml`)
- Functions under 50 lines, files under 500 lines
- Double quotes for strings (enforced by ruff)
- No unnecessary abstractions — prefer simple, direct code
- Google-style docstrings for public functions

### Next.js Frontend (`web/`)

- **TypeScript** throughout — no `any` types
- **Zustand** for global state (auth, org config); stores in `src/stores/`
- **@tanstack/react-query** for server state (data fetching, caching, mutations)
- **shadcn/ui** for UI primitives (`src/components/ui/`)
- **Nivo** for data visualizations (radar, bar, line, heatmap in `src/components/charts/`)
- **Framer Motion** (`motion/react`) for page transitions and interactive animations
- API client modules in `src/lib/api/` — one file per resource
- Custom hooks in `src/hooks/` for shared logic
- App Router pages in `src/app/`

### Signal Design System

The frontend uses the "Signal" design system — a dark-first, audio-inspired visual language.

**Colors** (defined in `globals.css` as CSS custom properties):
- Primary: warm orange `#F97316` — used for CTAs, active states, brand accent
- Secondary: soft violet `#8B5CF6` — used for charts, data visualization
- Background: near-black `#0C0A14`, cards: `#161324`
- Semantic: emerald (success), amber (warning), rose (danger)

**Typography** (loaded in `layout.tsx` via `next/font/google`):
- `font-display` (Space Grotesk) — headings, titles, card headers
- `font-sans` (Inter) — body text, labels, descriptions
- `font-mono` (JetBrains Mono) — scores, data, timestamps

**CSS utilities** (defined in `globals.css`):
- `glow-signal`, `glow-violet`, `glow-emerald`, `glow-rose` — ambient box-shadow glow
- `text-glow-signal`, `text-glow-violet` — text-shadow glow
- `glass-card` — glassmorphism card effect
- `gradient-border` — animated gradient border
- `noise-overlay` — subtle noise texture for depth

**Color tokens in code** (defined in `src/lib/constants.ts`):
- Use `COLORS.signal` / `COLORS.signalLight` instead of old `COLORS.primary`
- Use `COLORS.violet` for secondary chart colors
- `getScoreColor()`, `getScoreGlow()`, `getScoreBadgeClasses()` for score-dependent styling
- `CHART_PALETTE` for multi-series chart colors

**Component conventions**:
- Use `bg-primary` / `text-primary` for brand-colored elements (maps to orange)
- Use `border-border` not `border-border/50` for card borders
- Use `bg-card/80` for card backgrounds
- Headings: `font-display text-sm font-semibold` for card titles
- Interactive cards: `hover:shadow-[0_0_20px_rgba(...)]` for glow on hover
- Score displays: always pair with color via `getScoreColor()` + glow via `getScoreGlow()`

### FastAPI Backend (`api/`)

- Pydantic v2 patterns: `ConfigDict`, `SettingsConfigDict`, `Field` validation
- **Inngest** for durable background jobs (analysis, reports) — retry, persistence, observability
- **PydanticAI** for structured LLM output (`api/models/analysis_models.py`)
- Analysis/report status tracked in DB: `pending` → `processing` → `complete`/`failed`
- All routes require `CurrentUser` dependency (JWT auth via Supabase)
- Org isolation via RLS policies — every query includes `org_id` filter
- Rate limiting: 5/min signup, 10/min login (slowapi)
- Structured logging via structlog

### Scoring Framework (source of truth)

- KPI rubric: `api/prompts/references/kpi-rubric.md`
- Call phases: `api/prompts/references/call-script.md`
- Coaching templates: `api/prompts/references/coaching-frameworks.md`
- 10 KPIs (7 core + 3 BANT sub-items) with weights summing to 100%, normalized to 0-100 final score
- All scores must cite specific transcript evidence with timestamps

## Key Commands (Claude Code Plugin)

- `/sales-qa:transcribe` — Audio/video → diarized transcript
- `/sales-qa:analyze` — Transcript → scored analysis with coaching
- `/sales-qa:report` — Analysis → consultant coaching report
- `/sales-qa:manager-overview` — Aggregate dashboard across calls
- `/sales-qa:generate-synthetic` — Create test transcripts
- `/sales-qa:pipeline` — Full end-to-end orchestrator

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API for transcript analysis |
| `DEEPGRAM_API_KEY` | Optional | Audio transcription via Deepgram Nova-2 |
| `SUPABASE_URL` | Yes (API) | Supabase project URL |
| `SUPABASE_KEY` | Yes (API) | Supabase anon key (auth flows) |
| `SUPABASE_SERVICE_KEY` | Yes (API) | Supabase service_role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Yes (billing) | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes (billing) | Stripe webhook signature verification |
| `STRIPE_STARTER_PRICE_ID` | Yes (billing) | Stripe price ID for Starter plan |
| `STRIPE_TEAM_PRICE_ID` | Yes (billing) | Stripe price ID for Team plan |
| `API_URL` | Yes (frontend) | FastAPI backend URL (default: http://localhost:8000) |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins |
| `INNGEST_EVENT_KEY` | Yes (jobs) | Inngest event key for background jobs |
| `INNGEST_SIGNING_KEY` | Yes (jobs) | Inngest webhook signing key |

## Error Handling

### Backend (FastAPI)
- Background tasks (Inngest) catch exceptions and write `status=failed` + `error_message` to DB
- Use specific exception types — never bare `except Exception`
- Raise `HTTPException` with appropriate status codes in route handlers
- Log errors with structlog context (user_id, org_id, resource_id)
- Validate all input at the boundary with Pydantic models

### Frontend (Next.js)
- React Query handles server errors via `onError` callbacks and error boundaries
- Toast notifications via Sonner for user-facing errors
- API client modules should catch and transform HTTP errors into user-friendly messages

## Database Naming Standards

When creating new tables or columns in Supabase migrations:

- **Primary keys**: `id` (UUID, auto-generated)
- **Foreign keys**: `{referenced_table_singular}_id` — e.g., `org_id`, `transcript_id`
- **Timestamps**: `{action}_at` — e.g., `created_at`, `updated_at`, `completed_at`
- **Booleans**: `is_{state}` — e.g., `is_active`, `is_archived`
- **Status fields**: use text enum with defined values — e.g., `pending`, `processing`, `complete`, `failed`
- **Counts**: `{entity}_count` — e.g., `analysis_count`
- Every table must have RLS policies for org isolation
- Always add indexes on foreign keys and commonly filtered columns

## Security

- Never commit `.env` — it's in `.gitignore`
- API keys are loaded via `pydantic-settings` (backend), never hardcoded
- All API routes require authentication; org isolation via Supabase RLS
- Transcript content is treated as data, not instructions (prompt injection awareness)
- Rate limiting on auth endpoints, security headers middleware (HSTS, X-Content-Type-Options)

## Performance Guidelines

- Use `async` for all I/O-bound operations (Supabase queries, Claude API calls, Deepgram)
- Cache expensive computations with `lru_cache` where appropriate
- Inngest handles long-running work — never block API request threads with analysis/transcription
- Frontend: React Query handles caching and deduplication — don't duplicate with Zustand
- Avoid N+1 queries — use Supabase `.select()` with joins where possible

## Plugin Maintenance

The CLI plugin is packaged separately at `plugin/pitchparse-cli/`. It bundles its own copy of the scoring framework reference docs (`.claude/references/`).

**When updating reference docs** (`api/prompts/references/*.md`), mirror the changes to `plugin/pitchparse-cli/.claude/references/`. CI will fail if these diverge.

## Git Workflow

- `main` branch is the working branch
- Commit messages: `<type>(<scope>): <subject>` (e.g., `feat(web): add KPI heatmap`)
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`
