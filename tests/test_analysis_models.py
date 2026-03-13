"""Tests for api.models.analysis_models Pydantic models."""

import pytest
from pydantic import ValidationError

from api.models.analysis_models import (
    AnalysisResult,
    CoachingRecommendation,
    KpiScore,
    PhaseAssessment,
    SentimentAnalysis,
    SentimentInflection,
)


class TestKpiScore:
    def test_valid(self):
        ks = KpiScore(kpi="Question Quality", score=4.0, evidence="Good")
        assert ks.score == 4.0

    def test_score_too_high(self):
        with pytest.raises(ValidationError):
            KpiScore(kpi="Q", score=6.0, evidence="x")

    def test_score_too_low(self):
        with pytest.raises(ValidationError):
            KpiScore(kpi="Q", score=-1.0, evidence="x")


class TestPhaseAssessment:
    def test_valid(self):
        pa = PhaseAssessment(
            number=1, name="Opening", score=16, max=20, strengths="Good", gaps="None"
        )
        assert pa.number == 1
        assert pa.max == 20


class TestCoachingRecommendation:
    def test_valid(self):
        cr = CoachingRecommendation(
            priority=1,
            level="HIGH",
            title="Improve Close",
            area="Close",
            issue="Weak",
            impact="Stalls",
            action="Propose options",
        )
        assert cr.priority == 1


class TestSentimentAnalysis:
    def test_defaults(self):
        sa = SentimentAnalysis(trajectory="Positive")
        assert sa.inflections == []

    def test_with_inflections(self):
        sa = SentimentAnalysis(
            trajectory="Mixed",
            inflections=[SentimentInflection(timestamp="05:00", label="Spike")],
        )
        assert len(sa.inflections) == 1


class TestAnalysisResult:
    def test_complete(self):
        result = AnalysisResult(
            consultant_name="Alice",
            prospect_name="Bob",
            overall_score=82,
            rating="Good",
            executive_summary="Summary",
            scorecard=[KpiScore(kpi="Q", score=4.0, evidence="e")],
            phases=[
                PhaseAssessment(number=1, name="Open", score=16, max=20, strengths="s", gaps="g")
            ],
            coaching=[
                CoachingRecommendation(
                    priority=1,
                    level="HIGH",
                    title="t",
                    area="a",
                    issue="i",
                    impact="im",
                    action="ac",
                )
            ],
            sentiment=SentimentAnalysis(trajectory="Positive"),
        )
        assert result.overall_score == 82

    def test_score_out_of_range(self):
        with pytest.raises(ValidationError):
            AnalysisResult(
                consultant_name="A",
                prospect_name="B",
                overall_score=150,
                rating="Good",
                executive_summary="s",
                scorecard=[],
                phases=[],
                coaching=[],
                sentiment=SentimentAnalysis(trajectory="P"),
            )
