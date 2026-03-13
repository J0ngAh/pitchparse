"""Analysis service — orchestrates transcript analysis via PydanticAI.

Uses PydanticAI for structured Claude outputs (typed Pydantic models)
instead of streaming + regex parsing. Report generation still uses raw
Claude output (HTML) via the anthropic SDK directly.
"""

import re
from functools import lru_cache
from pathlib import Path

import anthropic
from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from api.models.analysis_models import AnalysisResult


@lru_cache(maxsize=16)
def _read_file_cached(path: str) -> str:
    return Path(path).read_text()


@lru_cache(maxsize=8)
def _read_command_body(path: str) -> str:
    text = _read_file_cached(path)
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            return text[end + 3 :].strip()
    return text


def _build_rubric_from_config(config: dict) -> str:
    lines = ["# KPI Scoring Rubric\n"]
    for kpi in config["scoring"]["kpis"]:
        lines.append(f"## {kpi['name']}")
        lines.append(f"**Weight:** {kpi['weight']}%  |  **Max Score:** {kpi['max_score']}")
        if kpi.get("description"):
            lines.append(f"**What to measure:** {kpi['description']}")
        lines.append("")
    return "\n".join(lines)


def _build_call_script_from_config(config: dict) -> str:
    cs = config["call_structure"]
    lines = [f"# Call Structure ({cs['duration_minutes']} minutes)\n"]
    for phase in cs["phases"]:
        lines.append(f"### Phase {phase['number']}: {phase['name']} ({phase['time_range']})")
        lines.append(f"**Goal:** {phase['goal']}")
        lines.append(f"**Max Score:** {phase['max_score']}")
        lines.append("")
    return "\n".join(lines)


def _get_default_kpi_list() -> list[str]:
    from api.services.config_service import DEFAULT_CONFIG

    return [k["name"] for k in DEFAULT_CONFIG["scoring"]["kpis"]]


def _is_custom_config(config: dict) -> bool:
    from api.services.config_service import DEFAULT_CONFIG

    default_kpis = _get_default_kpi_list()
    current_kpis = [k["name"] for k in config["scoring"]["kpis"]]
    return default_kpis != current_kpis or (
        config["call_structure"]["phases"] != DEFAULT_CONFIG["call_structure"]["phases"]
    )


def build_system_prompt(config: dict | None = None) -> str:
    """Build the system prompt for analysis using reference files."""
    api_dir = Path(__file__).resolve().parent.parent
    refs_dir = api_dir / "prompts" / "references"
    cmd_path = api_dir / "prompts" / "analyze.md"

    from api.services.config_service import DEFAULT_CONFIG

    cfg = config or DEFAULT_CONFIG
    custom = _is_custom_config(cfg) if config else False

    parts = []
    if cmd_path.exists():
        parts.append(_read_command_body(str(cmd_path)))

    if custom:
        parts.append(f"\n\n---\n\n{_build_call_script_from_config(cfg)}")
        parts.append(f"\n\n---\n\n{_build_rubric_from_config(cfg)}")
        coaching_path = refs_dir / "coaching-frameworks.md"
        if coaching_path.exists():
            parts.append(
                f"\n\n---\n\n# Reference: coaching-frameworks.md\n\n"
                f"{_read_file_cached(str(coaching_path))}"
            )
    else:
        for ref_name in ["call-script.md", "kpi-rubric.md", "coaching-frameworks.md"]:
            ref_path = refs_dir / ref_name
            if ref_path.exists():
                parts.append(
                    f"\n\n---\n\n# Reference: {ref_name}\n\n{_read_file_cached(str(ref_path))}"
                )

    return "\n\n".join(parts)


def run_analysis(
    transcript_text: str,
    api_key: str,
    model: str | None = None,
    focus: str | None = None,
    config: dict | None = None,
) -> AnalysisResult:
    """Run analysis via PydanticAI structured output. Returns AnalysisResult."""
    from api.config import get_settings

    settings = get_settings()
    model = model or settings.claude_model
    system_prompt = build_system_prompt(config)

    user_message = (
        "IMPORTANT: The reference files (KPI rubric, call script, coaching frameworks) "
        "are already included in your system prompt above. Do NOT attempt to read them "
        "with tool calls — they are already loaded.\n\n"
        "Analyze this sales call transcript and return the structured analysis result.\n\n"
        f"{transcript_text}"
    )
    if focus:
        user_message += f"\n\nFocus area: {focus}"

    model_instance = AnthropicModel(
        model,
        provider=AnthropicProvider(api_key=api_key),
    )
    agent = Agent(
        model_instance,
        output_type=AnalysisResult,
        system_prompt=system_prompt,
        retries=3,
    )

    result = agent.run_sync(
        user_message,
        model_settings={"max_tokens": 32000, "temperature": settings.claude_temperature},
    )
    return result.output


