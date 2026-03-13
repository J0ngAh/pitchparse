"""Tests for prompts router — CRUD routes and role gating."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.auth import get_current_user
from api.main import app


def _mock_user(role: str = "manager", org_id: str = "00000000-0000-0000-0000-000000000001") -> dict:
    return {
        "user_id": "00000000-0000-0000-0000-000000000002",
        "org_id": org_id,
        "email": "test@example.com",
        "name": "Test User",
        "role": role,
    }


@pytest.fixture()
def manager_client():
    """TestClient with manager auth override."""
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role="manager")
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture()
def user_client():
    """TestClient with regular user auth override."""
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role="user")
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture()
def admin_client():
    """TestClient with admin auth override."""
    app.dependency_overrides[get_current_user] = lambda: _mock_user(role="admin")
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user, None)


class TestGetActivePrompt:
    @patch("api.routers.prompts.get_prompt_by_id")
    @patch("api.routers.prompts.get_active_prompt")
    def test_returns_org_prompt(
        self, mock_get: MagicMock, mock_by_id: MagicMock, manager_client: TestClient
    ):
        mock_get.return_value = ("prompt body", "00000000-0000-0000-0000-000000000003")
        mock_by_id.return_value = {
            "id": "00000000-0000-0000-0000-000000000003",
            "org_id": "00000000-0000-0000-0000-000000000001",
            "slug": "analyze",
            "version": 2,
            "body": "prompt body",
            "created_by": "00000000-0000-0000-0000-000000000002",
            "created_at": "2026-01-01T00:00:00Z",
        }

        response = manager_client.get("/api/prompts/analyze")

        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "analyze"
        assert data["version"] == 2
        assert data["is_default"] is False

    def test_invalid_slug_returns_400(self, manager_client: TestClient):
        response = manager_client.get("/api/prompts/invalid")
        assert response.status_code == 400


class TestCreateVersion:
    @patch("api.routers.prompts.create_prompt_version")
    def test_manager_can_create(self, mock_create: MagicMock, manager_client: TestClient):
        mock_create.return_value = {
            "id": "00000000-0000-0000-0000-000000000004",
            "org_id": "00000000-0000-0000-0000-000000000001",
            "slug": "analyze",
            "version": 1,
            "body": "new prompt",
            "created_by": "00000000-0000-0000-0000-000000000002",
            "created_at": "2026-01-01T00:00:00Z",
        }

        response = manager_client.post(
            "/api/prompts/analyze",
            json={"body": "new prompt"},
        )

        assert response.status_code == 200
        assert response.json()["version"] == 1

    def test_user_role_cannot_create(self, user_client: TestClient):
        response = user_client.post(
            "/api/prompts/analyze",
            json={"body": "new prompt"},
        )
        assert response.status_code == 403

    def test_empty_body_rejected(self, manager_client: TestClient):
        response = manager_client.post(
            "/api/prompts/analyze",
            json={"body": ""},
        )
        assert response.status_code == 422


class TestRevertVersion:
    @patch("api.routers.prompts.create_prompt_version")
    @patch("api.database.get_supabase_client")
    def test_revert_creates_new_version(
        self,
        mock_db_factory: MagicMock,
        mock_create: MagicMock,
        admin_client: TestClient,
    ):
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db
        source_response = MagicMock()
        source_response.data = [{"body": "old body"}]
        (
            mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value
        ) = source_response

        mock_create.return_value = {
            "id": "00000000-0000-0000-0000-000000000005",
            "org_id": "00000000-0000-0000-0000-000000000001",
            "slug": "analyze",
            "version": 3,
            "body": "old body",
            "created_by": "00000000-0000-0000-0000-000000000002",
            "created_at": "2026-01-01T00:00:00Z",
        }

        response = admin_client.post(
            "/api/prompts/analyze/revert",
            json={"version": 1},
        )

        assert response.status_code == 200
        assert response.json()["version"] == 3

    @patch("api.database.get_supabase_client")
    def test_revert_nonexistent_version_404(
        self, mock_db_factory: MagicMock, manager_client: TestClient
    ):
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db
        empty_response = MagicMock()
        empty_response.data = []
        (
            mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value
        ) = empty_response

        response = manager_client.post(
            "/api/prompts/analyze/revert",
            json={"version": 999},
        )

        assert response.status_code == 404
