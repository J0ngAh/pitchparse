"""Analyses router — run analysis, list, get details, dashboard stats."""

import inngest
import structlog
from fastapi import APIRouter, HTTPException

from api.auth import CurrentUser
from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.models.schemas import (
    AnalysisDetail,
    AnalysisResponse,
    AnalysisRunRequest,
)
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

logger = structlog.get_logger()

router = APIRouter()


@router.get("", response_model=list[AnalysisResponse])
async def list_analyses(user: CurrentUser):
    """List analyses. Users see only their own; managers/admins see all org data."""
    db = get_supabase_client()
    query = (
        db.table("analyses").select("*").eq("org_id", user["org_id"]).order("created_at", desc=True)
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.execute()
    return [AnalysisResponse(**row) for row in rows_as_dicts(result)]


@router.get("/{analysis_id}", response_model=AnalysisDetail)
async def get_analysis(analysis_id: str, user: CurrentUser):
    """Get a single analysis with full detail."""
    db = get_supabase_client()
    query = db.table("analyses").select("*").eq("id", analysis_id).eq("org_id", user["org_id"])

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AnalysisDetail(**row_as_dict(result))


@router.post("", response_model=AnalysisResponse, status_code=201)
async def run_analysis_endpoint(
    req: AnalysisRunRequest,
    user: CurrentUser,
):
    """Start an analysis via Inngest. Returns immediately with pending status."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    _verify_transcript(req.transcript_id, user)
    _check_analysis_quota(user["org_id"])
    analysis = _create_pending_analysis(user["org_id"], req.transcript_id, req.model, user)

    # Get org config for the event payload
    db = get_supabase_client()
    org_result = (
        db.table("organizations").select("config").eq("id", user["org_id"]).single().execute()
    )
    org_config = row_as_dict(org_result).get("config") if org_result.data else None

    event_data = {
        "analysis_id": str(analysis["id"]),
        "org_id": user["org_id"],
        "transcript_id": req.transcript_id,
        "model": req.model,
        "focus": req.focus,
        "org_config": org_config,
        "created_by": user["user_id"],
    }
    event_name = (
        "pitchparse/pipeline.requested" if req.generate_report else "pitchparse/analysis.requested"
    )

    await inngest_client.send(inngest.Event(name=event_name, data=event_data))

    return AnalysisResponse(**analysis)


def _verify_transcript(transcript_id: str, user: dict) -> dict:
    """Verify transcript belongs to org (and user if role=user)."""
    db = get_supabase_client()
    query = (
        db.table("transcripts")
        .select("id, body")
        .eq("id", transcript_id)
        .eq("org_id", user["org_id"])
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return row_as_dict(result)


def _check_analysis_quota(org_id: str) -> dict:
    """Check org analysis quota and return org data."""
    db = get_supabase_client()
    result = (
        db.table("organizations")
        .select("analysis_quota, analysis_count, config")
        .eq("id", org_id)
        .single()
        .execute()
    )
    org = row_as_dict(result)
    if org["analysis_count"] >= org["analysis_quota"]:
        raise HTTPException(status_code=402, detail="Analysis quota exceeded")
    return org


def _create_pending_analysis(org_id: str, transcript_id: str, model: str, user: dict) -> dict:
    """Create a pending analysis row in the database."""
    db = get_supabase_client()
    result = (
        db.table("analyses")
        .insert(
            {
                "org_id": org_id,
                "transcript_id": transcript_id,
                "status": "pending",
                "model_used": model,
                "created_by": user["user_id"],
            }
        )
        .execute()
    )
    return rows_as_dicts(result)[0]
