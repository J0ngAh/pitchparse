"""Dashboard stats router — pre-computed metrics for the dashboard."""

from fastapi import APIRouter

from api.auth import CurrentUser
from api.database import get_supabase_client
from api.models.schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: CurrentUser):
    """Dashboard metrics via Postgres RPC — single query, no Python-side aggregation."""
    db = get_supabase_client()

    result = db.rpc(
        "dashboard_stats",
        {
            "p_org_id": user["org_id"],
            "p_user_role": user["role"],
            "p_user_id": user["user_id"],
        },
    ).execute()

    if result.data and isinstance(result.data, dict):
        return DashboardStats(**result.data)

    return DashboardStats()
