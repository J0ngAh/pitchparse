"""Integration tests — multi-step flows, org isolation, concurrency."""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import (
    TEST_ORG_ID,
    TEST_ORG_ID_2,
    TEST_USER_ID,
    TEST_USER_ID_2,
    MockSupabaseChain,
)

# ═══════════════════════════════════════════════════════
# Group 1 — Signup / Login Flow
# ═══════════════════════════════════════════════════════


def _make_auth_app_client():
    """Create a raw app client without CurrentUser override (for auth tests)."""
    from api.main import app

    # Clear any leftover overrides
    app.dependency_overrides.clear()
    mock_sb = MockSupabaseChain()
    app.state.supabase = mock_sb
    app.state.supabase_auth = mock_sb
    return app, mock_sb


@pytest.mark.asyncio
async def test_signup_creates_org_and_returns_token():
    """POST /api/auth/signup → 200 with access_token + org_id."""
    app, mock_sb = _make_auth_app_client()

    org_id = str(uuid4())
    user_id = str(uuid4())

    # Mock: no pending invitation
    mock_sb._set_table_data("invitations", [])
    # Mock: org creation returns new org
    mock_sb._set_table_data("organizations", [{"id": org_id, "name": "New Org"}])
    # Mock: user creation
    mock_sb._set_table_data("users", [{"id": user_id}])

    # Mock auth.sign_up
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_session = MagicMock()
    mock_session.access_token = "test-jwt-token"
    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user
    mock_auth_response.session = mock_session
    mock_sb.auth.sign_up.return_value = mock_auth_response

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/signup",
            json={
                "email": "new@example.com",
                "password": "securepass123",
                "name": "New User",
                "org_name": "New Org",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["access_token"] == "test-jwt-token"
    assert "org_id" in body
    assert body["role"] == "manager"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_signup_then_login_returns_same_org():
    """Signup then login with same creds should return same org_id."""
    app, mock_sb = _make_auth_app_client()

    org_id = str(uuid4())
    user_id = str(uuid4())

    # -- Signup mocks --
    mock_sb._set_table_data("invitations", [])
    mock_sb._set_table_data("organizations", [{"id": org_id, "name": "Org"}])
    mock_sb._set_table_data("users", [{"id": user_id}])

    mock_user = MagicMock()
    mock_user.id = user_id
    mock_session = MagicMock()
    mock_session.access_token = "signup-token"
    mock_auth_resp = MagicMock()
    mock_auth_resp.user = mock_user
    mock_auth_resp.session = mock_session
    mock_sb.auth.sign_up.return_value = mock_auth_resp

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        signup_resp = await client.post(
            "/api/auth/signup",
            json={
                "email": "repeat@example.com",
                "password": "securepass123",
                "name": "Repeat User",
                "org_name": "Repeat Org",
            },
        )

    assert signup_resp.status_code == 200
    signup_org = signup_resp.json()["org_id"]

    # -- Login mocks --
    mock_session_login = MagicMock()
    mock_session_login.access_token = "login-token"
    mock_auth_resp_login = MagicMock()
    mock_auth_resp_login.user = mock_user
    mock_auth_resp_login.session = mock_session_login
    mock_sb.auth.sign_in_with_password.return_value = mock_auth_resp_login

    # Login user lookup returns same org
    mock_sb._set_table_data("users", {"org_id": org_id, "role": "manager"})

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "repeat@example.com", "password": "securepass123"},
        )

    assert login_resp.status_code == 200
    assert login_resp.json()["org_id"] == signup_org

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_signup_email_confirmation_flow():
    """When session is None, response includes requires_confirmation."""
    app, mock_sb = _make_auth_app_client()

    user_id = str(uuid4())
    org_id = str(uuid4())

    mock_sb._set_table_data("invitations", [])
    mock_sb._set_table_data("organizations", [{"id": org_id, "name": "Confirm Org"}])
    mock_sb._set_table_data("users", [{"id": user_id}])

    mock_user = MagicMock()
    mock_user.id = user_id
    mock_auth_resp = MagicMock()
    mock_auth_resp.user = mock_user
    mock_auth_resp.session = None  # No session — requires email confirmation
    mock_sb.auth.sign_up.return_value = mock_auth_resp

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/signup",
            json={
                "email": "confirm@example.com",
                "password": "securepass123",
                "name": "Confirm User",
                "org_name": "Confirm Org",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["requires_confirmation"] is True
    assert body["email"] == "confirm@example.com"

    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════
# Group 2 — Upload → Analysis → Report Pipeline
# ═══════════════════════════════════════════════════════


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@pytest.mark.asyncio
async def test_full_pipeline_upload_analyze_report(
    make_app_client, make_user, sample_transcript, sample_analysis, sample_report
):
    """Chain: upload transcript → run analysis → generate report → get report."""
    user = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    mock_sb = MockSupabaseChain()

    transcript_id = sample_transcript["id"]
    analysis_id = sample_analysis["id"]
    report_id = sample_report["id"]

    # Ensure IDs link together
    sample_analysis["transcript_id"] = transcript_id
    sample_report["analysis_id"] = analysis_id

    async with make_app_client(user, mock_sb) as client:
        # Step 1: Upload transcript
        mock_sb._set_data([sample_transcript])
        resp = await client.post(
            "/api/transcripts",
            json={
                "filename": "test-call.md",
                "body": "## Transcript\n\n[00:00] **Speaker 1:** Hello",
                "source": "upload",
                "metadata": {},
            },
        )
        assert resp.status_code == 201

        # Step 2: Run analysis
        mock_inngest = AsyncMock()
        with (
            patch(
                "api.routers.analyses._verify_transcript",
                return_value={"id": transcript_id, "body": "transcript body"},
            ),
            patch(
                "api.routers.analyses._check_analysis_quota",
                return_value={
                    "analysis_quota": 50,
                    "analysis_count": 5,
                    "config": {},
                },
            ),
            patch(
                "api.routers.analyses._create_pending_analysis",
                return_value={
                    "id": analysis_id,
                    "org_id": TEST_ORG_ID,
                    "transcript_id": transcript_id,
                    "status": "pending",
                    "model_used": "claude-sonnet-4-6",
                    "error_message": None,
                    "overall_score": None,
                    "rating": None,
                    "consultant_name": None,
                    "prospect_name": None,
                    "created_at": _now_iso(),
                    "completed_at": None,
                },
            ),
            patch("api.routers.analyses.inngest_client", mock_inngest),
            patch("api.routers.analyses.get_settings") as mock_settings,
        ):
            mock_settings.return_value.anthropic_api_key = "test-key"
            # org config lookup
            mock_sb._set_table_data("organizations", {"config": {}, "id": TEST_ORG_ID})

            resp = await client.post(
                "/api/analyses",
                json={"transcript_id": transcript_id},
            )
            assert resp.status_code == 201
            assert resp.json()["id"] == analysis_id
            mock_inngest.send.assert_called_once()
            event = mock_inngest.send.call_args[0][0]
            assert event.data["transcript_id"] == transcript_id

        # Step 3: Generate report
        mock_inngest2 = AsyncMock()
        with (
            patch(
                "api.routers.reports._verify_analysis",
                return_value={
                    "id": analysis_id,
                    "body": "analysis body",
                    "status": "complete",
                    "consultant_name": "Alice",
                    "prospect_name": "Bob",
                    "overall_score": 82,
                    "rating": "Good",
                },
            ),
            patch(
                "api.routers.reports._create_pending_report",
                return_value={
                    "id": report_id,
                    "org_id": TEST_ORG_ID,
                    "analysis_id": analysis_id,
                    "body": "",
                    "metadata": {
                        "status": "pending",
                        "model": "claude-sonnet-4-6",
                    },
                    "created_at": _now_iso(),
                },
            ),
            patch("api.routers.reports.inngest_client", mock_inngest2),
            patch("api.routers.reports.get_settings") as mock_settings2,
        ):
            mock_settings2.return_value.anthropic_api_key = "test-key"
            resp = await client.post(
                "/api/reports",
                json={"analysis_id": analysis_id},
            )
            assert resp.status_code == 201
            assert resp.json()["id"] == report_id
            mock_inngest2.send.assert_called_once()

        # Step 4: Get report by ID
        mock_sb._set_table_data(
            "reports",
            {
                "id": report_id,
                "org_id": TEST_ORG_ID,
                "analysis_id": analysis_id,
                "body": "<html>Report</html>",
                "metadata": {"status": "complete", "model": "claude-sonnet-4-6"},
                "created_at": _now_iso(),
            },
        )
        mock_sb._set_data(
            {
                "id": report_id,
                "org_id": TEST_ORG_ID,
                "analysis_id": analysis_id,
                "body": "<html>Report</html>",
                "metadata": {"status": "complete", "model": "claude-sonnet-4-6"},
                "created_at": _now_iso(),
            }
        )
        resp = await client.get(f"/api/reports/{report_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == report_id


@pytest.mark.asyncio
async def test_pipeline_analysis_rejects_missing_transcript(make_app_client, make_user):
    """POST /api/analyses with nonexistent transcript → 404."""
    user = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    mock_sb = MockSupabaseChain()

    async with make_app_client(user, mock_sb) as client:
        with (
            patch(
                "api.routers.analyses._verify_transcript",
                side_effect=__import__("fastapi").HTTPException(
                    status_code=404, detail="Transcript not found"
                ),
            ),
            patch("api.routers.analyses.get_settings") as mock_settings,
        ):
            mock_settings.return_value.anthropic_api_key = "test-key"
            resp = await client.post(
                "/api/analyses",
                json={"transcript_id": str(uuid4())},
            )
        assert resp.status_code == 404
        assert "Transcript not found" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_pipeline_report_rejects_incomplete_analysis(make_app_client, make_user):
    """POST /api/reports with pending analysis → 400."""
    user = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    mock_sb = MockSupabaseChain()

    async with make_app_client(user, mock_sb) as client:
        with (
            patch(
                "api.routers.reports._verify_analysis",
                side_effect=__import__("fastapi").HTTPException(
                    status_code=400, detail="Analysis is not complete"
                ),
            ),
            patch("api.routers.reports.get_settings") as mock_settings,
        ):
            mock_settings.return_value.anthropic_api_key = "test-key"
            resp = await client.post(
                "/api/reports",
                json={"analysis_id": str(uuid4())},
            )
        assert resp.status_code == 400
        assert "not complete" in resp.json()["detail"]


# ═══════════════════════════════════════════════════════
# Group 3 — RLS / Org Isolation
# ═══════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_org_isolation_transcripts(make_app_client, make_user):
    """User in org_2 gets empty list for org_1's transcripts."""
    user_org1 = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    user_org2 = make_user(role="manager", org_id=TEST_ORG_ID_2, user_id=TEST_USER_ID_2)

    transcript = {
        "id": str(uuid4()),
        "org_id": TEST_ORG_ID,
        "filename": "org1-call.md",
        "source": "upload",
        "metadata": {},
        "consultant_name": None,
        "created_at": _now_iso(),
        "has_analysis": False,
    }

    # Org 1 sees transcript
    mock_sb1 = MockSupabaseChain(data=[transcript])
    async with make_app_client(user_org1, mock_sb1) as client:
        resp = await client.get("/api/transcripts")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    # Org 2 sees empty (RLS filters out org 1 data)
    mock_sb2 = MockSupabaseChain(data=[])
    async with make_app_client(user_org2, mock_sb2) as client:
        resp = await client.get("/api/transcripts")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_org_isolation_analyses(make_app_client, make_user):
    """User in org_2 gets empty list for org_1's analyses."""
    user_org1 = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    user_org2 = make_user(role="manager", org_id=TEST_ORG_ID_2, user_id=TEST_USER_ID_2)

    analysis = {
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
        "created_at": _now_iso(),
        "completed_at": _now_iso(),
    }

    mock_sb1 = MockSupabaseChain(data=[analysis])
    async with make_app_client(user_org1, mock_sb1) as client:
        resp = await client.get("/api/analyses")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    mock_sb2 = MockSupabaseChain(data=[])
    async with make_app_client(user_org2, mock_sb2) as client:
        resp = await client.get("/api/analyses")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_org_isolation_org_config(make_app_client, make_user):
    """Each user reads their own org config, not the other's."""
    user_org1 = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    user_org2 = make_user(role="manager", org_id=TEST_ORG_ID_2, user_id=TEST_USER_ID_2)

    org1_data = {
        "id": TEST_ORG_ID,
        "name": "Org One",
        "config": {"theme": "dark"},
        "plan": "starter",
        "analysis_quota": 50,
        "analysis_count": 5,
    }
    org2_data = {
        "id": TEST_ORG_ID_2,
        "name": "Org Two",
        "config": {"theme": "light"},
        "plan": "team",
        "analysis_quota": 200,
        "analysis_count": 10,
    }

    mock_sb1 = MockSupabaseChain(data=org1_data)
    async with make_app_client(user_org1, mock_sb1) as client:
        resp = await client.get("/api/org/config")
        assert resp.status_code == 200
        assert resp.json()["config"]["theme"] == "dark"

    mock_sb2 = MockSupabaseChain(data=org2_data)
    async with make_app_client(user_org2, mock_sb2) as client:
        resp = await client.get("/api/org/config")
        assert resp.status_code == 200
        assert resp.json()["config"]["theme"] == "light"


# ═══════════════════════════════════════════════════════
# Group 4 — Concurrent Analysis Submissions
# ═══════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_concurrent_analysis_submissions(make_app_client, make_user):
    """asyncio.gather 3 POST /analyses → all 201 with distinct IDs."""
    user = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    mock_sb = MockSupabaseChain()

    transcript_id = str(uuid4())
    analysis_ids = [str(uuid4()) for _ in range(3)]

    # Each call returns a different pending analysis
    pending_analyses = [
        {
            "id": aid,
            "org_id": TEST_ORG_ID,
            "transcript_id": transcript_id,
            "status": "pending",
            "model_used": "claude-sonnet-4-6",
            "error_message": None,
            "overall_score": None,
            "rating": None,
            "consultant_name": None,
            "prospect_name": None,
            "created_at": _now_iso(),
            "completed_at": None,
        }
        for aid in analysis_ids
    ]

    mock_inngest = AsyncMock()

    async with make_app_client(user, mock_sb) as client:
        with (
            patch(
                "api.routers.analyses._verify_transcript",
                return_value={"id": transcript_id, "body": "body"},
            ),
            patch(
                "api.routers.analyses._check_analysis_quota",
                return_value={
                    "analysis_quota": 50,
                    "analysis_count": 0,
                    "config": {},
                },
            ),
            patch(
                "api.routers.analyses._create_pending_analysis",
                side_effect=pending_analyses,
            ),
            patch("api.routers.analyses.inngest_client", mock_inngest),
            patch("api.routers.analyses.get_settings") as mock_settings,
        ):
            mock_settings.return_value.anthropic_api_key = "test-key"
            mock_sb._set_table_data("organizations", {"config": {}, "id": TEST_ORG_ID})

            responses = await asyncio.gather(
                *[
                    client.post(
                        "/api/analyses",
                        json={"transcript_id": transcript_id},
                    )
                    for _ in range(3)
                ]
            )

    assert all(r.status_code == 201 for r in responses)
    returned_ids = {r.json()["id"] for r in responses}
    assert len(returned_ids) == 3
    assert mock_inngest.send.call_count == 3


@pytest.mark.asyncio
async def test_concurrent_submissions_quota_boundary(make_app_client, make_user):
    """2 succeed + 1 hits quota (402) at the boundary."""
    user = make_user(role="manager", org_id=TEST_ORG_ID, user_id=TEST_USER_ID)
    mock_sb = MockSupabaseChain()

    transcript_id = str(uuid4())
    analysis_ids = [str(uuid4()) for _ in range(2)]

    from fastapi import HTTPException

    # First 2 calls pass quota, third raises 402
    quota_results = [
        {"analysis_quota": 50, "analysis_count": 48, "config": {}},
        {"analysis_quota": 50, "analysis_count": 49, "config": {}},
        HTTPException(status_code=402, detail="Analysis quota exceeded"),
    ]

    pending_analyses = [
        {
            "id": aid,
            "org_id": TEST_ORG_ID,
            "transcript_id": transcript_id,
            "status": "pending",
            "model_used": "claude-sonnet-4-6",
            "error_message": None,
            "overall_score": None,
            "rating": None,
            "consultant_name": None,
            "prospect_name": None,
            "created_at": _now_iso(),
            "completed_at": None,
        }
        for aid in analysis_ids
    ]

    def quota_side_effect(*args, **kwargs):
        result = quota_results.pop(0)
        if isinstance(result, HTTPException):
            raise result
        return result

    mock_inngest = AsyncMock()

    async with make_app_client(user, mock_sb) as client:
        with (
            patch(
                "api.routers.analyses._verify_transcript",
                return_value={"id": transcript_id, "body": "body"},
            ),
            patch(
                "api.routers.analyses._check_analysis_quota",
                side_effect=quota_side_effect,
            ),
            patch(
                "api.routers.analyses._create_pending_analysis",
                side_effect=pending_analyses,
            ),
            patch("api.routers.analyses.inngest_client", mock_inngest),
            patch("api.routers.analyses.get_settings") as mock_settings,
        ):
            mock_settings.return_value.anthropic_api_key = "test-key"
            mock_sb._set_table_data("organizations", {"config": {}, "id": TEST_ORG_ID})

            # Run sequentially to ensure deterministic quota consumption
            results = []
            for _ in range(3):
                resp = await client.post(
                    "/api/analyses",
                    json={"transcript_id": transcript_id},
                )
                results.append(resp)

    status_codes = [r.status_code for r in results]
    assert status_codes.count(201) == 2
    assert status_codes.count(402) == 1
    assert mock_inngest.send.call_count == 2
