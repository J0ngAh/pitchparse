"""Tests for api.routers.analyses — analysis CRUD + run endpoints."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_list_analyses(app_client, mock_supabase, sample_analysis):
    mock_supabase._set_data([sample_analysis])
    resp = await app_client.get("/api/analyses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1


@pytest.mark.asyncio
async def test_list_analyses_empty(app_client, mock_supabase):
    mock_supabase._set_data([])
    resp = await app_client.get("/api/analyses")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_analysis_success(app_client, mock_supabase, sample_analysis):
    # AnalysisDetail.scorecard expects dict|None, not list — use None for this test
    detail_data = {**sample_analysis, "scorecard": None}
    mock_supabase._set_data(detail_data)
    resp = await app_client.get(f"/api/analyses/{sample_analysis['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 82


@pytest.mark.asyncio
async def test_get_analysis_not_found(app_client, mock_supabase):
    mock_supabase._set_data(None)
    resp = await app_client.get("/api/analyses/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_run_analysis_success(app_client, mock_supabase, sample_analysis):
    """Test POST /api/analyses creates pending analysis and dispatches Inngest event."""
    # Mock chain: verify transcript, check quota, create analysis, get org config
    transcript_data = {"id": "t-1", "body": "transcript text"}
    org_data = {"analysis_quota": 50, "analysis_count": 5, "config": None}

    # The mock returns the same data for all calls — we test the happy path
    mock_supabase._set_data(sample_analysis)

    with patch("api.routers.analyses.inngest_client") as mock_inngest:
        mock_inngest.send = AsyncMock()

        # We need to patch the individual helper functions to control data
        with (
            patch("api.routers.analyses._verify_transcript", return_value=transcript_data),
            patch("api.routers.analyses._check_analysis_quota", return_value=org_data),
            patch("api.routers.analyses._create_pending_analysis", return_value=sample_analysis),
        ):
            resp = await app_client.post(
                "/api/analyses",
                json={"transcript_id": "t-1"},
            )
            assert resp.status_code == 201
            mock_inngest.send.assert_called_once()


@pytest.mark.asyncio
async def test_run_analysis_no_api_key(app_client, mock_supabase):
    """Test POST /api/analyses returns 400 when no API key configured."""
    with patch("api.routers.analyses.get_settings") as mock_settings:
        mock_settings.return_value.anthropic_api_key = ""
        resp = await app_client.post(
            "/api/analyses",
            json={"transcript_id": "t-1"},
        )
        assert resp.status_code == 400


@pytest.mark.asyncio
async def test_run_analysis_quota_exceeded(app_client, mock_supabase):
    """Test POST /api/analyses returns 402 when quota exceeded."""
    from fastapi import HTTPException

    with patch("api.routers.analyses._verify_transcript", return_value={"id": "t-1"}):
        with patch(
            "api.routers.analyses._check_analysis_quota",
            side_effect=HTTPException(status_code=402, detail="Analysis quota exceeded"),
        ):
            resp = await app_client.post(
                "/api/analyses",
                json={"transcript_id": "t-1"},
            )
            assert resp.status_code == 402