def render_analysis_markdown(result: AnalysisResult) -> str:
    """Render structured AnalysisResult as deterministic markdown.

    This generates the `body` column content for the analyses table,
    used by report generation and the Call Detail page.
    """
    lines = [
        "---",
        f"consultant: {result.consultant_name}",
        f"prospect: {result.prospect_name}",
        f"overall_score: {result.overall_score}",
        f"rating: {result.rating}",
        "---",
        "",
        f"# Sales Call Analysis: {result.consultant_name} ↔ {result.prospect_name}",
        "",
        f"**Consultant:** {result.consultant_name}",
        f"**Prospect:** {result.prospect_name}",
        f"**Overall Composite Score:** **{result.overall_score}/100**",
        f"**Rating:** {result.rating}",
        "",
        "## Executive Summary",
        "",
        result.executive_summary,
        "",
        "## Scorecard",
        "",
        "| KPI | Score | Evidence |",
        "|-----|-------|----------|",
    ]

    lines.extend(_render_scorecard(result.scorecard))
    lines.extend(_render_phases(result.phases))

    lines.extend(["## Sentiment Analysis", ""])
    lines.append(f"Overall trajectory: **{result.sentiment.trajectory}**")
    lines.append("")
    for infl in result.sentiment.inflections:
        lines.append(f"**[{infl.timestamp}] — {infl.label}**")
    lines.append("")

    lines.extend(_render_coaching(result.coaching))

    return "\n".join(lines)


def _render_scorecard(scorecard: list) -> list[str]:
    lines = []
    for kpi in scorecard:
        lines.append(f"| {kpi.kpi} | {kpi.score}/5 | {kpi.evidence} |")
    return lines


def _render_phases(phases: list) -> list[str]:
    lines = ["", "## Phase-by-Phase Breakdown", ""]
    for phase in phases:
        lines.append(f"### Phase {phase.number}: {phase.name} — {phase.score}/{phase.max}")
        lines.append("")
        lines.append("**Strengths:**")
        lines.append(phase.strengths)
        lines.append("")
        lines.append("**Gaps:**")
        lines.append(phase.gaps)
        lines.append("")
    return lines


def _render_coaching(coaching: list) -> list[str]:
    lines = ["## Coaching Recommendations", ""]
    for rec in coaching:
        lines.append(f"**Priority {rec.priority} — {rec.level}: {rec.title}**")
        lines.append(f"- **Area:** {rec.area}")
        lines.append(f"- **Issue:** {rec.issue}")
        lines.append(f"- **Impact:** {rec.impact}")
        lines.append(f"- **Action:** {rec.action}")
        lines.append("")
    return lines


# --- Report generation (still uses raw Claude output, not PydanticAI) ---


def _build_report_system_prompt() -> str:
    """Build the system prompt for report generation from reference files."""
    api_dir = Path(__file__).resolve().parent.parent
    cmd_path = api_dir / "prompts" / "report.md"
    coaching_path = api_dir / "prompts" / "references" / "coaching-frameworks.md"

    parts = []
    if cmd_path.exists():
        parts.append(_read_command_body(str(cmd_path)))
    if coaching_path.exists():
        parts.append(
            f"\n\n---\n\n# Reference: coaching-frameworks.md\n\n"
            f"{_read_file_cached(str(coaching_path))}"
        )
    return "\n\n".join(parts)


def _build_report_user_message(analysis_text: str) -> str:
    """Build the user message for report generation."""
    return (
        "IMPORTANT: The coaching frameworks reference is already included in your "
        "system prompt. Do NOT use tool calls — everything is already loaded.\n\n"
        "Output ONLY the raw HTML document. Do NOT output any reasoning, planning, "
        "step-by-step notes, or commentary before or after the HTML. Start your "
        "response with <!DOCTYPE html> and end with </html>. No code fences.\n\n"
        "Generate a coaching report as a self-contained HTML document. "
        "Requirements:\n"
        "- Complete <!DOCTYPE html> with inline <style> in <head>\n"
        "- Professional styling suitable for PDF printing (@media print rules)\n"
        "- Include <meta> tags in <head> for: consultant, prospect, call_date, "
        "report_date, overall_score, rating\n"
        '  e.g. <meta name="consultant" content="...">\n'
        "- Clean, modern typography with a muted color palette\n"
        "- If using a sentiment timeline with emojis and a connecting line, "
        "center the line vertically through the emoji circles using "
        "top: 50% on the ::before pseudo-element of the flex container, "
        "not a fixed rem value\n\n"
        f"{analysis_text}"
    )


