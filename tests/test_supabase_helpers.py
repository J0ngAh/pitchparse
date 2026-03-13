"""Tests for api.utils.supabase_helpers type-safe response helpers."""

import pytest

from api.utils.supabase_helpers import row_as_dict, rows_as_dicts


class MockResponse:
    def __init__(self, data):
        self.data = data


class TestRowsAsDicts:
    def test_returns_list_of_dicts(self):
        resp = MockResponse([{"id": "1"}, {"id": "2"}])
        result = rows_as_dicts(resp)
        assert len(result) == 2
        assert result[0]["id"] == "1"

    def test_empty_list(self):
        resp = MockResponse([])
        assert rows_as_dicts(resp) == []

    def test_non_list_raises(self):
        resp = MockResponse({"id": "1"})
        with pytest.raises(ValueError, match="Expected list"):
            rows_as_dicts(resp)


class TestRowAsDict:
    def test_returns_dict(self):
        resp = MockResponse({"id": "1", "name": "Test"})
        result = row_as_dict(resp)
        assert result["name"] == "Test"

    def test_non_dict_raises(self):
        resp = MockResponse([{"id": "1"}])
        with pytest.raises(ValueError, match="Expected dict"):
            row_as_dict(resp)
