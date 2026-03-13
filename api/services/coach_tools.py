"""PydanticAI agent tools for the coaching assistant.

These tools allow the coach agent to query Supabase dynamically
to answer user questions about analyses, transcripts, and team performance.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

from api.utils.supabase_helpers import rows_as_dicts

if TYPE_CHECKING:
    from pydantic_ai import RunContext

    from api.services.coach_service import CoachDeps
    from supabase import Client  # type: ignore[attr-defined]

logger = structlog.get_logger()


def _apply_user_filter(query: Any, ctx: RunContext[CoachDeps]) -> Any:
    """Restrict query to user's own data when role is 'user'."""
    if ctx.deps.user_role == "user":
        query = query.eq("created_by", ctx.deps.user_id)
    return query


def _format_date(dt_str: str | None) -> str:
    """Format ISO datetime to readable date."""
    if not dt_str:
        return "N/A"
    return dt_str[:10]


def _safe_rows(result: Any) -> list[dict[str, Any]]:
    """Extract rows from supabase response, returning empty list on failure."""
    try:
        return rows_as_dicts(result)
    except (ValueError, AttributeError):
        return []


def _format_analyses_table(rows: list[dict[str, Any]]) -> str:
    lines = ["| # | Consultant | Prospect | Score | Rating | Date | ID |"]
    lines.append("|---|-----------|----------|-------|--------|------|----|")
    for i, row in enumerate(rows, 1):
        lines.append(
            f"| {i} | {row.get('consultant_name', 'N/A')} "
            f"| {row.get('prospect_name', 'N/A')} "
            f"| {row.get('overall_score', 'N/A')} "
            f"| {row.get('rating', 'N/A')} "
            f"| {_format_date(row.get('created_at'))} "
            f"| {row['id'][:8]}... |"
        )
    return "\n".join(lines)


async def list_analyses(
    ctx: RunContext[CoachDeps],
    consultant_name: str | None = None,
    min_score: int | None = None,
    max_score: int | None = None,
    rating: str | None = None,
    limit: int = 10,
) -> str:
    """List analyses with optional filters. Use get_analysis_detail for full data."""
    db: Client = ctx.deps.db
    limit = min(limit, 25)

    query = (
        db.table("analyses")
        .select("id, consultant_name, prospect_name, overall_score, rating, created_at, status")
        .eq("org_id", ctx.deps.org_id)
        .eq("status", "complete")
        .order("created_at", desc=True)
        .limit(limit)
    )
    query = _apply_user_filter(query, ctx)

    if consultant_name:
        query = query.ilike("consultant_name", f"%{consultant_name}%")
    if min_score is not None:
        query = query.gte("overall_score", min_score)
    if max_score is not None:
        query = query.lte("overall_score", max_score)
    if rating:
        query = query.eq("rating", rating)

    rows = _safe_rows(query.execute())
    if not rows:
        return "No analyses found matching your criteria."
    return _format_analyses_table(rows)


async def get_analysis_detail(
    ctx: RunContext[CoachDeps],
    analysis_id: str,
) -> str:
    """Get full scorecard, phases, coaching, and sentiment for one analysis.

    Use this after finding an analysis via list_analyses to drill into details.

    Args:
        ctx: Run context with org and user info.
        analysis_id: UUID of the analysis to retrieve.
    """
    db: Client = ctx.deps.db

    query = (
        db.table("analyses")
        .select("*")
        .eq("id", analysis_id)
        .eq("org_id", ctx.deps.org_id)
        .single()
    )
    query = _apply_user_filter(query, ctx)

    try:
        result = query.execute()
    except Exception:
        return f"Analysis {analysis_id} not found or you don't have access to it."

    if not result.data or not isinstance(result.data, dict):
        return f"Analysis {analysis_id} not found or you don't have access to it."

    from api.services.coach_service import _build_analysis_context

    return _build_analysis_context(result.data)


def _search_excerpt(lines: list[str], search_term: str, max_lines: int) -> str:
    total = len(lines)
    term_lower = search_term.lower()
    matches = [i for i, line in enumerate(lines) if term_lower in line.lower()]
    if not matches:
        return f"No matches found for '{search_term}' in this transcript."

    match_line = matches[0]
    context_start = max(0, match_line - 5)
    context_end = min(total, match_line + max_lines - 5)
    excerpt_lines = lines[context_start:context_end]
    header = (
        f"Found '{search_term}' at line {match_line + 1} "
        f"({len(matches)} total matches). "
        f"Showing lines {context_start + 1}-{context_end}:"
    )
    numbered = [f"{context_start + i + 1:4d} | {line}" for i, line in enumerate(excerpt_lines)]
    return f"{header}\n\n```\n" + "\n".join(numbered) + "\n```"


