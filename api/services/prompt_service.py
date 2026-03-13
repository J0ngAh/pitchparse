"""Prompt template service — versioned per-org prompt resolution."""

import time

from api.database import get_supabase_client
from api.services.analysis_service import _read_command_body
from api.utils.supabase_helpers import rows_as_dicts

# TTL cache for active prompts: (org_id, slug) -> (body, template_id, cached_at)
_prompt_cache: dict[tuple[str | None, str], tuple[str, str | None, float]] = {}
_PROMPT_TTL = 300  # 5 minutes

# File fallback paths (relative to api/prompts/)
_SLUG_FILES = {
    "analyze": "analyze.md",
    "report": "report.md",
    "coach": "coach.md",
}


def get_active_prompt(org_id: str | None, slug: str) -> tuple[str, str | None]:
    """Resolve the active prompt for an org and slug.

    Resolution order: org-specific latest → global default latest → file fallback.
    Returns (body, template_id). template_id is None for file fallback.
    """
    cache_key = (org_id, slug)
    now = time.monotonic()
    cached = _prompt_cache.get(cache_key)
    if cached:
        body, template_id, cached_at = cached
        if (now - cached_at) < _PROMPT_TTL:
            return body, template_id

    db = get_supabase_client()

    # Try org-specific latest version
    if org_id:
        result = rows_as_dicts(
            db.table("prompt_templates")
            .select("id, body")
            .eq("org_id", org_id)
            .eq("slug", slug)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        if result:
            body, tid = result[0]["body"], str(result[0]["id"])
            _prompt_cache[cache_key] = (body, tid, now)
            return body, tid

    # Try global default latest version
    result = rows_as_dicts(
        db.table("prompt_templates")
        .select("id, body")
        .is_("org_id", "null")
        .eq("slug", slug)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    if result:
        body, tid = result[0]["body"], str(result[0]["id"])
        _prompt_cache[cache_key] = (body, tid, now)
        return body, tid

    # File fallback
    from pathlib import Path

    api_dir = Path(__file__).resolve().parent.parent
    filename = _SLUG_FILES.get(slug)
    if filename:
        filepath = api_dir / "prompts" / filename
        if filepath.exists():
            body = _read_command_body(str(filepath))
            _prompt_cache[cache_key] = (body, None, now)
            return body, None

    return "", None


def create_prompt_version(org_id: str, slug: str, body: str, created_by: str) -> dict:
    """Create a new prompt version. Auto-increments version number."""
    db = get_supabase_client()

    # Get current max version for this org+slug
    existing = rows_as_dicts(
        db.table("prompt_templates")
        .select("version")
        .eq("org_id", org_id)
        .eq("slug", slug)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    next_version = (existing[0]["version"] + 1) if existing else 1

    result = rows_as_dicts(
        db.table("prompt_templates")
        .insert(
            {
                "org_id": org_id,
                "slug": slug,
                "version": next_version,
                "body": body,
                "created_by": created_by,
            }
        )
        .execute()
    )

    # Invalidate cache
    _prompt_cache.pop((org_id, slug), None)

    return result[0]


def list_prompt_versions(org_id: str, slug: str) -> list[dict]:
    """List all prompt versions for an org+slug, newest first."""
    db = get_supabase_client()
    result = rows_as_dicts(
        db.table("prompt_templates")
        .select("id, org_id, slug, version, created_by, created_at")
        .eq("org_id", org_id)
        .eq("slug", slug)
        .order("version", desc=True)
        .execute()
    )
    return result


def get_prompt_by_id(template_id: str, org_id: str) -> dict | None:
    """Fetch a specific prompt version by ID, scoped to org."""
    db = get_supabase_client()
    result = rows_as_dicts(
        db.table("prompt_templates")
        .select("*")
        .eq("id", template_id)
        .eq("org_id", org_id)
        .execute()
    )
    return result[0] if result else None


def invalidate_prompt_cache(org_id: str | None, slug: str) -> None:
    """Invalidate cached prompt for an org+slug."""
    _prompt_cache.pop((org_id, slug), None)
