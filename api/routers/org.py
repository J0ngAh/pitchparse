"""Org router — config management for the user's organization."""

from fastapi import APIRouter, HTTPException

from api.auth import CurrentUser
from api.database import get_supabase_client
from api.models.schemas import OrgConfigUpdate, OrgResponse
from api.services.config_service import invalidate_org_config_cache
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

router = APIRouter()


@router.get("/config", response_model=OrgResponse)
async def get_org_config(user: CurrentUser):
    """Get the current user's org details and config."""
    db = get_supabase_client()
    result = db.table("organizations").select("*").eq("id", user["org_id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgResponse(**row_as_dict(result))


@router.put("/config", response_model=OrgResponse)
async def update_org_config(req: OrgConfigUpdate, user: CurrentUser):
    """Update the org's config (branding, KPIs, thresholds, call structure)."""
    db = get_supabase_client()

    result = (
        db.table("organizations").update({"config": req.config}).eq("id", user["org_id"]).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    invalidate_org_config_cache(user["org_id"])
    return OrgResponse(**rows_as_dicts(result)[0])