def _range_excerpt(lines: list[str], start_line: int, max_lines: int) -> str:
    total = len(lines)
    end = min(start_line + max_lines, total)
    excerpt_lines = lines[start_line:end]
    header = f"Showing lines {start_line + 1}-{end} of {total}:"
    numbered = [f"{start_line + i + 1:4d} | {line}" for i, line in enumerate(excerpt_lines)]
    return f"{header}\n\n```\n" + "\n".join(numbered) + "\n```"


async def get_transcript_excerpt(
    ctx: RunContext[CoachDeps],
    transcript_id: str,
    search_term: str | None = None,
    start_line: int = 0,
    max_lines: int = 50,
) -> str:
    """Get a portion of a transcript's text content.

    Use this to find specific moments in a call or read transcript sections.

    Args:
        ctx: Run context with org and user info.
        transcript_id: UUID of the transcript.
        search_term: Optional term to search for — returns surrounding context.
        start_line: Line number to start from (0-indexed). Ignored if search_term set.
        max_lines: Number of lines to return (max 100).
    """
    db: Client = ctx.deps.db
    max_lines = min(max_lines, 100)

    query = (
        db.table("transcripts")
        .select("body, filename, consultant_name")
        .eq("id", transcript_id)
        .eq("org_id", ctx.deps.org_id)
        .single()
    )

    try:
        result = query.execute()
    except Exception:
        return f"Transcript {transcript_id} not found or you don't have access."

    if not result.data or not isinstance(result.data, dict):
        return f"Transcript {transcript_id} not found or you don't have access."

    body: str = result.data.get("body", "")
    if not body:
        return "Transcript has no content."

    lines = body.split("\n")

    if search_term:
        return _search_excerpt(lines, search_term, max_lines)

    return _range_excerpt(lines, start_line, max_lines)


async def compare_consultants(
    ctx: RunContext[CoachDeps],
    consultant_names: list[str],
    days: int = 30,
) -> str:
    """Compare average scores across consultants over a time period.

    Only available to managers and admins. Compares 2-5 consultants.

    Args:
        ctx: Run context with org and user info.
        consultant_names: List of 2-5 consultant names to compare.
        days: Number of days to look back (default 30).
    """
    if ctx.deps.user_role == "user":
        return "This feature is only available to managers and admins."

    if len(consultant_names) < 2 or len(consultant_names) > 5:
        return "Please provide between 2 and 5 consultant names to compare."

    db: Client = ctx.deps.db
    from datetime import UTC, datetime, timedelta

    cutoff = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    lines = ["| Consultant | Calls | Avg Score | Best | Worst |"]
    lines.append("|-----------|-------|-----------|------|-------|")

    for name in consultant_names:
        result = (
            db.table("analyses")
            .select("overall_score")
            .eq("org_id", ctx.deps.org_id)
            .eq("status", "complete")
            .ilike("consultant_name", f"%{name}%")
            .gte("created_at", cutoff)
            .execute()
        )
        rows = _safe_rows(result)
        scores: list[int] = [r["overall_score"] for r in rows if r.get("overall_score") is not None]

        if scores:
            avg = sum(scores) / len(scores)
            lines.append(f"| {name} | {len(scores)} | {avg:.0f} | {max(scores)} | {min(scores)} |")
        else:
            lines.append(f"| {name} | 0 | N/A | N/A | N/A |")

    return f"Comparison over the last {days} days:\n\n" + "\n".join(lines)


def _aggregate_kpi_scores(rows: list[dict[str, Any]]) -> dict[str, float]:
    kpi_scores: dict[str, list[float]] = {}
    for r in rows:
        sc = r.get("scorecard")
        if isinstance(sc, list):
            for kpi in sc:
                kpi_name = kpi.get("kpi", "")
                kpi_score = kpi.get("score")
                if kpi_name and kpi_score is not None:
                    kpi_scores.setdefault(kpi_name, []).append(float(kpi_score))
    return {k: sum(v) / len(v) for k, v in kpi_scores.items() if v}


def _count_ratings(rows: list[dict[str, Any]]) -> dict[str, int]:
    ratings: dict[str, int] = {}
    for r in rows:
        rt = r.get("rating", "Unknown")
        ratings[rt] = ratings.get(rt, 0) + 1
    return ratings


def _format_team_stats(rows: list[dict[str, Any]], scores: list[int], scope: str, days: int) -> str:
    avg = sum(scores) / len(scores) if scores else 0
    below_60 = len([s for s in scores if s < 60])
    ratings = _count_ratings(rows)
    kpi_avgs = _aggregate_kpi_scores(rows)
    top_kpi = max(kpi_avgs, key=kpi_avgs.get, default=None) if kpi_avgs else None  # type: ignore[arg-type]
    bottom_kpi = min(kpi_avgs, key=kpi_avgs.get, default=None) if kpi_avgs else None  # type: ignore[arg-type]

    lines = [
        f"**{scope.title()} Stats** (last {days} days):\n",
        f"- **Total calls analyzed:** {len(rows)}",
        f"- **Average score:** {avg:.0f}/100",
        f"- **Calls below 60:** {below_60}",
    ]
    if ratings:
        rating_str = ", ".join(f"{k}: {v}" for k, v in sorted(ratings.items()))
        lines.append(f"- **Ratings:** {rating_str}")
    if top_kpi:
        lines.append(f"- **Strongest KPI:** {top_kpi} (avg {kpi_avgs[top_kpi]:.1f}/5)")
    if bottom_kpi:
        lines.append(f"- **Weakest KPI:** {bottom_kpi} (avg {kpi_avgs[bottom_kpi]:.1f}/5)")
    return "\n".join(lines)


