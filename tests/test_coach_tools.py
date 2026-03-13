"""Tests for coach agent tool functions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from unittest.mock import MagicMock

import pytest

from api.services.coach_tools import (
    compare_consultants,
    get_team_stats,
    get_transcript_excerpt,
    list_analyses,
    search_coaching_patterns,
)


@dataclass
class MockDeps:
    org_id: str = "org-1"
    user_id: str = "user-1"
    user_role: str = "user"
    db: Any = None
    analysis_id: str | None = None
    analysis_context: str | None = None


class MockContext:
    """Mimics pydantic_ai.RunContext for testing."""

    def __init__(self, deps: MockDeps):
        self.deps = deps


def make_ctx(role: str = "user", db: Any = None) -> Any:
    deps = MockDeps(user_role=role, db=db or MagicMock())
    return MockContext(deps)


def mock_db_response(data: list[dict] | dict | None = None) -> MagicMock:
    """Create a mock Supabase response."""
    response = MagicMock()
    response.data = data if data is not None else []
    return response


def make_chain_mock(response: Any) -> MagicMock:
    """Create a mock that supports method chaining (table.select.eq.execute)."""
    mock = MagicMock()
    # Every chained method returns the same mock
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.ilike.return_value = mock
    mock.gte.return_value = mock
    mock.lte.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.single.return_value = mock
    mock.execute.return_value = response
    return mock


@pytest.mark.asyncio
async def test_list_analyses_returns_table():
    data = [
        {
            "id": "aaaa-bbbb-cccc-dddd",
            "consultant_name": "Alice",
            "prospect_name": "Acme",
            "overall_score": 82,
            "rating": "Good",
            "created_at": "2026-03-10T12:00:00",
            "status": "complete",
        }
    ]
    db = make_chain_mock(mock_db_response(data))
    ctx = make_ctx(role="manager", db=db)

    result = await list_analyses(ctx)

    assert "Alice" in result
    assert "Acme" in result
    assert "82" in result
    assert "aaaa-bbb" in result


@pytest.mark.asyncio
async def test_list_analyses_empty():
    db = make_chain_mock(mock_db_response([]))
    ctx = make_ctx(db=db)

    result = await list_analyses(ctx)

    assert "No analyses found" in result


@pytest.mark.asyncio
async def test_list_analyses_respects_rbac():
    """User role should trigger created_by filter."""
    db = make_chain_mock(mock_db_response([]))
    ctx = make_ctx(role="user", db=db)

    await list_analyses(ctx)

    # Verify that eq was called with created_by filter
    calls = [str(c) for c in db.eq.call_args_list]
    assert any("created_by" in c for c in calls)


@pytest.mark.asyncio
async def test_list_analyses_manager_no_user_filter():
    """Manager role should NOT add created_by filter."""
    db = make_chain_mock(mock_db_response([]))
    ctx = make_ctx(role="manager", db=db)

    await list_analyses(ctx)

    calls = [str(c) for c in db.eq.call_args_list]
    assert not any("created_by" in c for c in calls)


@pytest.mark.asyncio
async def test_get_transcript_excerpt_search():
    body = "Line one\nLine two\nLine three has keyword here\nLine four\nLine five"
    db = make_chain_mock(
        mock_db_response({"body": body, "filename": "test.txt", "consultant_name": "Alice"})
    )
    ctx = make_ctx(db=db)

    result = await get_transcript_excerpt(ctx, "tx-1", search_term="keyword")

    assert "keyword" in result
    assert "line 3" in result.lower() or "Found" in result


@pytest.mark.asyncio
async def test_get_transcript_excerpt_not_found():
    response = MagicMock()
    response.data = None
    db = make_chain_mock(response)
    # Make execute raise to simulate .single() failure
    db.execute.side_effect = Exception("not found")
    ctx = make_ctx(db=db)

    result = await get_transcript_excerpt(ctx, "bad-id")

    assert "not found" in result.lower()


@pytest.mark.asyncio
async def test_compare_consultants_user_denied():
    ctx = make_ctx(role="user")

    result = await compare_consultants(ctx, ["Alice", "Bob"])

    assert "only available to managers" in result.lower()


@pytest.mark.asyncio
async def test_compare_consultants_too_few():
    ctx = make_ctx(role="manager")

    result = await compare_consultants(ctx, ["Alice"])

    assert "between 2 and 5" in result


@pytest.mark.asyncio
async def test_compare_consultants_with_data():
    data = [{"overall_score": 80}, {"overall_score": 90}]
    db = make_chain_mock(mock_db_response(data))
    ctx = make_ctx(role="manager", db=db)

    result = await compare_consultants(ctx, ["Alice", "Bob"])

    assert "Alice" in result
    assert "Bob" in result


@pytest.mark.asyncio
async def test_get_team_stats_user_scoped():
    data = [
        {"overall_score": 75, "rating": "Good", "consultant_name": "Alice", "scorecard": []},
    ]
    db = make_chain_mock(mock_db_response(data))
    ctx = make_ctx(role="user", db=db)

    result = await get_team_stats(ctx)

    assert "Your Stats" in result
    assert "75" in result


@pytest.mark.asyncio
async def test_get_team_stats_manager():
    data = [
        {"overall_score": 80, "rating": "Good", "consultant_name": "Alice", "scorecard": []},
        {
            "overall_score": 60,
            "rating": "Needs Improvement",
            "consultant_name": "Bob",
            "scorecard": [],
        },
    ]
    db = make_chain_mock(mock_db_response(data))
    ctx = make_ctx(role="manager", db=db)

    result = await get_team_stats(ctx)

    assert "Team Stats" in result
    assert "2" in result  # total calls


@pytest.mark.asyncio
async def test_search_coaching_patterns_empty():
    db = make_chain_mock(mock_db_response([]))
    ctx = make_ctx(db=db)

    result = await search_coaching_patterns(ctx)

    assert "No analyses found" in result


@pytest.mark.asyncio
async def test_search_coaching_patterns_finds_themes():
    data = [
        {
            "consultant_name": "Alice",
            "coaching": [
                {"priority": 1, "title": "Weak Discovery", "issue": "Didn't ask enough questions"},
                {"priority": 2, "title": "Poor Closing", "issue": "No trial close"},
            ],
            "overall_score": 70,
        },
        {
            "consultant_name": "Alice",
            "coaching": [
                {"priority": 1, "title": "Weak Discovery", "issue": "Missed pain points"},
            ],
            "overall_score": 65,
        },
    ]
    db = make_chain_mock(mock_db_response(data))
    ctx = make_ctx(db=db)

    result = await search_coaching_patterns(ctx)

    assert "Weak Discovery" in result
    assert "2x" in result
