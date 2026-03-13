"""Structured output models for PydanticAI-powered analysis.

These models define the exact shape Claude returns via PydanticAI's
structured output, replacing the brittle regex parsing in parser_service.py.
"""

from pydantic import BaseModel, Field


class KpiScore(BaseModel):
    """A single KPI score with evidence from the transcript."""

    kpi: str
    score: float = Field(ge=0, le=5)
    evidence: str


class PhaseAssessment(BaseModel):
    """Assessment of a single call phase."""

    number: int
    name: str
    score: int = Field(ge=0)
    max: int = 20
    strengths: str
    gaps: str


class CoachingRecommendation(BaseModel):
    """A prioritized coaching recommendation."""

    priority: int
    level: str = Field(description="HIGH, MEDIUM, or LOW")
    title: str
    area: str
    issue: str
    impact: str
    action: str


class SentimentInflection(BaseModel):
    """A single sentiment inflection point in the call."""

    timestamp: str = Field(description="MM:SS format")
    label: str


class SentimentAnalysis(BaseModel):
    """Overall sentiment trajectory and key inflection points."""

    trajectory: str
    inflections: list[SentimentInflection] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """Complete structured analysis output from Claude via PydanticAI.

    Field shapes are backward-compatible with data_adapter.py:
    - scorecard list[dict] with kpi/score/evidence keys
    - phases list[dict] with number/name/score/max/strengths/gaps keys
    - coaching list[dict] with priority/level/title/area/issue/impact/action keys
    - sentiment dict with trajectory/inflections keys
    """

    consultant_name: str
    prospect_name: str
    overall_score: int = Field(ge=0, le=100, description="Weighted composite 0-100")
    rating: str = Field(description="One of: Exceptional, Good, Needs Improvement, Poor, Critical")
    executive_summary: str
    scorecard: list[KpiScore]
    phases: list[PhaseAssessment]
    coaching: list[CoachingRecommendation]
    sentiment: SentimentAnalysis
