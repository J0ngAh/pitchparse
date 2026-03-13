"""Synthetic transcript generation service.

Generates realistic sales call transcripts via Claude for testing
the analysis pipeline. Mirrors the CLI generate-synthetic command
but without batch mode or file-saving logic.
"""

import random
from pathlib import Path

import anthropic

from api.services.analysis_service import _read_command_body, _read_file_cached

QUALITY_LEVELS = ["excellent", "good", "poor", "terrible"]

SCORE_RANGES = {
    "excellent": (90, 100),
    "good": (75, 89),
    "poor": (40, 59),
    "terrible": (0, 39),
}


def build_synthetic_system_prompt(config: dict | None = None) -> str:
    """Build the system prompt for synthetic generation using reference files."""
    api_dir = Path(__file__).resolve().parent.parent
    refs_dir = api_dir / "prompts" / "references"
    cmd_path = api_dir / "prompts" / "generate-synthetic.md"

    parts = []
    if cmd_path.exists():
        parts.append(_read_command_body(str(cmd_path)))

    for ref_name in ["call-script.md", "kpi-rubric.md"]:
        ref_path = refs_dir / ref_name
        if ref_path.exists():
            parts.append(
                f"\n\n---\n\n# Reference: {ref_name}\n\n{_read_file_cached(str(ref_path))}"
            )

    return "\n\n".join(parts)


def _build_synthetic_user_prompt(
    quality: str,
    score_min: int,
    score_max: int,
    scenario: str | None = None,
    consultant_name: str | None = None,
    prospect_name: str | None = None,
) -> str:
    """Build the user message for synthetic transcript generation."""
    parts = [
        f"Generate a **{quality}** quality synthetic sales call transcript.",
        f"Target analysis score range: **{score_min}-{score_max}** out of 100.",
        "Duration: 25-35 minutes.",
        "Date: today's date.",
    ]

    if scenario:
        parts.append(f"\nScenario: {scenario}")
    if consultant_name:
        parts.append(f"\nConsultant name: {consultant_name}")
    if prospect_name:
        parts.append(f"\nProspect name: {prospect_name}")

    parts.append(
        "\nOutput ONLY the transcript in the specified format. "
        "Start with the YAML frontmatter (---) and end with the last line of dialogue. "
        "No commentary before or after."
    )

    return "\n".join(parts)


def generate_synthetic(
    api_key: str,
    quality: str = "random",
    scenario: str | None = None,
    consultant_name: str | None = None,
    prospect_name: str | None = None,
    model: str | None = None,
    config: dict | None = None,
) -> str:
    """Generate a single synthetic transcript. Returns the transcript text."""
    from api.config import get_settings

    settings = get_settings()
    model = model or settings.claude_model

    if quality == "random" or quality not in QUALITY_LEVELS:
        quality = random.choice(QUALITY_LEVELS)

    score_min, score_max = SCORE_RANGES[quality]
    system_prompt = build_synthetic_system_prompt(config)
    user_message = _build_synthetic_user_prompt(
        quality, score_min, score_max, scenario, consultant_name, prospect_name
    )

    client = anthropic.Anthropic(api_key=api_key, max_retries=2)
    message = client.messages.create(
        model=model,
        max_tokens=16000,
        temperature=settings.claude_temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    block = message.content[0]
    if not isinstance(block, anthropic.types.TextBlock):
        raise ValueError(f"Expected TextBlock from Claude, got {type(block).__name__}")
    return block.text
