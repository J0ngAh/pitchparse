"""Admin router — cross-org system visibility (admin only)."""

import structlog
from fastapi import APIRouter
from postgrest import CountMethod

from api.auth import CurrentUser, Role, require_role
from api.database import get_supabase_client
from api.models.schemas import (
    AdminOrgSummary,
    AdminStats,
    AnalysisResponse,
    TranscriptResponse,
    UserSummary,
)
from api.utils.supabase_helpers import rows_as_dicts

logger = structlog.get_logger()

router = APIRouter(dependencies=[require_role(Role.ADMIN)])


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(user: CurrentUser):
    """System-wide aggregate metrics."""
    db = get_supabase_client()

    orgs = db.table("organizations").select("id", count=CountMethod.exact).execute()
    users = db.table("users").select("id", count=CountMethod.exact).execute()
    analyses = db.table("analyses").select("id", count=CountMethod.exact).execute()
    transcripts = db.table("transcripts").select("id", count=CountMethod.exact).execute()

    return AdminStats(
        total_orgs=orgs.count or 0,
        total_users=users.count or 0,
        total_analyses=analyses.count or 0,
        total_transcripts=transcripts.count or 0,
    )


@router.get("/orgs", response_model=list[AdminOrgSummary])
async def list_orgs(user: CurrentUser):
    """List all organizations with user counts."""
    db = get_supabase_client()
    result = (
        db.table("organizations").select("*, users(id)").order("created_at", desc=True).execute()
    )

    orgs = []
    for row in rows_as_dicts(result):
        user_list = row.pop("users", [])
        orgs.append(
            AdminOrgSummary(
                id=row["id"],
                name=row["name"],
                plan=row["plan"],
                analysis_quota=row["analysis_quota"],
                analysis_count=row["analysis_count"],
                user_count=len(user_list),
                created_at=row["created_at"],
            )
        )
    return orgs


@router.get("/orgs/{org_id}/users", response_model=list[UserSummary])
async def list_org_users(org_id: str, user: CurrentUser):
    """List users in any org."""
    db = get_supabase_client()
    result = (
        db.table("users")
        .select("id, email, name, role, created_at")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [UserSummary(**row) for row in rows_as_dicts(result)]


@router.get("/orgs/{org_id}/transcripts", response_model=list[TranscriptResponse])
async def list_org_transcripts(org_id: str, user: CurrentUser):
    """List transcripts for any org."""
    db = get_supabase_client()
    result = (
        db.table("transcripts")
        .select("*, analyses(id)")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    transcripts = []
    for row in rows_as_dicts(result):
        has_analysis = bool(row.pop("analyses", []))
        consultant_name = row.get("metadata", {}).get("consultant")
        transcripts.append(
            TranscriptResponse(
                id=row["id"],
                filename=row["filename"],
                source=row["source"],
                metadata=row["metadata"],
                consultant_name=consultant_name,
                created_at=row["created_at"],
                has_analysis=has_analysis,
            )
        )
    return transcripts


@router.get("/orgs/{org_id}/analyses", response_model=list[AnalysisResponse])
async def list_org_analyses(org_id: str, user: CurrentUser):
    """List analyses for any org."""
    db = get_supabase_client()
    result = (
        db.table("analyses")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [AnalysisResponse(**row) for row in rows_as_dicts(result)]
