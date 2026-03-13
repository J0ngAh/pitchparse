"""Authentication dependency — extract user + org from Supabase JWT."""

import uuid
from enum import StrEnum
from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, Request

from api.database import get_supabase_from_request
from api.utils.supabase_helpers import row_as_dict

logger = structlog.get_logger()


class Role(StrEnum):
    USER = "user"
    MANAGER = "manager"
    ADMIN = "admin"


def _extract_jwt_claims(token: str) -> dict | None:
    """Try local JWT decode and return user dict if all claims are present."""
    from api.jwt import decode_supabase_jwt

    payload = decode_supabase_jwt(token)
    if not payload:
        return None
    meta = payload.get("user_metadata", {})
    user_id = payload.get("sub")
    org_id = meta.get("org_id")
    role = meta.get("role")
    email = payload.get("email")
    if not (user_id and org_id and role and email):
        return None
    return {
        "user_id": user_id,
        "org_id": org_id,
        "email": email,
        "name": meta.get("name") or email,
        "role": role,
    }


def _lookup_user_from_db(request: Request, token: str) -> dict:
    """Fall back to Supabase API + DB lookup for user info."""
    try:
        db = get_supabase_from_request(request)
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = str(user_response.user.id)
        result = (
            db.table("users")
            .select("org_id, name, email, role")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=403, detail="User not associated with an organization")
        row = row_as_dict(result)
        return {"user_id": user_id, **{k: row[k] for k in ("org_id", "email", "name", "role")}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")


def _apply_admin_org_override(user_dict: dict, request: Request) -> None:
    """Allow admins to view another org's data via X-Admin-Org-Id header."""
    admin_org_id = request.headers.get("X-Admin-Org-Id")
    if not admin_org_id or user_dict["role"] != Role.ADMIN:
        return
    try:
        uuid.UUID(admin_org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-Admin-Org-Id header")
    logger.info(
        "admin_org_override",
        user_id=user_dict["user_id"],
        real_org_id=user_dict["org_id"],
        target_org_id=admin_org_id,
    )
    user_dict["_real_org_id"] = user_dict["org_id"]
    user_dict["org_id"] = admin_org_id


async def get_current_user(request: Request) -> dict:
    """Verify the Supabase JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.removeprefix("Bearer ").strip()
    user_dict = _extract_jwt_claims(token) or _lookup_user_from_db(request, token)
    _apply_admin_org_override(user_dict, request)
    return user_dict


CurrentUser = Annotated[dict, Depends(get_current_user)]


def require_role(*roles: Role):
    """Dependency factory for route-level role guards.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(Role.ADMIN))])
    """

    async def check_role(user: CurrentUser) -> dict:
        if user["role"] not in [r.value for r in roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return Depends(check_role)
