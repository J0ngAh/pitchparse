"""Configuration service — defaults and org config accessors."""

import copy
import time

DEFAULT_CONFIG: dict = {
    "branding": {
        "company_name": "Pitch|Parse",
        "tagline": "Every call, parsed. Every rep, sharper.",
        "page_title": "Pitch|Parse",
        "primary_color": "#0D9488",
        "logo_url": None,
    },
    "scoring": {
        "kpis": [
            {
                "name": "Talk-to-Listen Ratio",
                "short_name": "Talk:Listen",
                "weight": 10,
                "max_score": 5,
                "description": "Consultant vs prospect speaking ratio",
            },
            {
                "name": "Question Quality",
                "short_name": "Questions",
                "weight": 15,
                "max_score": 5,
                "description": "Open vs closed questions, follow-up depth",
            },
            {
                "name": "Pain Point Discovery",
                "short_name": "Pain Points",
                "weight": 15,
                "max_score": 5,
                "description": "Number and quality of pain points with business impact",
            },
            {
                "name": "BANT — Budget",
                "short_name": "Budget",
                "weight": 10,
                "max_score": 5,
                "description": "Budget range, timing, and approver identified",
            },
            {
                "name": "BANT — Authority",
                "short_name": "Authority",
                "weight": 10,
                "max_score": 5,
                "description": "Decision maker identified, buying process mapped",
            },
            {
                "name": "BANT — Need",
                "short_name": "Need",
                "weight": 10,
                "max_score": 5,
                "description": "Need confirmed and prioritized",
            },
            {
                "name": "BANT — Timeline",
                "short_name": "Timeline",
                "weight": 10,
                "max_score": 5,
                "description": "Timeline established with specific milestones",
            },
            {
                "name": "Objection Handling",
                "short_name": "Objections",
                "weight": 5,
                "max_score": 5,
                "description": "Objection acknowledgment and reframing quality",
            },
            {
                "name": "Personalization",
                "short_name": "Personal.",
                "weight": 5,
                "max_score": 5,
                "description": "Tailoring to prospect's specific context",
            },
            {
                "name": "Next Step Quality",
                "short_name": "Next Step",
                "weight": 10,
                "max_score": 5,
                "description": "Concrete, time-bound next action secured",
            },
        ],
        "thresholds": {
            "exceptional": 90,
            "good": 75,
            "needs_improvement": 60,
            "poor": 40,
        },
        "coaching_count": 3,
    },
    "call_structure": {
        "duration_minutes": 30,
        "phases": [
            {
                "number": 1,
                "name": "Opening & Rapport",
                "short_name": "Opening",
                "time_range": "0-3 min",
                "goal": "Build trust, set the agenda, confirm context",
                "max_score": 20,
            },
            {
                "number": 2,
                "name": "Discovery & Pain Points",
                "short_name": "Discovery",
                "time_range": "3-15 min",
                "goal": "Uncover genuine business pain",
                "max_score": 20,
            },
            {
                "number": 3,
                "name": "BANT Qualification",
                "short_name": "BANT",
                "time_range": "15-22 min",
                "goal": "Determine if prospect is a real opportunity",
                "max_score": 20,
            },
            {
                "number": 4,
                "name": "Solution Framing & Value Prop",
                "short_name": "Solution Framing",
                "time_range": "22-27 min",
                "goal": "Connect solution to discovered pain points",
                "max_score": 20,
            },
            {
                "number": 5,
                "name": "Close & Next Steps",
                "short_name": "Close",
                "time_range": "27-30 min",
                "goal": "Secure concrete, time-bound next action",
                "max_score": 20,
            },
        ],
    },
    "coaching": {
        "feedback_structure": None,
        "common_scenarios": None,
    },
}


# TTL cache for org configs (keyed by org_id, 5 min TTL)
_org_config_cache: dict[str, tuple[dict, float]] = {}
_ORG_CONFIG_TTL = 300  # 5 minutes


def get_cached_org_config(org_id: str, org_config_json: dict | None) -> dict:
    """Get org config with TTL caching. Falls back to defaults if no override."""
    now = time.monotonic()
    cached = _org_config_cache.get(org_id)
    if cached:
        config, cached_at = cached
        if (now - cached_at) < _ORG_CONFIG_TTL:
            return config

    config = get_org_config(org_config_json)
    _org_config_cache[org_id] = (config, now)
    return config


def invalidate_org_config_cache(org_id: str) -> None:
    """Invalidate cached config for an org (call on config update)."""
    _org_config_cache.pop(org_id, None)


def deep_merge(base: dict, override: dict) -> dict:
    result = copy.deepcopy(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = deep_merge(result[key], val)
        else:
            result[key] = copy.deepcopy(val)
    return result


def get_org_config(org_config_json: dict | None) -> dict:
    """Merge org config (from DB jsonb) with defaults."""
    if not org_config_json:
        return copy.deepcopy(DEFAULT_CONFIG)
    return deep_merge(DEFAULT_CONFIG, org_config_json)


def get_kpi_list(config: dict | None = None) -> list[str]:
    cfg = config or DEFAULT_CONFIG
    return [k["name"] for k in cfg["scoring"]["kpis"]]


def get_thresholds(config: dict | None = None) -> dict[str, int]:
    cfg = config or DEFAULT_CONFIG
    return cfg["scoring"]["thresholds"]


def get_score_rating(score: float, config: dict | None = None) -> str:
    t = get_thresholds(config)
    if score >= t["exceptional"]:
        return "Exceptional"
    elif score >= t["good"]:
        return "Good"
    elif score >= t["needs_improvement"]:
        return "Needs Improvement"
    elif score >= t["poor"]:
        return "Poor"
    else:
        return "Critical"
