"""Tests for api.routers.transcripts — transcript CRUD endpoints."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_list_transcripts_empty(app_client, mock_supabase):
    mock_supabase._set_data([])
    resp = await app_client.get("/api/transcripts")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_transcripts_with_data(app_client, mock_supabase, sample_transcript):
    mock_supabase._set_data([sample_transcript])
    resp = await app_client.get("/api/transcripts")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test-call.md"


@pytest.mark.asyncio
async def test_get_transcript_success(app_client, mock_supabase, sample_transcript):
    mock_supabase._set_data(sample_transcript)
    resp = await app_client.get(f"/api/transcripts/{sample_transcript['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["filename"] == "test-call.md"
    assert "body" in data


@pytest.mark.asyncio
async def test_get_transcript_not_found(app_client, mock_supabase):
    mock_supabase._set_data(None)
    resp = await app_client.get("/api/transcripts/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_transcript(app_client, mock_supabase, sample_transcript):
    mock_supabase._set_data([sample_transcript])
    resp = await app_client.post(
        "/api/transcripts",
        json={
            "filename": "test.md",
            "body": "## Transcript\n\nHello",
        },
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_upload_transcript_with_consultant(app_client, mock_supabase, sample_transcript):
    """Test upload with consultant_name triggers _ensure_consultant."""
    # Mock returns data for all chainable calls (consultant lookup + transcript insert)
    mock_supabase._set_data([sample_transcript])

    with patch("api.routers.transcripts._ensure_consultant", return_value="cons-1"):
        resp = await app_client.post(
            "/api/transcripts",
            json={
                "filename": "test.md",
                "body": "## Transcript\n\nHello",
                "consultant_name": "Alice",
            },
        )
        assert resp.status_code == 201


@pytest.mark.asyncio
async def test_generate_synthetic(app_client, mock_supabase, sample_transcript):
    """Test POST /generate-synthetic dispatches Inngest event."""
    mock_supabase._set_data([sample_transcript])

    with patch("api.routers.transcripts.inngest_client") as mock_inngest:
        mock_inngest.send = AsyncMock()
        with patch(
            "api.routers.transcripts._create_synthetic_and_dispatch",
            return_value=sample_transcript,
        ):
            resp = await app_client.post(
                "/api/transcripts/generate-synthetic",
                json={"quality": "good"},
            )
            assert resp.status_code == 201
