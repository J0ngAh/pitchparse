"""Tests for deprecated extractors in api.services.analysis_service.

These extractors are kept for migration script compatibility.
"""

from api.services.analysis_service import extract_participants, extract_rating, extract_score


class TestExtractScore:
    def test_composite_score_pattern(self):
        body = "**Overall Composite Score:** **85/100**"
        assert extract_score(body) == 85

    def test_final_score_pattern(self):
        body = "Final Score: 72/100"
        assert extract_score(body) == 72

    def test_normalized_score(self):
        body = "Normalized score: **90 / 100**"
        assert extract_score(body) == 90

    def test_no_score_returns_zero(self):
        assert extract_score("No score here") == 0


class TestExtractRating:
    def test_explicit_rating(self):
        body = "**Rating:** Good"
        assert extract_rating(body, 80) == "Good"

    def test_bold_inline_rating(self):
        body = "**Rating: Exceptional**"
        assert extract_rating(body, 95) == "Exceptional"

    def test_fallback_to_score_based_rating(self):
        body = "No explicit rating"
        assert extract_rating(body, 95) == "Exceptional"
        assert extract_rating(body, 80) == "Good"
        assert extract_rating(body, 65) == "Needs Improvement"
        assert extract_rating(body, 45) == "Poor"
        assert extract_rating(body, 30) == "Critical"


class TestExtractParticipants:
    def test_bold_format(self):
        body = "**Consultant:** Alice\n**Prospect:** Bob"
        consultant, prospect = extract_participants(body)
        assert consultant == "Alice"
        assert prospect == "Bob"

    def test_heading_format(self):
        body = "# Sales Call Analysis: Alice ↔ Bob"
        consultant, prospect = extract_participants(body)
        assert consultant == "Alice"
        assert prospect == "Bob"

    def test_no_participants_returns_unknown(self):
        body = "No participants mentioned"
        consultant, prospect = extract_participants(body)
        assert consultant == "Unknown"
        assert prospect == "Unknown"
