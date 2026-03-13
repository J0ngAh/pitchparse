"""Tests for api.routers.reports — report CRUD + generate endpoints."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_list_reports(app_client, mock_supabase, sample_report):
    mock_supabase._set_data([sample_report])
    resp = await app_client.get("/api/reports")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_report_success(app_client, mock_supabase, sample_report):
    mock_supabase._set_data(sample_report)
    resp = await app_client.get(f"/api/reports/{sample_report['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert "body" in data


@pytest.mark.asyncio
async def test_get_report_not_found(app_client, mock_supabase):
    mock_supabase._set_data(None)
    resp = await app_client.get("/api/reports/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_generate_report_success(app_client, mock_supabase, sample_report, sample_analysis):
    mock_supabase._set_data([sample_report])

    with patch("api.routers.reports.inngest_client") as mock_inngest:
        mock_inngest.send = AsyncMock()
        with (
            patch("api.routers.reports._verify_analysis", return_value=sample_analysis),
            patch("api.routers.reports._create_pending_report", return_value=sample_report),
        ):
            resp = await app_client.post(
                "/api/reports",
                json={"analysis_id": sample_analysis["id"]},
            )
            assert resp.status_code == 201
            mock_inngest.send.assert_called_once()
