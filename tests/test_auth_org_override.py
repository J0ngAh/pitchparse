"""Tests for admin org override via X-Admin-Org-Id header."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from api.auth import get_current_user
from tests.conftest import TEST_ORG_ID, TEST_ORG_ID_2, TEST_USER_ID, MockSupabaseChain


def _make_request(token: str = "valid-token", admin_org_id: str | None = None) -> Request:
    """Build a minimal ASGI Request with the required headers."""
    headers: dict[str, str] = {"authorization": f"Bearer {token}"}
    if admin_org_id is not None:
        headers["x-admin-org-id"] = admin_org_id

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(k.encode(), v.encode()) for k, v in headers.items()],
        "app": MagicMock(),
    }
    return Request(scope)


def _setup_mock_supabase(role: str = "admin") -> MockSupabaseChain:
    """Configure a MockSupabaseChain that returns a user row."""
    mock_sb = MockSupabaseChain(
        data={
            "org_id": TEST_ORG_ID,
            "email": "test@example.com",
            "name": "Test User",
            "role": role,
        }
    )
    mock_user = MagicMock()
    mock_user.id = TEST_USER_ID
    mock_sb.auth.get_user.return_value = MagicMock(user=mock_user)
    return mock_sb


@pytest.mark.asyncio
async def test_admin_without_override_gets_own_org():
    """Admin without X-Admin-Org-Id header gets their own org_id."""
    mock_sb = _setup_mock_supabase(role="admin")
    request = _make_request()

    with patch("api.auth.get_supabase_from_request", return_value=mock_sb):
        result = await get_current_user(request)

    assert result["org_id"] == TEST_ORG_ID
    assert "_real_org_id" not in result
    assert result["role"] == "admin"


@pytest.mark.asyncio
async def test_admin_with_override_gets_overridden_org():
    """Admin with X-Admin-Org-Id gets overridden org_id and _real_org_id preserved."""
    mock_sb = _setup_mock_supabase(role="admin")
    request = _make_request(admin_org_id=TEST_ORG_ID_2)

    with patch("api.auth.get_supabase_from_request", return_value=mock_sb):
        result = await get_current_user(request)

    assert result["org_id"] == TEST_ORG_ID_2
    assert result["_real_org_id"] == TEST_ORG_ID
    assert result["user_id"] == TEST_USER_ID
    assert result["role"] == "admin"


@pytest.mark.asyncio
async def test_manager_with_override_header_ignored():
    """Manager with X-Admin-Org-Id header — header is silently ignored."""
    mock_sb = _setup_mock_supabase(role="manager")
    request = _make_request(admin_org_id=TEST_ORG_ID_2)

    with patch("api.auth.get_supabase_from_request", return_value=mock_sb):
        result = await get_current_user(request)

    assert result["org_id"] == TEST_ORG_ID
    assert "_real_org_id" not in result
    assert result["role"] == "manager"


@pytest.mark.asyncio
async def test_user_with_override_header_ignored():
    """Regular user with X-Admin-Org-Id header — header is silently ignored."""
    mock_sb = _setup_mock_supabase(role="user")
    request = _make_request(admin_org_id=TEST_ORG_ID_2)

    with patch("api.auth.get_supabase_from_request", return_value=mock_sb):
        result = await get_current_user(request)

    assert result["org_id"] == TEST_ORG_ID
    assert "_real_org_id" not in result
    assert result["role"] == "user"


@pytest.mark.asyncio
async def test_admin_with_malformed_uuid_raises_400():
    """Admin with invalid UUID in X-Admin-Org-Id gets 400 error."""
    mock_sb = _setup_mock_supabase(role="admin")
    request = _make_request(admin_org_id="not-a-uuid")

    with patch("api.auth.get_supabase_from_request", return_value=mock_sb):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request)

    assert exc_info.value.status_code == 400
    assert "Invalid X-Admin-Org-Id" in exc_info.value.detail
