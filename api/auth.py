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


async def get_current_user(request: Request) -> dict:
    """Verify the Supabase JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.removeprefix("Bearer ").strip()

    # Try local JWT verification first (no network call)
    from api.jwt import decode_supabase_jwt

    payload = decode_supabase_jwt(token)
    user_id: str | None = None
    org_id: str | None = None
    role: str | None = None
    email: str | None = None
    name: str | None = None

    if payload:
        user_id = payload.get("sub")
        # Check for custom claims set during signup
        meta = payload.get("user_metadata", {})
        org_id = meta.get("org_id")
        role = meta.get("role")
        email = payload.get("email")
        name = meta.get("name")

    if user_id and org_id and role and email:
        # Fast path — everything from JWT, no DB call needed
        user_dict: dict = {
            "user_id": user_id,
            "org_id": org_id,
            "email": email,
            "name": name or email,
            "role": role,
        }
    else:
        # Slow path — fall back to Supabase API + DB lookup
        try:
            db = get_supabase_from_request(request)
            if not payload:
                # JWT decode failed locally, try Supabase verification
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
                raise HTTPException(
                    status_code=403, detail="User not associated with an organization"
                )

            row = row_as_dict(result)
            user_dict = {
                "user_id": user_id,
                "org_id": row["org_id"],
                "email": row["email"],
                "name": row["name"],
                "role": row["role"],
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")

    # Admin org override: allow admins to view another org's data.
    admin_org_id = request.headers.get("X-Admin-Org-Id")
    if admin_org_id and user_dict["role"] == Role.ADMIN:
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