async def get_team_stats(
    ctx: RunContext[CoachDeps],
    days: int = 30,
) -> str:
    """Get aggregate team performance metrics. Users see own stats only."""
    db: Client = ctx.deps.db
    from datetime import UTC, datetime, timedelta

    cutoff = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    query = (
        db.table("analyses")
        .select("overall_score, rating, consultant_name, scorecard")
        .eq("org_id", ctx.deps.org_id)
        .eq("status", "complete")
        .gte("created_at", cutoff)
    )
    query = _apply_user_filter(query, ctx)
    rows = _safe_rows(query.execute())

    if not rows:
        return f"No completed analyses found in the last {days} days."

    scores = [r["overall_score"] for r in rows if r.get("overall_score") is not None]
    scope = "your" if ctx.deps.user_role == "user" else "team"
    return _format_team_stats(rows, scores, scope, days)


def _collect_themes(
    rows: list[dict[str, Any]], priority: int | None
) -> tuple[dict[str, int], dict[str, str]]:
    themes: dict[str, int] = {}
    examples: dict[str, str] = {}
    for row in rows:
        coaching = row.get("coaching")
        if not isinstance(coaching, list):
            continue
        for item in coaching:
            if priority is not None and item.get("priority") != priority:
                continue
            title = item.get("title", "Untitled")
            themes[title] = themes.get(title, 0) + 1
            if title not in examples and item.get("issue"):
                examples[title] = item["issue"]
    return themes, examples


async def search_coaching_patterns(
    ctx: RunContext[CoachDeps],
    consultant_name: str | None = None,
    priority: int | None = None,
    limit: int = 10,
) -> str:
    """Find recurring coaching themes across recent analyses."""
    db: Client = ctx.deps.db
    limit = min(limit, 25)

    query = (
        db.table("analyses")
        .select("consultant_name, coaching, overall_score")
        .eq("org_id", ctx.deps.org_id)
        .eq("status", "complete")
        .order("created_at", desc=True)
        .limit(limit)
    )
    query = _apply_user_filter(query, ctx)

    if consultant_name:
        query = query.ilike("consultant_name", f"%{consultant_name}%")

    result = query.execute()
    rows = _safe_rows(result)

    if not rows:
        return "No analyses found to search for coaching patterns."

    themes, examples = _collect_themes(rows, priority)

    if not themes:
        return "No coaching patterns found matching your criteria."

    sorted_themes = sorted(themes.items(), key=lambda x: x[1], reverse=True)
    lines = [f"**Coaching Patterns** (from {len(rows)} analyses):\n"]
    for title, count in sorted_themes[:10]:
        line = f"- **{title}** — appeared {count}x"
        if title in examples:
            line += f"\n  _Example: {examples[title]}_"
        lines.append(line)

    return "\n".join(lines)


async def get_org_config(
    ctx: RunContext[CoachDeps],
) -> str:
    """Get the organization's scoring framework configuration.

    Returns KPI weights, score thresholds, and call phase definitions.

    Args:
        ctx: Run context with org and user info.
    """
    db: Client = ctx.deps.db

    # Fetch org config from DB
    org_result = (
        db.table("organizations").select("config").eq("id", ctx.deps.org_id).single().execute()
    )
    org_config_json = None
    if org_result.data and isinstance(org_result.data, dict):
        org_config_json = org_result.data.get("config")

    from api.services.config_service import get_org_config as _get_config

    config = _get_config(org_config_json)

    lines = ["**Scoring Framework:**\n"]

    # KPIs
    lines.append("**KPIs:**")
    for kpi in config.get("scoring", {}).get("kpis", []):
        lines.append(f"- {kpi['name']} — weight: {kpi['weight']}%, max: {kpi['max_score']}")

    # Thresholds
    thresholds = config.get("scoring", {}).get("thresholds", {})
    if thresholds:
        lines.append("\n**Score Thresholds:**")
        for level, score in sorted(thresholds.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- {level.title()}: {score}+")

    # Phases
    phases = config.get("call_structure", {}).get("phases", [])
    if phases:
        lines.append("\n**Call Phases:**")
        for phase in phases:
            lines.append(
                f"- Phase {phase['number']}: {phase['name']} "
                f"({phase.get('time_range', 'N/A')}) — max {phase['max_score']} pts"
            )

    return "\n".join(lines)
