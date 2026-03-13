# SaaS Migration: Prototype to Production

## Status: Phase 2 In Progress

---

## COMPLETED

### 1. Supabase Database Schema (`supabase/migrations/001_initial_schema.sql`)
- [x] Tables: organizations, users, consultants, transcripts, analyses, reports
- [x] Row Level Security (RLS) policies for org isolation on all tables
- [x] `auth.user_org_id()` helper function for RLS
- [x] Indexes on all foreign keys and commonly queried columns
- [x] `updated_at` trigger on organizations
- [x] `increment_analysis_count()` RPC function for atomic quota tracking
- [x] Storage bucket + policies for audio files (org-scoped)

### 2. FastAPI Service (`api/`)
- [x] `main.py` — App entry point with CORS, router registration, health check
- [x] `config.py` — `pydantic-settings` config from env vars (Supabase, Stripe, Anthropic, Deepgram)
- [x] `database.py` — Supabase client factory (service_role + anon key)
- [x] `auth.py` — JWT auth dependency (`CurrentUser`) that verifies Supabase tokens and resolves org_id
- [x] `models/schemas.py` — All Pydantic request/response models (auth, transcripts, analyses, reports, billing, org)

### 3. Service Layer (`api/services/`)
- [x] `analysis_service.py` — Claude API orchestration (synchronous for background tasks), system prompt builder, score/rating/participant extraction, report generation
- [x] `config_service.py` — DEFAULT_CONFIG, deep_merge, get_org_config, scoring helpers
- [x] `parser_service.py` — Regex parsing (scorecard, phases, coaching, sentiment) — Streamlit-free
- [x] `transcriber_service.py` — Deepgram audio transcription

### 4. API Route Handlers (`api/routers/`)
- [x] `auth.py` — POST /signup (creates org + user + Supabase Auth), POST /login
- [x] `transcripts.py` — GET list, GET detail, POST upload (markdown), POST /transcribe (audio)
- [x] `analyses.py` — GET list, GET detail, POST run (background task with status tracking)
- [x] `reports.py` — GET list, GET detail, POST generate (background task)
- [x] `org.py` — GET/PUT org config (branding, KPIs, thresholds, call structure)
- [x] `billing.py` — POST /checkout (Stripe Checkout session), GET /subscription, POST /webhook

### 5. Data Migration Script (`api/scripts/migrate_files_to_supabase.py`)
- [x] Imports transcripts, analyses, reports from `data/` into Supabase

### 6. Streamlit Frontend Migration (now legacy)
- [x] Login/signup, Dashboard, Analyze, Transcripts, Call Detail, Reports, Settings, Billing pages
- [x] API client, data adapter, polling pattern

### 7. Backend Enhancements (Phase 2)
- [x] Inngest for durable background job processing (replaces FastAPI BackgroundTasks)
- [x] PydanticAI structured output for analysis (replaces regex parsing in parser_service.py)
- [x] Prompt templates moved to `api/prompts/` with references

### 8. Code & Project Cleanup
- [x] Deleted empty `data/` directory (legacy pre-migration)
- [x] Deleted dead legacy files: `app/lib/parser.py`, `app/lib/transcriber.py`, `app/lib/reports.py`
- [x] Deleted stale tests (9 files testing legacy `app/lib/` modules)
- [x] Updated CLAUDE.md to reflect current architecture (Next.js + Inngest + PydanticAI)
- [x] Updated CI pipeline: removed `app/` steps, added `web/` lint + build
- [x] Updated `render.yaml` for API + Next.js deployment
- [x] Updated `pyproject.toml` pythonpath to `api/`, mypy target to `api/`
- [x] Marked `app/` as frozen with deprecation README
- [x] Rate limiting, structured logging, security headers, Pydantic v2 patterns

### 9. Deployment Config
- [x] `api/Dockerfile` for containerized FastAPI on Render
- [x] `render.yaml` with API + Web services
- [x] `.env.example` with all env vars

---

## IN PROGRESS — Next.js Frontend (`web/`)

### Core Infrastructure
- [x] Next.js App Router setup with TypeScript
- [x] shadcn/ui component library integrated
- [x] Zustand stores for auth/org state
- [x] @tanstack/react-query for data fetching
- [x] API client modules (`web/src/lib/api/`)
- [x] Recharts visualizations (heatmap, radar, gauge, distribution, sentiment, consultant comparison)
- [x] Layout components (sidebar, topbar, page header)
- [x] Shared components (score badge, status badge, empty state, skeleton card)
- [x] Auth hydration fix (wait for Zustand before redirect)

### Pages — Status
- [x] Verify all dashboard pages match Streamlit feature parity
- [x] Verify analysis workflow (upload → run → poll → view results)
- [x] Verify billing/checkout integration with Stripe

### Remaining Before `app/` Deletion
- [x] Move synthetic transcript generation to API (backend endpoint + Inngest job + frontend UI)
- [x] Confirm full feature parity with legacy Streamlit
- [x] Delete `app/` directory entirely

---

## TODO — Remaining Work

### Infrastructure Setup
- [x] Create Supabase project at supabase.com
- [x] Run `001_initial_schema.sql` in Supabase SQL editor
- [x] Create Stripe account, products, and prices (Starter $99/mo, Team $249/mo)
- [x] Set up Stripe webhook endpoint pointing to `/api/billing/webhook`
- [x] Fill in `.env` with all credentials

### Integration Testing
- [x] Test signup/login flow end-to-end
- [x] Test transcript upload → analysis → report pipeline
- [x] Test RLS isolation: create 2 orgs, verify no cross-org data leakage
- [x] Test concurrent analysis submissions (3+) for data integrity

### API Test Coverage
- [x] Add pytest tests for `api/` — 161 tests passing across 22 files
- [x] Refactor `migrate_files_to_supabase.py:migrate()` — decomposed into 9 focused helpers (18 lines)

### Deployment
- [x] Deploy FastAPI to Render (Docker, connect to Supabase cloud)
- [x] Deploy Next.js to Render
- [x] Configure Stripe webhook URL to production API
- [x] Smoke test full pipeline in production

---

## Phase 2 Backlog (after first revenue)

- [x] Local JWT verification (PyJWT + Supabase JWKs endpoint — avoids network call per auth'd request)
- [ ] Prompt versioning (templates in DB)
- [ ] White-label branding (logos, colors, subdomain routing)
- [x] Manager vs consultant roles (3 roles: user, manager, admin — with RLS, team management, invitations)
- [x] Usage-based billing with included quota (free tier, plan alignment, Stripe trial)
- [x] 14-day free trial flow (Stripe-native trial_period_days, trial banner, auto-downgrade)
- [x] Scoring consistency: temperature=0, pinned model version, benchmark test set

---

## Architecture Reference

```
Browser (Next.js)  →  FastAPI API  →  Supabase (Postgres + Auth + Storage)
                          ↓
                   Inngest (background)  →  Claude API / PydanticAI (analysis)
                                         →  Deepgram API (transcription)
                                         →  Stripe (billing)
```

### Key Files
- Schema: `supabase/migrations/001_initial_schema.sql`
- API entry: `api/main.py`
- Auth flow: `api/routers/auth.py` + `api/auth.py`
- Analysis pipeline: `api/routers/analyses.py` → `api/inngest/pipeline.py` → `api/services/analysis_service.py`
- Frontend client: `web/src/lib/api/`
- Prompt templates: `api/prompts/`
