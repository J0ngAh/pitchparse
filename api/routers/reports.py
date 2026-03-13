"""Reports router — generate and list coaching reports."""

import inngest
import structlog
from fastapi import APIRouter, HTTPException

from api.auth import CurrentUser
from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.models.schemas import ReportDetail, ReportGenerateRequest, ReportResponse
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

logger = structlog.get_logger()

router = APIRouter()


@router.get("", response_model=list[ReportResponse])
async def list_reports(user: CurrentUser):
    """List reports. Users see only their own; managers/admins see all org data."""
    db = get_supabase_client()
    query = (
        db.table("reports").select("*").eq("org_id", user["org_id"]).order("created_at", desc=True)
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.execute()
    return [ReportResponse(**row) for row in rows_as_dicts(result)]


@router.get("/{report_id}", response_model=ReportDetail)
async def get_report(report_id: str, user: CurrentUser):
    """Get a single report with full HTML body."""
    db = get_supabase_client()
    query = db.table("reports").select("*").eq("id", report_id).eq("org_id", user["org_id"])

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportDetail(**row_as_dict(result))


def _verify_analysis(analysis_id: str, user: dict) -> dict:
    """Verify analysis belongs to org, is complete, and user has access."""
    db = get_supabase_client()
    query = (
        db.table("analyses")
        .select("id, body, status, consultant_name, prospect_name, overall_score, rating")
        .eq("id", analysis_id)
        .eq("org_id", user["org_id"])
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    row = row_as_dict(result)
    if row["status"] != "complete":
        raise HTTPException(status_code=400, detail="Analysis is not complete")
    return row


def _create_pending_report(org_id: str, analysis_id: str, model: str, user: dict) -> dict:
    """Create a pending report row in the database."""
    db = get_supabase_client()
    result = (
        db.table("reports")
        .insert(
            {
                "org_id": org_id,
                "analysis_id": analysis_id,
                "body": "",
                "metadata": {"status": "pending", "model": model},
                "created_by": user["user_id"],
            }
        )
        .execute()
    )
    return rows_as_dicts(result)[0]


@router.post("", response_model=ReportResponse, status_code=201)
async def generate_report_endpoint(
    req: ReportGenerateRequest,
    user: CurrentUser,
):
    """Generate a coaching report from an analysis. Runs via Inngest."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    _verify_analysis(req.analysis_id, user)
    report = _create_pending_report(user["org_id"], req.analysis_id, req.model, user)

    await inngest_client.send(
        inngest.Event(
            name="pitchparse/report.requested",
            data={
                "report_id": str(report["id"]),
                "analysis_id": req.analysis_id,
                "org_id": user["org_id"],
                "model": req.model,
            },
        )
    )

    return ReportResponse(**report)
