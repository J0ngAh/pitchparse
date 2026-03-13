"""Tests for prompt_service — resolution logic, version creation, caching."""

from unittest.mock import MagicMock, patch

import pytest

from api.services import prompt_service


# fmt: off
def _eq_chain(mock_db: MagicMock) -> MagicMock:
    """Return the .select().eq(slug).order().limit().eq(org_id) mock chain endpoint."""
    return (mock_db.table.return_value.select.return_value
            .eq.return_value.order.return_value
            .limit.return_value.eq.return_value)


def _is_chain(mock_db: MagicMock) -> MagicMock:
    """Return the .select().eq(slug).order().limit().is_() mock chain endpoint."""
    return (mock_db.table.return_value.select.return_value
            .eq.return_value.order.return_value
            .limit.return_value.is_.return_value)


def _create_version_chain(mock_db: MagicMock) -> MagicMock:
    """Return the .eq().eq().order().limit() chain for create_prompt_version lookups."""
    return (mock_db.table.return_value.select.return_value
            .eq.return_value.eq.return_value
            .order.return_value.limit.return_value)


def _list_version_chain(mock_db: MagicMock) -> MagicMock:
    """Return the .eq().eq().order() chain for list_prompt_versions."""
    return (mock_db.table.return_value.select.return_value
            .eq.return_value.eq.return_value
            .order.return_value)
