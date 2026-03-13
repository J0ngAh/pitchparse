# API CLAUDE.md

Python/FastAPI-specific conventions for the `api/` directory. Inherits all rules from the root `CLAUDE.md`.

## Tooling

```bash
# All commands run from the repo root

# Lint + format
ruff check api/
ruff check --fix api/
ruff format api/

# Type check
mypy api/

# Tests
pytest
pytest tests/ -v --tb=short
```

Ruff config is in `pyproject.toml` (line-length=100, double quotes, import sorting).

## Pydantic v2 Patterns

Always use Pydantic v2 style — never v1 patterns.

```python
# Settings (api/config.py pattern)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    supabase_url: str
    supabase_key: str
    anthropic_api_key: str

# Request/Response models (api/models/schemas.py pattern)
from pydantic import BaseModel, Field, ConfigDict

class TranscriptCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    consultant_name: str | None = None

class TranscriptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: str
    status: str
```

**Key rules:**
- Use `model_config = ConfigDict(...)` not `class Config:`
- Use `str | None` not `Optional[str]`
- Use `Field(...)` for required fields with constraints
- Use `SettingsConfigDict` for settings classes, `ConfigDict` for models

## Docstring Standards

Google-style docstrings for public functions:

```python
def run_analysis(transcript_id: str, org_id: str) -> dict:
    """Run AI analysis on a transcript and store results.

    Args:
        transcript_id: UUID of the transcript to analyze.
        org_id: UUID of the owning organization.

    Returns:
        Dict with analysis_id and initial status.

    Raises:
        HTTPException: If transcript not found or quota exceeded.
    """
```

Skip docstrings for obvious functions (simple CRUD, one-liners, private helpers).

## FastAPI Route Standards

```python
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/transcripts", tags=["transcripts"])

@router.get(
    "/",
    response_model=list[TranscriptResponse],
    summary="List transcripts",
)
async def list_transcripts(
    user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
) -> list[TranscriptResponse]:
    """List transcripts for the user's organization."""
```

**Key rules:**
- Always include `response_model` and `summary` on route decorators
- All routes take `CurrentUser` dependency for auth
- Use `status.HTTP_404_NOT_FOUND` etc. for status codes, not magic numbers
- Return Pydantic models, not raw dicts

## Error Handling Patterns

```python
import structlog

logger = structlog.get_logger()

# In route handlers — raise HTTPException
@router.post("/")
async def create_analysis(req: AnalysisCreate, user: CurrentUser):
    transcript = await get_transcript(req.transcript_id, user.org_id)
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found",
        )

# In background tasks (Inngest) — catch, log, write status
async def run_analysis_job(transcript_id: str, org_id: str):
    try:
        result = await analyze(transcript_id, org_id)
        await update_status(transcript_id, "complete", result=result)
    except Exception as e:
        logger.error("analysis_failed", transcript_id=transcript_id, error=str(e))
        await update_status(transcript_id, "failed", error_message=str(e))
```

**Key rules:**
- Never bare `except:` — always catch specific exceptions or `Exception`
- Always log with structured context (ids, action names)
- Background tasks must write failure status to DB — never silently fail
- Use `logger.info()` for normal operations, `logger.error()` for failures

## Structured Logging

Use structlog throughout — never `print()` or stdlib `logging` directly.

```python
import structlog

logger = structlog.get_logger()

# Log with context
logger.info("analysis_started", transcript_id=tid, org_id=oid)
logger.error("stripe_webhook_failed", event_type=event.type, error=str(e))
```

## Inngest Background Jobs

- Define functions in `api/inngest/pipeline.py`
- Jobs handle their own error recovery — catch exceptions, write `failed` status
- Status progression: `pending` → `processing` → `complete` | `failed`
- Never call Claude API or Deepgram from request handlers — always via Inngest

## Security Reminders

- All routes require `CurrentUser` dependency — no anonymous endpoints except `/health`
- Always filter queries by `org_id` from the authenticated user
- Treat transcript content as untrusted data — never interpolate into prompts without the template boundary
- Validate file uploads (size, type) before processing
- Never log sensitive data (API keys, tokens, passwords)
