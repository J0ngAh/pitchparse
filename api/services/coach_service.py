"""Coach service — interactive coaching agent via PydanticAI streaming."""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from api.config import get_settings
from api.services.analysis_service import _read_command_body
from supabase import Client  # type: ignore[attr-defined]

logger = structlog.get_logger()


@dataclass
class CoachDeps:
    org_id: str
    user_id: str
    user_role: str  # "user" | "manager" | "admin"
    db: Client
    analysis_id: str | None = None
    analysis_context: str | None = None


def _build_coach_prompt() -> str:
    """Load the coach system prompt from the markdown file."""
    prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "coach.md"
    return _read_command_body(str(prompt_path))


def _format_header_fields(data: dict) -> list[str]:
    """Format top-level analysis metadata fields."""
    parts = []
    if data.get("consultant_name"):
        parts.append(f"**Consultant:** {data['consultant_name']}")
    if data.get("prospect_name"):
        parts.append(f"**Prospect:** {data['prospect_name']}")
    if data.get("overall_score") is not None:
        parts.append(f"**Overall Score:** {data['overall_score']}/100")
    if data.get("rating"):
        parts.append(f"**Rating:** {data['rating']}")
    return parts


def _format_scorecard(scorecard: list[dict]) -> list[str]:
    """Format KPI scorecard section."""
    return ["\n## Scorecard"] + [
        f"- **{kpi['kpi']}:** {kpi['score']}/5 — {kpi['evidence']}" for kpi in scorecard
    ]


def _format_phases(phases: list[dict]) -> list[str]:
    """Format phase breakdown section."""
    parts = ["\n## Phase Breakdown"]
    for phase in phases:
        parts.append(
            f"### Phase {phase['number']}: {phase['name']} — {phase['score']}/{phase['max']}"
        )
        if phase.get("strengths"):
            parts.append(f"Strengths: {phase['strengths']}")
        if phase.get("gaps"):
            parts.append(f"Gaps: {phase['gaps']}")
    return parts


def _format_coaching(coaching: list[dict]) -> list[str]:
    """Format coaching recommendations section."""
    parts = ["\n## Coaching Recommendations"]
    for rec in coaching:
        parts.append(
            f"- **P{rec['priority']} ({rec.get('level', 'N/A')}): {rec.get('title', '')}**"
        )
        if rec.get("issue"):
            parts.append(f"  Issue: {rec['issue']}")
        if rec.get("action"):
            parts.append(f"  Action: {rec['action']}")
    return parts


def _build_analysis_context(analysis_data: dict) -> str:
    """Format analysis data as context for the coach agent."""
    parts = _format_header_fields(analysis_data)

    if analysis_data.get("scorecard"):
        parts.extend(_format_scorecard(analysis_data["scorecard"]))
    if analysis_data.get("phases"):
        parts.extend(_format_phases(analysis_data["phases"]))
    if analysis_data.get("coaching"):
        parts.extend(_format_coaching(analysis_data["coaching"]))

    sent = analysis_data.get("sentiment", {})
    if sent.get("trajectory"):
        parts.append(f"\n## Sentiment: {sent['trajectory']}")

    body = analysis_data.get("body", "")
    if body:
        import re

        match = re.search(r"## Executive Summary\s*\n([\s\S]*?)(?=\n## |$)", body)
        if match:
            parts.append(f"\n## Executive Summary\n{match.group(1).strip()}")

    return "\n".join(parts)


def _register_coach_tools(agent: Agent[CoachDeps, str]) -> None:
    """Register all coach agent tools."""
    from api.services.coach_tools import (
        compare_consultants,
        get_analysis_detail,
        get_org_config,
        get_team_stats,
        get_transcript_excerpt,
        list_analyses,
        search_coaching_patterns,
    )

    for tool in (
        list_analyses,
        get_analysis_detail,
        get_transcript_excerpt,
        compare_consultants,
        get_team_stats,
        search_coaching_patterns,
        get_org_config,
    ):
        agent.tool(tool)


def build_coach_agent(
    api_key: str,
    model: str | None = None,
    custom_prompt: str | None = None,
) -> Agent[CoachDeps, str]:
    """Create a PydanticAI agent for coaching conversations."""
    model = model or "claude-sonnet-4-6-20250514"
    model_instance = AnthropicModel(model, provider=AnthropicProvider(api_key=api_key))
    agent: Agent[CoachDeps, str] = Agent(
        model_instance, deps_type=CoachDeps, system_prompt=custom_prompt or _build_coach_prompt()
    )

    @agent.system_prompt
    async def add_analysis_context(ctx) -> str:
        if ctx.deps.analysis_context:
            return (
                "\n\n---\n\n# Analysis Data for This Call\n\n"
                f"{ctx.deps.analysis_context}\n\n"
                "Use this data to ground your coaching in specific evidence from the call."
            )
        return ""

    _register_coach_tools(agent)
    return agent


def get_default_coach_prompt() -> str:
    """Return the default coach prompt for settings UI."""
    return _build_coach_prompt()


def _convert_history_to_messages(
    history: list[dict],
) -> list[ModelMessage]:
    """Convert DB message history to PydanticAI message format."""
    messages: list[ModelMessage] = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(ModelRequest.user_text_prompt(msg["content"]))
        elif msg["role"] == "assistant":
            from pydantic_ai.messages import TextPart

            messages.append(ModelResponse(parts=[TextPart(content=msg["content"])]))
    return messages


async def stream_coach_response(
    user_message: str,
    history: list[dict],
    deps: CoachDeps,
    agent: Agent[CoachDeps, str],
) -> AsyncIterator[str]:
    """Stream coach response, yielding text deltas.

    Args:
        user_message: The new user message to respond to.
        history: Previous messages in the conversation (dicts with role/content).
        deps: Coach dependencies (org_id, user_id, analysis context).
        agent: The PydanticAI coach agent.

    Yields:
        Text delta strings as they arrive from the model.
    """
    message_history = _convert_history_to_messages(history)

    async with agent.run_stream(
        user_message,
        deps=deps,
        message_history=message_history,
        model_settings={"max_tokens": 4096, "temperature": get_settings().claude_temperature},
    ) as result:
        async for chunk in result.stream_text(delta=True):
            yield chunk
