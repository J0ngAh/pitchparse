"""Tests for analysis_service.render_analysis_markdown pure logic."""

from api.models.analysis_models import (
    AnalysisResult,
    CoachingRecommendation,
    KpiScore,
    PhaseAssessment,
    SentimentAnalysis,
    SentimentInflection,
)
from api.services.analysis_service import render_analysis_markdown


def _make_result() -> AnalysisResult:
    return AnalysisResult(
        consultant_name="Alice",
        prospect_name="Bob",
        overall_score=82,
        rating="Good",
        executive_summary="Strong discovery with room for improvement on close.",
        scorecard=[
            KpiScore(kpi="Question Quality", score=4.0, evidence="Good open-ended Qs"),
            KpiScore(kpi="Pain Point Discovery", score=3.5, evidence="Found 2 pain points"),
        ],
        phases=[
            PhaseAssessment(
                number=1,
                name="Opening & Rapport",
                score=16,
                max=20,
                strengths="Built rapport quickly",
                gaps="Skipped agenda setting",
            ),
        ],
        coaching=[
            CoachingRecommendation(
                priority=1,
                level="HIGH",
                title="Improve Close",
                area="Close",
                issue="Weak commitment",
                impact="Deals stall",
                action="Propose two options",
            ),
        ],
        sentiment=SentimentAnalysis(
            trajectory="Positive",
            inflections=[
                SentimentInflection(timestamp="05:00", label="Engagement spike"),
            ],
        ),
    )


class TestRenderAnalysisMarkdown:
    def test_contains_yaml_frontmatter(self):
        md = render_analysis_markdown(_make_result())
        assert md.startswith("---\n")
        assert "consultant: Alice" in md
        assert "overall_score: 82" in md

    def test_contains_scorecard_table(self):
        md = render_analysis_markdown(_make_result())
        assert "| Question Quality | 4.0/5 |" in md
        assert "| Pain Point Discovery | 3.5/5 |" in md

    def test_contains_phase_breakdown(self):
        md = render_analysis_markdown(_make_result())
        assert "### Phase 1: Opening & Rapport" in md
        assert "Built rapport quickly" in md

    def test_contains_coaching(self):
        md = render_analysis_markdown(_make_result())
        assert "**Priority 1 — HIGH: Improve Close**" in md
        assert "Propose two options" in md

    def test_contains_sentiment(self):
        md = render_analysis_markdown(_make_result())
        assert "**Positive**" in md
        assert "**[05:00] — Engagement spike**" in md
