"""Auth router — signup and login via Supabase Auth."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.database import get_supabase_auth_from_request, get_supabase_from_request
from api.models.schemas import AuthResponse, LoginRequest, SignupRequest
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(req: SignupRequest, request: Request):
    """Create a new org + user, or accept a pending invitation."""
    auth_client = get_supabase_auth_from_request(request)
    db = get_supabase_from_request(request)

    try:
        # Check for pending invitation
        invite_result = (
            db.table("invitations")
            .select("*")
            .eq("email", req.email)
            .eq("status", "pending")
            .execute()
        )
        invitation = rows_as_dicts(invite_result)[0] if invite_result.data else None

        auth_response = auth_client.auth.sign_up(
            {
                "email": req.email,
                "password": req.password,
            }
        )
        user = auth_response.user
        if not user:
            raise HTTPException(status_code=400, detail="Signup failed")

        if invitation:
            # Accept invitation — join existing org with invited role
            role = invitation["role"]
            org_id = invitation["org_id"]

            db.table("users").insert(
                {
                    "id": str(user.id),
                    "org_id": org_id,
                    "email": req.email,
                    "name": req.name,
                    "role": role,
                }
            ).execute()

            # Mark invitation as accepted
            db.table("invitations").update({"status": "accepted"}).eq(
                "id", invitation["id"]
            ).execute()
        else:
            # New org creator — gets manager role
            org_result = db.table("organizations").insert({"name": req.org_name}).execute()
            org = rows_as_dicts(org_result)[0]
            org_id = org["id"]
            role = "manager"

            db.table("users").insert(
                {
                    "id": str(user.id),
                    "org_id": org_id,
                    "email": req.email,
                    "name": req.name,
                    "role": role,
                }
            ).execute()

        session = auth_response.session
        if not session:
            return JSONResponse(
                content={
                    "requires_confirmation": True,
                    "email": req.email,
                    "message": "Check your email to confirm your account before logging in.",
                }
            )

        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
            org_id=org_id,
            email=req.email,
            role=role,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(req: LoginRequest, request: Request):
    """Log in with email/password. Returns Supabase JWT."""
    auth_client = get_supabase_auth_from_request(request)
    db = get_supabase_from_request(request)

    try:
        auth_response = auth_client.auth.sign_in_with_password(
            {
                "email": req.email,
                "password": req.password,
            }
        )
        user = auth_response.user
        session = auth_response.session
        if not user or not session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_result = (
            db.table("users").select("org_id, role").eq("id", str(user.id)).single().execute()
        )
        if not user_result.data:
            raise HTTPException(status_code=403, detail="User not linked to an organization")

        user_row = row_as_dict(user_result)
        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
            org_id=user_row["org_id"],
            email=req.email,
            role=user_row["role"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
