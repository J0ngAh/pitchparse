"""Team management router — invite members, manage roles."""

import structlog
from fastapi import APIRouter, HTTPException

from api.auth import CurrentUser, Role, require_role
from api.database import get_supabase_client
from api.models.schemas import (
    InvitationRequest,
    InvitationResponse,
    RoleUpdateRequest,
    UserSummary,
)
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

logger = structlog.get_logger()

router = APIRouter(dependencies=[require_role(Role.MANAGER, Role.ADMIN)])


@router.get("/members", response_model=list[UserSummary])
async def list_members(user: CurrentUser):
    """List all members in the user's org."""
    db = get_supabase_client()
    result = (
        db.table("users")
        .select("id, email, name, role, created_at")
        .eq("org_id", user["org_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return [UserSummary(**row) for row in rows_as_dicts(result)]


@router.post("/invite", response_model=InvitationResponse, status_code=201)
async def invite_member(req: InvitationRequest, user: CurrentUser):
    """Send an invitation to join the org."""
    db = get_supabase_client()

    # Check if user already exists in org
    existing = (
        db.table("users").select("id").eq("org_id", user["org_id"]).eq("email", req.email).execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="User already in organization")

    # Check for existing pending invitation
    pending = (
        db.table("invitations")
        .select("id")
        .eq("org_id", user["org_id"])
        .eq("email", req.email)
        .eq("status", "pending")
        .execute()
    )
    if pending.data:
        raise HTTPException(status_code=400, detail="Invitation already pending for this email")

    result = (
        db.table("invitations")
        .insert(
            {
                "org_id": user["org_id"],
                "email": req.email,
                "role": req.role,
                "invited_by": user["user_id"],
            }
        )
        .execute()
    )
    return InvitationResponse(**rows_as_dicts(result)[0])


@router.get("/invitations", response_model=list[InvitationResponse])
async def list_invitations(user: CurrentUser):
    """List pending invitations for the org."""
    db = get_supabase_client()
    result = (
        db.table("invitations")
        .select("*")
        .eq("org_id", user["org_id"])
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return [InvitationResponse(**row) for row in rows_as_dicts(result)]


@router.delete("/invitations/{invitation_id}", status_code=204)
async def revoke_invitation(invitation_id: str, user: CurrentUser):
    """Revoke a pending invitation."""
    db = get_supabase_client()
    result = (
        db.table("invitations")
        .select("id")
        .eq("id", invitation_id)
        .eq("org_id", user["org_id"])
        .eq("status", "pending")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invitation not found")

    db.table("invitations").delete().eq("id", invitation_id).execute()


@router.patch("/members/{member_id}/role", response_model=UserSummary)
async def update_member_role(member_id: str, req: RoleUpdateRequest, user: CurrentUser):
    """Change a member's role. Managers can set user/manager; admins can set any."""
    if member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    # Managers can only assign user or manager
    if user["role"] == "manager" and req.role == "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign admin role")

    db = get_supabase_client()

    # Verify target is in same org
    target = (
        db.table("users")
        .select("id, org_id")
        .eq("id", member_id)
        .eq("org_id", user["org_id"])
        .single()
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found in organization")

    db.table("users").update({"role": req.role}).eq("id", member_id).execute()

    result = (
        db.table("users")
        .select("id, email, name, role, created_at")
        .eq("id", member_id)
        .single()
        .execute()
    )
    return UserSummary(**row_as_dict(result))


@router.delete("/members/{member_id}", status_code=204)
async def remove_member(member_id: str, user: CurrentUser):
    """Remove a user from the org."""
    if member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    db = get_supabase_client()

    target = (
        db.table("users")
        .select("id, org_id")
        .eq("id", member_id)
        .eq("org_id", user["org_id"])
        .single()
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found in organization")

    db.table("users").delete().eq("id", member_id).execute()
