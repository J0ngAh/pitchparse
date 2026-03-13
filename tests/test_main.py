"""Tests for api.main — health check and middleware."""

import pytest


@pytest.mark.asyncio
async def test_health_check(app_client):
    resp = await app_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "pitchparse-api"


@pytest.mark.asyncio
async def test_security_headers(app_client):
    resp = await app_client.get("/api/health")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert "max-age=" in resp.headers["Strict-Transport-Security"]
