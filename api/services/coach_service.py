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


def _build_analysis_context(analysis_data: dict) -> str:
    """Format analysis data as context for the coach agent."""
    parts = []

    if analysis_data.get("consultant_name"):
        parts.append(f"**Consultant:** {analysis_data['consultant_name']}")
    if analysis_data.get("prospect_name"):
        parts.append(f"**Prospect:** {analysis_data['prospect_name']}")
    if analysis_data.get("overall_score") is not None:
        parts.append(f"**Overall Score:** {analysis_data['overall_score']}/100")
    if analysis_data.get("rating"):
        parts.append(f"**Rating:** {analysis_data['rating']}")

    if analysis_data.get("scorecard"):
        parts.append("\n## Scorecard")
        for kpi in analysis_data["scorecard"]:
            parts.append(f"- **{kpi['kpi']}:** {kpi['score']}/5 — {kpi['evidence']}")

    if analysis_data.get("phases"):
        parts.append("\n## Phase Breakdown")
        for phase in analysis_data["phases"]:
            num, name = phase["number"], phase["name"]
            score, mx = phase["score"], phase["max"]
            parts.append(f"### Phase {num}: {name} — {score}/{mx}")
            if phase.get("strengths"):
                parts.append(f"Strengths: {phase['strengths']}")
            if phase.get("gaps"):
                parts.append(f"Gaps: {phase['gaps']}")

    if analysis_data.get("coaching"):
        parts.append("\n## Coaching Recommendations")
        for rec in analysis_data["coaching"]:
            level = rec.get("level", "N/A")
            title = rec.get("title", "")
            parts.append(f"- **P{rec['priority']} ({level}): {title}**")
            if rec.get("issue"):
                parts.append(f"  Issue: {rec['issue']}")
            if rec.get("action"):
                parts.append(f"  Action: {rec['action']}")

    if analysis_data.get("sentiment"):
        sent = analysis_data["sentiment"]
        if sent.get("trajectory"):
            parts.append(f"\n## Sentiment: {sent['trajectory']}")

    # Include executive summary from body
    body = analysis_data.get("body", "")
    if body:
        import re

        match = re.search(r"## Executive Summary\s*\n([\s\S]*?)(?=\n## |$)", body)
        if match:
            parts.append(f"\n## Executive Summary\n{match.group(1).strip()}")

    return "\n".join(parts)


def build_coach_agent(
    api_key: str,
    model: str | None = None,
    custom_prompt: str | None = None,
) -> Agent[CoachDeps, str]:
    """Create a PydanticAI agent for coaching conversations.

    Args:
        api_key: Anthropic API key.
        model: Model ID to use. Defaults to Sonnet 4.6 for conversational quality.
        custom_prompt: Org-specific coach prompt from DB. Falls back to default.
    """
    model = model or "claude-sonnet-4-6-20250514"
    base_prompt = custom_prompt or _build_coach_prompt()

    model_instance = AnthropicModel(
        model,
        provider=AnthropicProvider(api_key=api_key),
    )

    agent: Agent[CoachDeps, str] = Agent(
        model_instance,
        deps_type=CoachDeps,
        system_prompt=base_prompt,
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

    # Register agent tools
    from api.services.coach_tools import (
        compare_consultants,
        get_analysis_detail,
        get_org_config,
        get_team_stats,
        get_transcript_excerpt,
        list_analyses,
        search_coaching_patterns,
    )

    agent.tool(list_analyses)
    agent.tool(get_analysis_detail)
    agent.tool(get_transcript_excerpt)
    agent.tool(compare_consultants)
    agent.tool(get_team_stats)
    agent.tool(search_coaching_patterns)
    agent.tool(get_org_config)

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