# fmt: on


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear the prompt cache before each test."""
    prompt_service._prompt_cache.clear()
    yield
    prompt_service._prompt_cache.clear()


class TestGetActivePrompt:
    """Tests for get_active_prompt resolution order."""

    @patch("api.services.prompt_service.get_supabase_client")
    def test_returns_org_specific_prompt_first(self, mock_db_factory: MagicMock):
        """Org-specific latest version takes priority."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        org_response = MagicMock()
        org_response.data = [{"id": "tmpl-1", "body": "org prompt body"}]
        _eq_chain(mock_db).execute.return_value = org_response

        body, template_id = prompt_service.get_active_prompt("org-123", "analyze")

        assert body == "org prompt body"
        assert template_id == "tmpl-1"

    @patch("api.services.prompt_service.get_supabase_client")
    def test_falls_back_to_global_default(self, mock_db_factory: MagicMock):
        """When no org-specific prompt, falls back to global default."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        empty_response = MagicMock()
        empty_response.data = []

        global_response = MagicMock()
        global_response.data = [{"id": "global-1", "body": "global prompt body"}]

        call_count = 0

        def mock_execute():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return empty_response
            return global_response

        mock_chain = MagicMock()
        mock_chain.execute = mock_execute
        _eq_chain(mock_db).return_value = mock_chain
        # Override the full chain endpoints to use mock_chain
        eq_end = _eq_chain(mock_db)
        eq_end.execute = mock_execute
        is_end = _is_chain(mock_db)
        is_end.execute = mock_execute

        # Reset call_count and use a simpler approach
        call_count = 0
        _eq_chain(mock_db).execute = lambda: empty_response
        _is_chain(mock_db).execute = lambda: global_response

        body, template_id = prompt_service.get_active_prompt("org-123", "analyze")

        assert body == "global prompt body"
        assert template_id == "global-1"

    @patch("api.services.prompt_service.get_supabase_client")
    def test_falls_back_to_file(self, mock_db_factory: MagicMock):
        """When no DB records exist, falls back to file."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        empty_response = MagicMock()
        empty_response.data = []
        _is_chain(mock_db).execute.return_value = empty_response

        body, template_id = prompt_service.get_active_prompt(None, "analyze")

        assert template_id is None
        assert isinstance(body, str)

    @patch("api.services.prompt_service.get_supabase_client")
    def test_caches_result(self, mock_db_factory: MagicMock):
        """Second call for same key uses cache."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        response = MagicMock()
        response.data = [{"id": "tmpl-1", "body": "cached body"}]
        _eq_chain(mock_db).execute.return_value = response

        body1, _ = prompt_service.get_active_prompt("org-1", "analyze")
        body2, _ = prompt_service.get_active_prompt("org-1", "analyze")

        assert body1 == body2 == "cached body"
        assert mock_db.table.call_count == 1


class TestCreatePromptVersion:
    """Tests for create_prompt_version auto-increment."""

    @patch("api.services.prompt_service.get_supabase_client")
    def test_creates_first_version(self, mock_db_factory: MagicMock):
        """First version for org+slug gets version=1."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        empty_response = MagicMock()
        empty_response.data = []
        _create_version_chain(mock_db).execute.return_value = empty_response

        insert_response = MagicMock()
        insert_response.data = [
            {
                "id": "new-id",
                "org_id": "org-1",
                "slug": "analyze",
                "version": 1,
                "body": "test",
                "created_by": "user-1",
                "created_at": "2026-01-01T00:00:00Z",
            }
        ]
        mock_db.table.return_value.insert.return_value.execute.return_value = insert_response

        result = prompt_service.create_prompt_version("org-1", "analyze", "test", "user-1")

        assert result["version"] == 1
        assert result["slug"] == "analyze"

    @patch("api.services.prompt_service.get_supabase_client")
    def test_increments_version(self, mock_db_factory: MagicMock):
        """Next version auto-increments from max existing."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        existing_response = MagicMock()
        existing_response.data = [{"version": 3}]
        _create_version_chain(mock_db).execute.return_value = existing_response

        insert_response = MagicMock()
        insert_response.data = [
            {
                "id": "new-id",
                "org_id": "org-1",
                "slug": "analyze",
                "version": 4,
                "body": "updated",
                "created_by": "user-1",
                "created_at": "2026-01-01T00:00:00Z",
            }
        ]
        mock_db.table.return_value.insert.return_value.execute.return_value = insert_response

        result = prompt_service.create_prompt_version("org-1", "analyze", "updated", "user-1")

        assert result["version"] == 4

    @patch("api.services.prompt_service.get_supabase_client")
    def test_invalidates_cache_on_create(self, mock_db_factory: MagicMock):
        """Creating a version clears the cache for that org+slug."""
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        prompt_service._prompt_cache[("org-1", "analyze")] = (
            "old body",
            "old-id",
            0,
        )

        empty_response = MagicMock()
        empty_response.data = []
        _create_version_chain(mock_db).execute.return_value = empty_response

        insert_response = MagicMock()
        insert_response.data = [{"id": "new", "version": 1, "slug": "analyze"}]
        mock_db.table.return_value.insert.return_value.execute.return_value = insert_response

        prompt_service.create_prompt_version("org-1", "analyze", "new body", "user-1")

        assert ("org-1", "analyze") not in prompt_service._prompt_cache


class TestListPromptVersions:
    """Tests for list_prompt_versions."""

    @patch("api.services.prompt_service.get_supabase_client")
    def test_returns_versions_newest_first(self, mock_db_factory: MagicMock):
        mock_db = MagicMock()
        mock_db_factory.return_value = mock_db

        response = MagicMock()
        response.data = [
            {
                "id": "v3",
                "org_id": "org-1",
                "slug": "analyze",
                "version": 3,
                "created_by": None,
                "created_at": "2026-03-01",
            },
            {
                "id": "v2",
                "org_id": "org-1",
                "slug": "analyze",
                "version": 2,
                "created_by": None,
                "created_at": "2026-02-01",
            },
            {
                "id": "v1",
                "org_id": "org-1",
                "slug": "analyze",
                "version": 1,
                "created_by": None,
                "created_at": "2026-01-01",
            },
        ]
        _list_version_chain(mock_db).execute.return_value = response

        result = prompt_service.list_prompt_versions("org-1", "analyze")

        assert len(result) == 3
        assert result[0]["version"] == 3
