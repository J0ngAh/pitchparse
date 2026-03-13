"""Org router — config management for the user's organization."""

import copy

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from api.auth import CurrentUser, Role, require_role
from api.database import get_supabase_client
from api.models.schemas import OrgConfigUpdate, OrgResponse
from api.services.config_service import get_org_config as merge_org_config
from api.services.config_service import invalidate_org_config_cache
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

router = APIRouter()

_LOGO_MAX_SIZE = 512 * 1024  # 512KB
_LOGO_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/svg+xml"}


@router.get("/config", response_model=OrgResponse)
async def get_org_config(user: CurrentUser):
    """Get the current user's org details and config (merged with defaults)."""
    db = get_supabase_client()
    result = db.table("organizations").select("*").eq("id", user["org_id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    row = row_as_dict(result)
    row["config"] = merge_org_config(row.get("config"))
    return OrgResponse(**row)


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
    row = rows_as_dicts(result)[0]
    row["config"] = merge_org_config(row.get("config"))
    return OrgResponse(**row)


@router.post(
    "/logo",
    dependencies=[require_role(Role.MANAGER, Role.ADMIN)],
)
async def upload_logo(file: UploadFile, user: CurrentUser):
    """Upload an org logo (PNG/JPG/SVG, max 512KB)."""
    if file.content_type not in _LOGO_ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File must be PNG, JPG, or SVG")

    content = await file.read()
    if len(content) > _LOGO_MAX_SIZE:
        raise HTTPException(status_code=400, detail="File must be under 512KB")

    ext = {"image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg"}[file.content_type]
    org_id = user["org_id"]
    storage_path = f"branding/{org_id}/logo.{ext}"

    db = get_supabase_client()

    # Upload to Supabase Storage (upsert to replace existing)
    db.storage.from_("branding").upload(
        storage_path, content, {"content-type": file.content_type, "upsert": "true"}
    )

    # Get public URL
    public_url = db.storage.from_("branding").get_public_url(storage_path)

    # Update org config with logo_url
    org_result = db.table("organizations").select("config").eq("id", org_id).single().execute()
    current_config = row_as_dict(org_result).get("config") or {}
    updated_config = copy.deepcopy(current_config)
    updated_config.setdefault("branding", {})["logo_url"] = public_url

    db.table("organizations").update({"config": updated_config}).eq("id", org_id).execute()
    invalidate_org_config_cache(org_id)

    return JSONResponse({"logo_url": public_url})


@router.delete(
    "/logo",
    dependencies=[require_role(Role.MANAGER, Role.ADMIN)],
)
async def remove_logo(user: CurrentUser):
    """Remove the org logo."""
    org_id = user["org_id"]
    db = get_supabase_client()

    # Remove logo_url from config
    org_result = db.table("organizations").select("config").eq("id", org_id).single().execute()
    current_config = row_as_dict(org_result).get("config") or {}
    updated_config = copy.deepcopy(current_config)
    if "branding" in updated_config:
        updated_config["branding"].pop("logo_url", None)

    db.table("organizations").update({"config": updated_config}).eq("id", org_id).execute()
    invalidate_org_config_cache(org_id)

    return JSONResponse({"logo_url": None})
