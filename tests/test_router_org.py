"""Tests for api.routers.org — org config endpoints."""

import pytest


@pytest.mark.asyncio
async def test_get_org_config(app_client, mock_supabase, sample_org):
    mock_supabase._set_data(sample_org)
    resp = await app_client.get("/api/org/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Org"
    assert data["plan"] == "starter"


@pytest.mark.asyncio
async def test_get_org_config_not_found(app_client, mock_supabase):
    mock_supabase._set_data(None)
    resp = await app_client.get("/api/org/config")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_org_config(app_client, mock_supabase, sample_org):
    mock_supabase._set_data([sample_org])
    resp = await app_client.put(
        "/api/org/config",
        json={"config": {"branding": {"company_name": "NewCo"}}},
    )
    assert resp.status_code == 200
