"""Tests for api.routers.auth — signup and login endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def auth_app_client(mock_supabase):
    """Auth routes don't use CurrentUser — they use request-level Supabase clients."""

    from api.main import app

    # Auth routes use get_supabase_from_request / get_supabase_auth_from_request
    # which read from app.state
    app.state.supabase = mock_supabase
    app.state.supabase_auth = mock_supabase

    return app, mock_supabase


@pytest.mark.asyncio
async def test_signup_success(auth_app_client):
    app, mock_sb = auth_app_client

    mock_user = MagicMock()
    mock_user.id = "new-uid"
    mock_session = MagicMock()
    mock_session.access_token = "token-123"

    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user
    mock_auth_response.session = mock_session

    mock_sb.auth.sign_up.return_value = mock_auth_response
    mock_sb._set_table_data("invitations", [])  # No pending invitation
    mock_sb._set_table_data("organizations", [{"id": "org-1", "name": "Test Org"}])
    mock_sb._set_table_data("users", [])

    with patch("api.database.get_supabase_client", return_value=mock_sb):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/auth/signup",
                json={
                    "email": "new@test.com",
                    "password": "password123",
                    "name": "New User",
                    "org_name": "New Org",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["access_token"] == "token-123"


@pytest.mark.asyncio
async def test_signup_duplicate_email(auth_app_client):
    app, mock_sb = auth_app_client

    mock_sb.auth.sign_up.side_effect = Exception("User already registered")

    with patch("api.database.get_supabase_client", return_value=mock_sb):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/auth/signup",
                json={
                    "email": "dup@test.com",
                    "password": "password123",
                    "name": "Dup User",
                    "org_name": "Dup Org",
                },
            )
            assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(auth_app_client):
    app, mock_sb = auth_app_client

    mock_user = MagicMock()
    mock_user.id = "existing-uid"
    mock_session = MagicMock()
    mock_session.access_token = "token-456"

    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user
    mock_auth_response.session = mock_session

    mock_sb.auth.sign_in_with_password.return_value = mock_auth_response
    mock_sb._set_table_data("users", {"org_id": "org-1", "role": "manager"})

    with patch("api.database.get_supabase_client", return_value=mock_sb):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/auth/login",
                json={"email": "user@test.com", "password": "password123"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["access_token"] == "token-456"


@pytest.mark.asyncio
async def test_login_invalid_credentials(auth_app_client):
    app, mock_sb = auth_app_client

    mock_sb.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")

    with patch("api.database.get_supabase_client", return_value=mock_sb):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/auth/login",
                json={"email": "bad@test.com", "password": "wrongpass1"},
            )
            assert resp.status_code == 401
