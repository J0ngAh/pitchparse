"""Benchmark tests for scoring consistency.

These tests call the Claude API with reference transcripts and verify
that scores fall within expected ranges. They are opt-in: skipped unless
ANTHROPIC_API_KEY is set, and marked with 'benchmark' so they can be
excluded from normal test runs with: pytest -m "not benchmark"
"""

import os
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.benchmark
@pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY"),
    reason="Requires ANTHROPIC_API_KEY for live Claude calls",
)
class TestScoringBenchmark:
    """Verify scoring consistency against reference transcripts."""

    def test_good_call_scores_in_expected_range(self):
        """A well-executed sales call should score 70-95."""
        from api.services.analysis_service import run_analysis

        transcript = (FIXTURES_DIR / "benchmark_good.md").read_text()
        result, _ = run_analysis(
            transcript_text=transcript,
            api_key=os.environ["ANTHROPIC_API_KEY"],
        )

        assert (
            70 <= result.overall_score <= 95
        ), f"Good call scored {result.overall_score}, expected 70-95"
        assert result.rating in (
            "Exceptional",
            "Good",
        ), f"Good call rated '{result.rating}', expected Exceptional or Good"

    def test_poor_call_scores_in_expected_range(self):
        """A poorly-executed sales call should score 20-60."""
        from api.services.analysis_service import run_analysis

        transcript = (FIXTURES_DIR / "benchmark_poor.md").read_text()
        result, _ = run_analysis(
            transcript_text=transcript,
            api_key=os.environ["ANTHROPIC_API_KEY"],
        )

        assert (
            20 <= result.overall_score <= 60
        ), f"Poor call scored {result.overall_score}, expected 20-60"
        assert result.rating in (
            "Poor",
            "Critical",
            "Needs Improvement",
        ), f"Poor call rated '{result.rating}', expected Poor, Critical, or Needs Improvement"

    def test_determinism_same_transcript_similar_scores(self):
        """Running analysis twice on the same transcript should produce similar scores.

        With temperature=0, scores should be within a narrow band.
        """
        from api.services.analysis_service import run_analysis

        transcript = (FIXTURES_DIR / "benchmark_good.md").read_text()
        api_key = os.environ["ANTHROPIC_API_KEY"]

        result_1, _ = run_analysis(transcript_text=transcript, api_key=api_key)
        result_2, _ = run_analysis(transcript_text=transcript, api_key=api_key)

        score_diff = abs(result_1.overall_score - result_2.overall_score)
        assert score_diff <= 10, (
            f"Score variance too high: {result_1.overall_score} vs {result_2.overall_score} "
            f"(diff={score_diff}, max allowed=10)"
        )
