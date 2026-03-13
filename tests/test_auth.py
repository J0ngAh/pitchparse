"""Tests for api.auth — JWT auth dependency."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from api.auth import get_current_user


class MockRequest:
    def __init__(self, headers: dict, app=None):
        self._headers = headers
        self.app = app or MagicMock()

    @property
    def headers(self):
        return self._headers


@pytest.mark.asyncio
async def test_missing_auth_header():
    request = MockRequest(headers={})
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request)
    assert exc_info.value.status_code == 401
    assert "Missing" in exc_info.value.detail


@pytest.mark.asyncio
async def test_invalid_auth_header_format():
    request = MockRequest(headers={"Authorization": "Basic abc123"})
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_token_returns_user():
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.id = "user-uuid-123"
    mock_db.auth.get_user.return_value = MagicMock(user=mock_user)
    chain = mock_db.table.return_value.select.return_value
    chain.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"org_id": "org-1", "email": "test@example.com", "name": "Test", "role": "manager"}
    )

    request = MockRequest(headers={"Authorization": "Bearer valid-token"})
    with patch("api.auth.get_supabase_from_request", return_value=mock_db):
        result = await get_current_user(request)
        assert result["user_id"] == "user-uuid-123"
        assert result["org_id"] == "org-1"


@pytest.mark.asyncio
async def test_invalid_token_raises():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=None)

    request = MockRequest(headers={"Authorization": "Bearer bad-token"})
    with patch("api.auth.get_supabase_from_request", return_value=mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_user_not_in_db_raises():
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.id = "user-uuid-123"
    mock_db.auth.get_user.return_value = MagicMock(user=mock_user)
    chain = mock_db.table.return_value.select.return_value
    chain.eq.return_value.single.return_value.execute.return_value = MagicMock(data=None)

    request = MockRequest(headers={"Authorization": "Bearer valid-token"})
    with patch("api.auth.get_supabase_from_request", return_value=mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_auth_exception_returns_401():
    mock_db = MagicMock()
    mock_db.auth.get_user.side_effect = RuntimeError("Connection failed")

    request = MockRequest(headers={"Authorization": "Bearer token"})
    with patch("api.auth.get_supabase_from_request", return_value=mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request)
        assert exc_info.value.status_code == 401
