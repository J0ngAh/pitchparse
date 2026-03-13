"""Parser service — extract structured data from analysis markdown.

DEPRECATED: This module is superseded by PydanticAI structured output
(api.models.analysis_models + api.services.analysis_service.run_analysis).
Kept only for api.scripts.migrate_files_to_supabase compatibility with
legacy markdown files. Do not use for new code paths.

Reuses the same regex logic from the Streamlit app's parser.py,
but without Streamlit dependencies. Used to parse Claude's markdown
output into structured JSON for database storage.
"""

import re

from api.services.config_service import DEFAULT_CONFIG, get_kpi_list


def get_kpi_aliases(config: dict | None = None) -> dict[str, str]:
    cfg = config or DEFAULT_CONFIG
    aliases: dict[str, str] = {}
    for kpi in cfg["scoring"]["kpis"]:
        name = kpi["name"]
        aliases[name.lower()] = name
        short = kpi.get("short_name", "")
        if short:
            aliases[short.lower()] = name
        if "\u2014" in name:
            aliases[name.replace("\u2014", "-").lower()] = name
            aliases[name.replace("\u2014", " - ").lower()] = name
    aliases["personalization & preparation"] = "Personalization"
    return aliases


def _extract_section(body: str, heading: str) -> str | None:
    pattern = re.compile(
        rf"^##\s+(?:\d+\.\s+)?{re.escape(heading)}\s*\n(.*?)(?=^##\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(body)
    return m.group(1) if m else None


def _extract_subsection(content: str, heading: str) -> str | None:
    pattern = re.compile(
        rf"\*\*{re.escape(heading)}(?::\s*)?\*\*\s*\n" r"(.*?)(?=\*\*[A-Z]|\n---|\n###|\Z)",
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(content)
    return m.group(1).strip() if m else None


def _extract_field(content: str, field_name: str) -> str:
    pattern = re.compile(
        rf"(?:^|\n)\s*(?:-\s*)?\*\*{re.escape(field_name)}:\*\*\s*(.*?)"
        r"(?=\n\s*(?:-\s*)?\*\*[A-Z]|\n\s*$|\Z)",
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(content)
    return m.group(1).strip() if m else ""


def _parse_table_rows(
    section: str, aliases: dict[str, str], kpi_list: list[str], scorecard: dict[str, dict]
) -> None:
    """Parse scorecard table rows into the scorecard dict."""
    row_re = re.compile(r"^\|\s*(.+?)\s*\|\s*([\d./]+)\s*\|\s*(.*?)\s*\|", re.MULTILINE)
    for m in row_re.finditer(section):
        raw_kpi = m.group(1).replace("**", "").strip()
        raw_score = m.group(2).strip()
        evidence = m.group(3).strip()
        if raw_kpi.startswith("-") or raw_kpi.lower() == "kpi":
            continue
        if "%" in raw_kpi or raw_kpi.lower() in ("total", "component"):
            continue
        kpi = aliases.get(raw_kpi.lower(), raw_kpi)
        if kpi not in kpi_list:
            continue
        if "/" in raw_score:
            raw_score = raw_score.split("/")[0]
        try:
            score = float(raw_score)
        except ValueError:
            continue
        if kpi not in scorecard:
            scorecard[kpi] = {"kpi": kpi, "score": score, "evidence": evidence}


def _parse_subsection_scores(
    body: str, aliases: dict[str, str], kpi_list: list[str], scorecard: dict[str, dict]
) -> None:
    """Parse subsection heading scores and BANT sub-items into scorecard."""
    subsection_re = re.compile(
        r"###\s+[\d.]+\s+(.+?)\s*[-\u2014]+\s*(\d+(?:\.\d+)?)/(\d+)",
        re.MULTILINE,
    )
    for m in subsection_re.finditer(body):
        raw_kpi = m.group(1).strip()
        raw_score, max_score = float(m.group(2)), float(m.group(3))
        kpi = aliases.get(raw_kpi.lower(), raw_kpi)
        if kpi in kpi_list and kpi not in scorecard:
            score = raw_score if max_score == 5 else (raw_score / max_score) * 5
            scorecard[kpi] = {"kpi": kpi, "score": score, "evidence": ""}

    bant_sub_re = re.compile(
        r"####\s+(Budget|Authority|Need|Timeline)"
        r"(?::\s*|\s*[-\u2014]+\s*)(\d+(?:\.\d+)?)/(\d+)",
        re.MULTILINE,
    )
    for m in bant_sub_re.finditer(body):
        bant_name = f"BANT \u2014 {m.group(1)}"
        raw_score, max_score = float(m.group(2)), float(m.group(3))
        score = raw_score if max_score == 5 else (raw_score / max_score) * 5
        if bant_name not in scorecard:
            scorecard[bant_name] = {"kpi": bant_name, "score": score, "evidence": ""}


def parse_scorecard(body: str, config: dict | None = None) -> list[dict]:
    """Parse scorecard into [{kpi, score, evidence}] for DB storage."""
    aliases = get_kpi_aliases(config)
    kpi_list = get_kpi_list(config)
    scorecard: dict[str, dict] = {}

    section = _extract_section(body, "Scorecard")
    if section:
        _parse_table_rows(section, aliases, kpi_list, scorecard)

    _parse_subsection_scores(body, aliases, kpi_list, scorecard)

    return list(scorecard.values())


def parse_phases(body: str, config: dict | None = None) -> list[dict]:
    """Parse phase breakdown into [{number, name, score, max, strengths, gaps}]."""
    section = _extract_section(body, "Phase-by-Phase Breakdown")
    if not section:
        return []

    phases = []
    phase_re = re.compile(
        r"###\s+Phase\s+(\d+):\s+(.+?)"
        r"(?:\s*[\[(]([^\])\n]+)[\])]?)?"
        r"\s*(?:[-\u2014]+\s*(\d+)/(\d+))?\s*\n",
        re.IGNORECASE,
    )
    splits = list(phase_re.finditer(section))
    for i, m in enumerate(splits):
        start = m.end()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(section)
        content = section[start:end]
        if m.group(4):
            score, max_score = int(m.group(4)), int(m.group(5))
        else:
            score_m = re.search(r"\*\*Score:\s*(\d+)/(\d+)\*\*", content)
            score = int(score_m.group(1)) if score_m else 0
            max_score = int(score_m.group(2)) if score_m else 20

        strengths = (
            _extract_subsection(content, "Strengths")
            or _extract_subsection(content, "What you did well")
            or ""
        )
        gaps = (
            _extract_subsection(content, "Gaps")
            or _extract_subsection(content, "What went wrong")
            or ""
        )
        phases.append(
            {
                "number": int(m.group(1)),
                "name": m.group(2).strip(),
                "score": score,
                "max": max_score,
                "strengths": strengths,
                "gaps": gaps,
            }
        )

    phases.sort(key=lambda p: p["number"])
    return phases


def _build_rec(priority: int, level: str, title: str, content: str) -> dict:
    """Build a coaching recommendation dict from parsed components."""
    return {
        "priority": priority,
        "level": level or ("HIGH" if priority <= 2 else "MEDIUM"),
        "title": title,
        "area": _extract_field(content, "Area"),
        "issue": _extract_field(content, "Issue"),
        "impact": _extract_field(content, "Impact"),
        "action": _extract_field(content, "Action"),
    }


def _parse_bold_coaching(section: str) -> list[dict]:
    """Parse coaching in bold format: **Priority N -- LEVEL: Title**."""
    prio_re = re.compile(
        r"\*\*Priority\s+(\d+)(?:\s*[-\u2014:]+\s*(HIGH|MEDIUM|LOW))?"
        r"\s*[-\u2014:]*\s*(.+?)\*\*",
        re.IGNORECASE,
    )
    splits = list(prio_re.finditer(section))
    recs = []
    for i, m in enumerate(splits):
        end = splits[i + 1].start() if i + 1 < len(splits) else len(section)
        content = section[m.end() : end]
        level = (m.group(2) or "").upper()
        recs.append(_build_rec(int(m.group(1)), level, m.group(3).strip().rstrip("*"), content))
    return recs


def _parse_heading_coaching(section: str) -> list[dict]:
    """Parse coaching in heading format: ### Priority N: Title."""
    heading_re = re.compile(
        r"###\s+Priority\s+(\d+):\s*(.+?)" r"(?:\s*[-\u2014]+\s*(HIGH|MEDIUM|LOW))?\s*$",
        re.MULTILINE | re.IGNORECASE,
    )
    splits = list(heading_re.finditer(section))
    recs = []
    for i, m in enumerate(splits):
        end = splits[i + 1].start() if i + 1 < len(splits) else len(section)
        content = section[m.end() : end]
        level = (m.group(3) or "").upper()
        recs.append(_build_rec(int(m.group(1)), level, m.group(2).strip(), content))
    return recs


def parse_coaching(body: str) -> list[dict]:
    """Parse coaching recommendations into structured list."""
    section = _extract_section(body, "Coaching Recommendations")
    if not section:
        section = _extract_section(body, "8. Coaching Recommendations")
    if not section:
        return []

    recs = _parse_bold_coaching(section)
    if not recs:
        recs = _parse_heading_coaching(section)

    recs.sort(key=lambda r: r["priority"])
    return recs


def parse_sentiment(body: str) -> dict:
    """Parse sentiment section into structured dict."""
    section = _extract_section(body, "Sentiment Analysis")
    if not section:
        return {}
    result: dict = {"raw": section.strip()}
    traj_m = re.search(r"Overall trajectory:\s*\*?\*?(.+?)(?:\*\*|\.|—)", section)
    if traj_m:
        result["trajectory"] = traj_m.group(1).strip().rstrip(".*")
    inflections = []
    infl_re = re.compile(r"\*\*\[(\d+:\d+)\]\s*[-\u2014]*\s*(.+?)\*\*", re.IGNORECASE)
    for m in infl_re.finditer(section):
        inflections.append(
            {
                "timestamp": m.group(1),
                "label": m.group(2).strip().rstrip(".*"),
            }
        )
    result["inflections"] = inflections
    return result
