"""Tests for pure functions in api.services.analysis_service."""

import copy

from api.models.analysis_models import (
    AnalysisResult,
    CoachingRecommendation,
    KpiScore,
    PhaseAssessment,
    SentimentAnalysis,
    SentimentInflection,
)
from api.services.analysis_service import (
    _build_call_script_from_config,
    _build_rubric_from_config,
    _extract_html,
    _is_custom_config,
    build_system_prompt,
    render_analysis_markdown,
    strip_tool_xml,
)
from api.services.config_service import DEFAULT_CONFIG


def _make_result() -> AnalysisResult:
    return AnalysisResult(
        consultant_name="Alice",
        prospect_name="Bob",
        overall_score=82,
        rating="Good",
        executive_summary="Strong discovery.",
        scorecard=[KpiScore(kpi="Question Quality", score=4.0, evidence="Good Qs")],
        phases=[
            PhaseAssessment(
                number=1,
                name="Opening",
                score=16,
                max=20,
                strengths="Built rapport",
                gaps="Skipped agenda",
            )
        ],
        coaching=[
            CoachingRecommendation(
                priority=1,
                level="HIGH",
                title="Improve Close",
                area="Close",
                issue="Weak",
                impact="Stalls",
                action="Propose options",
            )
        ],
        sentiment=SentimentAnalysis(
            trajectory="Positive",
            inflections=[SentimentInflection(timestamp="05:00", label="Spike")],
        ),
    )


class TestRenderAnalysisMarkdown:
    def test_roundtrip_contains_key_fields(self):
        md = render_analysis_markdown(_make_result())
        assert "consultant: Alice" in md
        assert "overall_score: 82" in md
        assert "| Question Quality | 4.0/5 |" in md
        assert "### Phase 1: Opening" in md
        assert "**Priority 1 — HIGH: Improve Close**" in md
        assert "**[05:00] — Spike**" in md


class TestBuildRubricFromConfig:
    def test_includes_all_kpis(self):
        rubric = _build_rubric_from_config(DEFAULT_CONFIG)
        assert "Talk-to-Listen Ratio" in rubric
        assert "Next Step Quality" in rubric
        assert "Weight:" in rubric


class TestBuildCallScriptFromConfig:
    def test_includes_all_phases(self):
        script = _build_call_script_from_config(DEFAULT_CONFIG)
        assert "Phase 1:" in script
        assert "Phase 5:" in script
        assert "30 minutes" in script


class TestIsCustomConfig:
    def test_default_is_not_custom(self):
        assert _is_custom_config(DEFAULT_CONFIG) is False

    def test_modified_kpi_is_custom(self):
        cfg = copy.deepcopy(DEFAULT_CONFIG)
        cfg["scoring"]["kpis"][0]["name"] = "Custom KPI"
        assert _is_custom_config(cfg) is True

    def test_modified_phases_is_custom(self):
        cfg = copy.deepcopy(DEFAULT_CONFIG)
        cfg["call_structure"]["phases"] = []
        assert _is_custom_config(cfg) is True


class TestBuildSystemPrompt:
    def test_loads_without_error(self):
        prompt, template_id = build_system_prompt()
        assert len(prompt) > 100
        assert template_id is None  # No org_id means file fallback


class TestStripToolXml:
    def test_removes_tool_tags(self):
        text = "Hello <tool_call>stuff</tool_call> World"
        assert strip_tool_xml(text) == "Hello  World"

    def test_removes_unclosed_tool_tags(self):
        text = "Hello <tool_call>stuff"
        assert strip_tool_xml(text) == "Hello"


class TestExtractHtml:
    def test_extracts_html_document(self):
        text = "Some preamble\n<!DOCTYPE html><html><body>Hi</body></html>\ntrailing"
        assert _extract_html(text) == "<!DOCTYPE html><html><body>Hi</body></html>"

    def test_returns_content_if_no_html(self):
        text = "No html here"
        assert _extract_html(text) == text