def run_report_generation(
    analysis_text: str,
    api_key: str,
    model: str | None = None,
) -> str:
    """Generate a coaching report synchronously. Returns HTML string."""
    from api.config import get_settings

    settings = get_settings()
    model = model or settings.claude_model
    system_prompt = _build_report_system_prompt()
    user_message = _build_report_user_message(analysis_text)

    client = anthropic.Anthropic(api_key=api_key, max_retries=3)
    message = client.messages.create(
        model=model,
        max_tokens=32000,
        temperature=settings.claude_temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    block = message.content[0]
    if not isinstance(block, anthropic.types.TextBlock):
        raise ValueError(f"Expected TextBlock from Claude, got {type(block).__name__}")
    full_text = block.text
    return _extract_html(strip_tool_xml(full_text))


def strip_tool_xml(content: str) -> str:
    result = re.sub(
        r"<(?:tool_call|tool_response)>.*?</(?:tool_call|tool_response)>",
        "",
        content,
        flags=re.DOTALL,
    )
    result = re.sub(
        r"<(?:tool_call|tool_response)>.*",
        "",
        result,
        flags=re.DOTALL,
    )
    return result.strip()


def _extract_html(content: str) -> str:
    m = re.search(r"(<!DOCTYPE html>.*</html>)", content, re.DOTALL | re.IGNORECASE)
    return m.group(1) if m else content


# --- Deprecated extractors (kept for migration script compatibility) ---


def extract_score(body: str) -> int:
    """DEPRECATED: Use PydanticAI structured output instead.
    Kept for api.scripts.migrate_files_to_supabase compatibility.
    """
    patterns = [
        (
            r"(?:overall\s+(?:composite\s+)?score|final\s+score|composite\s+score)"
            r"[:\s*]*\*?\*?\s*(\d+)\s*(?:/\s*100)?",
            re.IGNORECASE,
        ),
        (r"[Nn]ormalized[^*\n]*\*\*(\d+)\s*/\s*100\*\*", 0),
        (r"scores?\s+\*\*(\d+)\s*/\s*100", re.IGNORECASE),
        (r"\*\*(\d+)\s*/\s*100\*\*", 0),
    ]
    for pattern, flags in patterns:
        m = re.search(pattern, body, flags)
        if m:
            return int(m.group(1))
    return 0


def extract_rating(body: str, score: int, config: dict | None = None) -> str:
    """DEPRECATED: Use PydanticAI structured output instead.
    Kept for api.scripts.migrate_files_to_supabase compatibility.
    """
    from api.services.config_service import get_score_rating

    rating_choices = r"(Exceptional|Good|Needs Improvement|Poor|Critical)"
    patterns = [
        r"\*\*(?:Rating|Overall Rating)[:\s]*\*\*\s*" + rating_choices,
        r"\*\*(?:Rating|Overall Rating)[:\s]+" + rating_choices + r"\*\*",
        r"(?:Rating|Overall Rating)[:\s]+" + rating_choices,
    ]
    for pattern in patterns:
        m = re.search(pattern, body, re.IGNORECASE)
        if m:
            return m.group(1)
    return get_score_rating(score, config)


def extract_participants(body: str) -> tuple[str, str]:
    """DEPRECATED: Use PydanticAI structured output instead.
    Kept for api.scripts.migrate_files_to_supabase compatibility.
    """
    cons_m = re.search(r"\*\*Consultant:\*\*\s*(.+)", body)
    pros_m = re.search(r"\*\*Prospect:\*\*\s*(.+)", body)
    if not cons_m or not pros_m:
        heading_m = re.search(
            r"#\s*(?:Sales\s+Call\s+)?Analysis:\s*(.+?)\s*(?:↔|<->|vs\.?)\s*(.+)",
            body,
            re.IGNORECASE,
        )
        if heading_m:
            return heading_m.group(1).strip(), heading_m.group(2).strip().rstrip("#").strip()
    consultant = cons_m.group(1).strip() if cons_m else "Unknown"
    prospect = pros_m.group(1).strip() if pros_m else "Unknown"
    return consultant, prospect
