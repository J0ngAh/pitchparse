"""Tests for api.services.parser_service regex parsing logic."""

from api.services.parser_service import (
    get_kpi_aliases,
    parse_coaching,
    parse_phases,
    parse_scorecard,
    parse_sentiment,
)

SAMPLE_SCORECARD = """\
## Scorecard

| KPI | Score | Evidence |
|-----|-------|----------|
| Talk-to-Listen Ratio | 4/5 | Good balance at 40/60 split |
| Question Quality | 3.5/5 | Mixed open and closed questions |
| Pain Point Discovery | 4/5 | Identified 3 key pain points |
"""

SAMPLE_PHASES = """\
## Phase-by-Phase Breakdown

### Phase 1: Opening & Rapport — 16/20

**Strengths:**
Built immediate trust with research-backed opener.

**Gaps:**
Missed chance to confirm attendees.

### Phase 2: Discovery & Pain Points — 14/20

**Strengths:**
Asked great open-ended questions.

**Gaps:**
Didn't quantify business impact.
"""

SAMPLE_COACHING_BOLD = """\
## Coaching Recommendations

**Priority 1 — HIGH: Improve Discovery Depth**
- **Area:** Discovery
- **Issue:** Surface-level questions
- **Impact:** Missing qualified opportunities
- **Action:** Use the 5-Whys technique

**Priority 2 — MEDIUM: Strengthen Close**
- **Area:** Close
- **Issue:** Weak next-step commitment
- **Impact:** Deals stalling
- **Action:** Always propose two concrete options
"""

SAMPLE_SENTIMENT = """\
## Sentiment Analysis

Overall trajectory: **Positive with mid-call dip**

**[05:30] — Engagement spike**
**[14:20] — Tension around pricing**
**[25:00] — Recovery after reframe**
"""


class TestGetKpiAliases:
    def test_includes_full_name_lowercase(self):
        aliases = get_kpi_aliases()
        assert aliases["talk-to-listen ratio"] == "Talk-to-Listen Ratio"

    def test_includes_short_name(self):
        aliases = get_kpi_aliases()
        assert aliases["talk:listen"] == "Talk-to-Listen Ratio"

    def test_bant_dash_alias(self):
        aliases = get_kpi_aliases()
        assert aliases["bant - budget"] == "BANT \u2014 Budget"


class TestParseScorecard:
    def test_parses_table_rows(self):
        result = parse_scorecard(SAMPLE_SCORECARD)
        assert len(result) == 3
        kpis = {r["kpi"] for r in result}
        assert "Talk-to-Listen Ratio" in kpis
        assert "Question Quality" in kpis

    def test_scores_parsed_correctly(self):
        result = parse_scorecard(SAMPLE_SCORECARD)
        by_kpi = {r["kpi"]: r for r in result}
        assert by_kpi["Talk-to-Listen Ratio"]["score"] == 4.0
        assert by_kpi["Question Quality"]["score"] == 3.5

    def test_empty_body_returns_empty(self):
        assert parse_scorecard("No scorecard here") == []


class TestParsePhases:
    def test_parses_two_phases(self):
        result = parse_phases(SAMPLE_PHASES)
        assert len(result) == 2

    def test_phase_fields(self):
        result = parse_phases(SAMPLE_PHASES)
        p1 = result[0]
        assert p1["number"] == 1
        assert p1["name"] == "Opening & Rapport"
        assert p1["score"] == 16
        assert p1["max"] == 20
        assert "trust" in p1["strengths"].lower()
        assert "attendees" in p1["gaps"].lower()

    def test_empty_body_returns_empty(self):
        assert parse_phases("Nothing here") == []


class TestParseCoaching:
    def test_parses_bold_format(self):
        result = parse_coaching(SAMPLE_COACHING_BOLD)
        assert len(result) == 2
        assert result[0]["priority"] == 1
        assert result[0]["level"] == "HIGH"
        assert "Discovery" in result[0]["area"]

    def test_extracts_action(self):
        result = parse_coaching(SAMPLE_COACHING_BOLD)
        assert "5-Whys" in result[0]["action"]

    def test_empty_body_returns_empty(self):
        assert parse_coaching("No coaching") == []


class TestParseSentiment:
    def test_extracts_trajectory(self):
        result = parse_sentiment(SAMPLE_SENTIMENT)
        assert "positive" in result["trajectory"].lower()

    def test_extracts_inflections(self):
        result = parse_sentiment(SAMPLE_SENTIMENT)
        assert len(result["inflections"]) == 3
        assert result["inflections"][0]["timestamp"] == "05:30"

    def test_empty_body_returns_empty(self):
        assert parse_sentiment("No sentiment") == {}
