"""Type-safe helpers for Supabase API response data extraction.

supabase-py v2+ types response.data as a broad union
(bool | str | int | float | Sequence | Mapping | None), causing
mypy errors on dict/list access. These helpers narrow the type safely.
"""

from typing import Any


def rows_as_dicts(response: Any) -> list[dict[str, Any]]:
    """Extract response.data as list of dicts for list queries."""
    data = response.data
    if not isinstance(data, list):
        raise ValueError(f"Expected list response, got {type(data)}")
    return data  # type: ignore[return-value]


def row_as_dict(response: Any) -> dict[str, Any]:
    """Extract response.data as a single dict for .single() queries."""
    data = response.data
    if not isinstance(data, dict):
        raise ValueError(f"Expected dict response, got {type(data)}")
    return data
