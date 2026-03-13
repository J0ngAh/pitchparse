"""Tests for api.services.config_service pure logic."""

import copy

from api.services.config_service import (
    DEFAULT_CONFIG,
    deep_merge,
    get_kpi_list,
    get_org_config,
    get_score_rating,
)


class TestDeepMerge:
    def test_flat_override_wins(self):
        base = {"a": 1, "b": 2}
        override = {"b": 99}
        result = deep_merge(base, override)
        assert result == {"a": 1, "b": 99}

    def test_nested_recursive_merge(self):
        base = {"x": {"a": 1, "b": 2}, "y": 3}
        override = {"x": {"b": 99, "c": 100}}
        result = deep_merge(base, override)
        assert result == {"x": {"a": 1, "b": 99, "c": 100}, "y": 3}

    def test_does_not_mutate_base(self):
        base = {"x": {"a": 1}}
        base_copy = copy.deepcopy(base)
        deep_merge(base, {"x": {"a": 99}})
        assert base == base_copy

    def test_override_replaces_non_dict_with_dict(self):
        base = {"a": 1}
        override = {"a": {"nested": True}}
        result = deep_merge(base, override)
        assert result == {"a": {"nested": True}}


class TestGetOrgConfig:
    def test_none_returns_defaults(self):
        result = get_org_config(None)
        assert result["branding"]["company_name"] == "PitchParse"
        # Should be a copy, not the same object
        assert result is not DEFAULT_CONFIG

    def test_merges_overrides(self):
        override = {"branding": {"company_name": "CustomCo"}}
        result = get_org_config(override)
        assert result["branding"]["company_name"] == "CustomCo"
        # Other defaults preserved
        assert result["branding"]["tagline"] == DEFAULT_CONFIG["branding"]["tagline"]


class TestGetKpiList:
    def test_default_returns_10_kpis(self):
        kpis = get_kpi_list()
        assert len(kpis) == 10
        assert "Talk-to-Listen Ratio" in kpis
        assert "BANT \u2014 Budget" in kpis


class TestGetScoreRating:
    def test_exceptional(self):
        assert get_score_rating(95) == "Exceptional"

    def test_good(self):
        assert get_score_rating(80) == "Good"

    def test_needs_improvement(self):
        assert get_score_rating(65) == "Needs Improvement"

    def test_poor(self):
        assert get_score_rating(45) == "Poor"

    def test_critical(self):
        assert get_score_rating(30) == "Critical"

    def test_boundary_exceptional(self):
        assert get_score_rating(90) == "Exceptional"

    def test_boundary_good(self):
        assert get_score_rating(75) == "Good"

    def test_boundary_needs_improvement(self):
        assert get_score_rating(60) == "Needs Improvement"

    def test_boundary_poor(self):
        assert get_score_rating(40) == "Poor"

    def test_custom_thresholds(self):
        config = copy.deepcopy(DEFAULT_CONFIG)
        config["scoring"]["thresholds"]["exceptional"] = 95
        assert get_score_rating(92, config) == "Good"
        assert get_score_rating(96, config) == "Exceptional"
