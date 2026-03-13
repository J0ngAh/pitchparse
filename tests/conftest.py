"""Shared test fixtures for PitchParse API tests."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

# ── Mock Supabase Chain ──


class MockResponse:
    """Mimics a Supabase API response."""

    def __init__(self, data: Any = None):
        self.data = data if data is not None else []
        self.count: int | None = None


class MockSupabaseChain:
    """Chainable mock for Supabase client queries.

    Supports: .table().select().eq().order().insert().update().upsert()
    .single().execute().rpc()

    Per-table data can be set via _set_table_data(table, data) for
    multi-query flows. Falls back to _data when no table-specific data exists.
    """

    def __init__(self, data: Any = None):
        self._data = data
        self._table_data: dict[str, Any] = {}
        self._current_table: str | None = None
        self.auth = MagicMock()

    def _set_data(self, data: Any) -> None:
        self._data = data

    def _set_table_data(self, table: str, data: Any) -> None:
        self._table_data[table] = data

    def table(self, name: str) -> "MockSupabaseChain":
        self._current_table = name
        return self

    def select(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def eq(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def neq(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def or_(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def order(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def insert(self, data: Any) -> "MockSupabaseChain":
        return self

    def update(self, data: Any) -> "MockSupabaseChain":
        return self

    def delete(self) -> "MockSupabaseChain":
        return self

    def upsert(self, data: Any) -> "MockSupabaseChain":
        return self

    def single(self) -> "MockSupabaseChain":
        return self

    @property
    def not_(self) -> "MockSupabaseChain":
        return self

    def is_(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def limit(self, *args: Any, **kwargs: Any) -> "MockSupabaseChain":
        return self

    def rpc(self, fn_name: str, params: Any = None) -> "MockSupabaseChain":
        return self

    def execute(self) -> MockResponse:
        if self._current_table and self._current_table in self._table_data:
            data = self._table_data[self._current_table]
        else:
            data = self._data
        return MockResponse(data=data)


# ── User Fixtures ──


TEST_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
TEST_USER_ID = "f1e2d3c4-b5a6-7890-fedc-ba9876543210"
TEST_ORG_ID_2 = "b2c3d4e5-f6a7-8901-bcde-f12345678901"
TEST_USER_ID_2 = "e2d3c4b5-a6f7-8901-edcb-a98765432101"


@pytest.fixture
def mock_user() -> dict:
    return {
        "user_id": TEST_USER_ID,
        "org_id": TEST_ORG_ID,
        "email": "test@example.com",
        "name": "Test User",
        "role": "manager",
    }


# ── Supabase Fixtures ──


@pytest.fixture
def mock_supabase() -> MockSupabaseChain:
    return MockSupabaseChain()


# ── FastAPI App Client ──


@pytest.fixture
async def app_client(mock_user, mock_supabase):
    """Async httpx client wrapping the FastAPI app with mocked auth + DB.

    Patches get_supabase_client globally so all routers that call it
    directly (not via request.app.state) get the mock too.
    """
    from api.auth import get_current_user
    from api.main import app

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.state.supabase = mock_supabase
    app.state.supabase_auth = mock_supabase

    with patch("api.database.get_supabase_client", return_value=mock_supabase):
        with patch("api.database.get_supabase_auth_client", return_value=mock_supabase):
            # Also patch in each router module that imports get_supabase_client at the top
            with (
                patch("api.routers.org.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.transcripts.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.analyses.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.reports.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.billing.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.team.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.admin.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.dashboard.get_supabase_client", return_value=mock_supabase),
                patch("api.routers.coach.get_supabase_client", return_value=mock_supabase),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    yield client

    app.dependency_overrides.clear()


# ── User Factory ──


@pytest.fixture
def make_user():
    """Factory fixture to create mock users with custom role/org."""

    def _make(
        role: str = "manager",
        org_id: str = TEST_ORG_ID,
        user_id: str | None = None,
        email: str = "test@example.com",
        name: str = "Test User",
    ) -> dict:
        return {
            "user_id": user_id or str(uuid4()),
            "org_id": org_id,
            "email": email,
            "name": name,
            "role": role,
        }

    return _make


# ── App Client Factory ──

_ALL_ROUTER_PATCHES = [
    "api.database.get_supabase_client",
    "api.database.get_supabase_auth_client",
    "api.routers.org.get_supabase_client",
    "api.routers.transcripts.get_supabase_client",
    "api.routers.analyses.get_supabase_client",
    "api.routers.reports.get_supabase_client",
    "api.routers.billing.get_supabase_client",
    "api.routers.team.get_supabase_client",
    "api.routers.admin.get_supabase_client",
    "api.routers.dashboard.get_supabase_client",
    "api.routers.coach.get_supabase_client",
]


@pytest.fixture
def make_app_client():
    """Factory fixture yielding async context managers for per-user clients."""

    @asynccontextmanager
    async def _make(user: dict, supabase: MockSupabaseChain | None = None):
        from api.auth import get_current_user
        from api.main import app

        mock_sb = supabase or MockSupabaseChain()
        app.dependency_overrides[get_current_user] = lambda: user
        app.state.supabase = mock_sb
        app.state.supabase_auth = mock_sb

        patches = [patch(target, return_value=mock_sb) for target in _ALL_ROUTER_PATCHES]
        for p in patches:
            p.start()

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                yield client
        finally:
            for p in patches:
                p.stop()
            app.dependency_overrides.clear()

    return _make


# ── Sample Data Factories ──


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@pytest.fixture
def sample_transcript() -> dict:
    return {
        "id": str(uuid4()),
        "org_id": TEST_ORG_ID,
        "consultant_id": None,
        "filename": "test-call.md",
        "source": "upload",
        "metadata": {},
        "body": "## Transcript\n\n[00:00] **Speaker 1:** Hello",
        "created_at": _now_iso(),
        "analyses": [],
    }


@pytest.fixture
def sample_analysis() -> dict:
    return {
        "id": str(uuid4()),
        "org_id": TEST_ORG_ID,
        "transcript_id": str(uuid4()),
        "status": "complete",
        "overall_score": 82,
        "rating": "Good",
        "consultant_name": "Alice",
        "prospect_name": "Bob",
        "model_used": "claude-sonnet-4-6",
        "error_message": None,
        "scorecard": {"Question Quality": {"score": 4.0, "evidence": "Good Qs"}},
        "phases": [
            {
                "number": 1,
                "name": "Opening",
                "score": 16,
                "max": 20,
                "strengths": "Good",
                "gaps": "None",
            }
        ],
        "coaching": [
            {
                "priority": 1,
                "level": "HIGH",
                "title": "Improve Close",
                "area": "Close",
                "issue": "Weak",
                "impact": "Stalls",
                "action": "Propose options",
            }
        ],
        "sentiment": {"trajectory": "Positive", "inflections": []},
        "body": "# Analysis\n\nTest body",
        "created_at": _now_iso(),
        "completed_at": _now_iso(),
    }


@pytest.fixture
def sample_report() -> dict:
    return {
        "id": str(uuid4()),
        "org_id": TEST_ORG_ID,
        "analysis_id": str(uuid4()),
        "body": "<html><body>Report</body></html>",
        "metadata": {"status": "complete", "model": "claude-sonnet-4-6"},
        "created_at": _now_iso(),
    }


@pytest.fixture
def sample_org(mock_user) -> dict:
    return {
        "id": mock_user["org_id"],
        "name": "Test Org",
        "config": {},
        "plan": "starter",
        "analysis_quota": 50,
        "analysis_count": 5,
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
    }
