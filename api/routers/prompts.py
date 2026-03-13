"""Prompt template router — CRUD for per-org prompt versioning."""

from fastapi import APIRouter, HTTPException

from api.auth import CurrentUser, Role, require_role
from api.models.schemas import (
    PromptRevertRequest,
    PromptTemplateCreate,
    PromptTemplateResponse,
)
from api.services.prompt_service import (
    create_prompt_version,
    get_active_prompt,
    get_prompt_by_id,
    list_prompt_versions,
)

router = APIRouter()

VALID_SLUGS = {"analyze", "report", "coach"}


def _validate_slug(slug: str) -> None:
    if slug not in VALID_SLUGS:
        raise HTTPException(status_code=400, detail=f"Invalid slug: {slug}")


@router.get("/{slug}", response_model=PromptTemplateResponse)
async def get_active(slug: str, user: CurrentUser):
    """Get the active prompt for the current org (with fallback info)."""
    _validate_slug(slug)
    body, template_id = get_active_prompt(user["org_id"], slug)

    if template_id:
        row = get_prompt_by_id(template_id, user["org_id"])
        if row:
            return PromptTemplateResponse(**row, is_default=False)

    # File fallback or global default — return a synthetic response
    from api.database import get_supabase_client
    from api.utils.supabase_helpers import rows_as_dicts

    db = get_supabase_client()
    globals_ = rows_as_dicts(
        db.table("prompt_templates")
        .select("*")
        .is_("org_id", "null")
        .eq("slug", slug)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    if globals_:
        return PromptTemplateResponse(**globals_[0], is_default=True)

    # Pure file fallback
    from datetime import datetime, timezone
    from uuid import uuid4

    return PromptTemplateResponse(
        id=uuid4(),
        org_id=None,
        slug=slug,
        version=0,
        body=body,
        created_by=None,
        created_at=datetime.now(timezone.utc),
        is_default=True,
    )


@router.get("/{slug}/versions", response_model=list[PromptTemplateResponse])
async def get_versions(slug: str, user: CurrentUser):
    """List all prompt versions for the current org."""
    _validate_slug(slug)
    versions = list_prompt_versions(user["org_id"], slug)
    return [PromptTemplateResponse(**v, is_default=False) for v in versions]


@router.post(
    "/{slug}",
    response_model=PromptTemplateResponse,
    dependencies=[require_role(Role.MANAGER, Role.ADMIN)],
)
async def create_version(slug: str, req: PromptTemplateCreate, user: CurrentUser):
    """Create a new prompt version for the current org."""
    _validate_slug(slug)
    row = create_prompt_version(
        org_id=user["org_id"],
        slug=slug,
        body=req.body,
        created_by=user["user_id"],
    )
    return PromptTemplateResponse(**row, is_default=False)


@router.post(
    "/{slug}/revert",
    response_model=PromptTemplateResponse,
    dependencies=[require_role(Role.MANAGER, Role.ADMIN)],
)
async def revert_to_version(slug: str, req: PromptRevertRequest, user: CurrentUser):
    """Copy body from an older version as a new version."""
    _validate_slug(slug)

    from api.database import get_supabase_client
    from api.utils.supabase_helpers import rows_as_dicts

    db = get_supabase_client()
    source = rows_as_dicts(
        db.table("prompt_templates")
        .select("body")
        .eq("org_id", user["org_id"])
        .eq("slug", slug)
        .eq("version", req.version)
        .execute()
    )
    if not source:
        raise HTTPException(status_code=404, detail=f"Version {req.version} not found")

    row = create_prompt_version(
        org_id=user["org_id"],
        slug=slug,
        body=source[0]["body"],
        created_by=user["user_id"],
    )
    return PromptTemplateResponse(**row, is_default=False)
