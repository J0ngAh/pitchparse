"""Inngest function for durable report generation.

Replaces the BackgroundTasks-based _run_report_task with a step-based
workflow that supports retry, memoization, and observability.
"""

import re

import inngest
import structlog

from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.services.analysis_service import run_report_generation
from api.utils.supabase_helpers import row_as_dict

logger = structlog.get_logger()


def _on_report_failure(ctx: inngest.ContextSync) -> None:
    """Mark report as failed in DB after all retries are exhausted."""
    report_id = ctx.event.data.get("report_id")
    if not report_id:
        return
    try:
        db = get_supabase_client()
        db.table("reports").update(
            {
                "metadata": {
                    "status": "failed",
                    "error": "Report generation failed after all retries",
                }
            }
        ).eq("id", report_id).execute()
    except Exception:
        logger.exception("Failed to mark report %s as failed", report_id)


def _extract_html_meta(html: str) -> dict:
    """Extract <meta> tags from generated HTML report."""
    meta: dict = {}
    for m in re.finditer(r'<meta\s+name="([^"]+)"\s+content="([^"]*)"', html):
        key = m.group(1)
        value = m.group(2)
        if key == "overall_score":
            try:
                meta[key] = int(value)
            except ValueError:
                meta[key] = value
        else:
            meta[key] = value
    return meta


@inngest_client.create_function(
    fn_id="generate-report",
    trigger=inngest.TriggerEvent(event="pitchparse/report.requested"),
    retries=3,
    on_failure=_on_report_failure,
)
def generate_report_fn(ctx: inngest.ContextSync) -> dict:
    """Durable report generation: fetch analysis → call Claude → save."""
    report_id = str(ctx.event.data["report_id"])
    analysis_id = str(ctx.event.data["analysis_id"])
    org_id = str(ctx.event.data["org_id"])
    model = str(ctx.event.data.get("model", "")) or get_settings().claude_model

    def fetch_analysis() -> dict:
        db = get_supabase_client()
        result = (
            db.table("analyses")
            .select("body, consultant_name, prospect_name, overall_score, rating")
            .eq("id", analysis_id)
            .eq("org_id", org_id)
            .single()
            .execute()
        )
        return row_as_dict(result)

    analysis: dict = ctx.step.run("fetch_analysis", fetch_analysis)

    def call_claude() -> str:
        from api.services.config_service import get_org_config

        settings = get_settings()

        # Fetch org config for branding injection into reports
        db2 = get_supabase_client()
        org_result = db2.table("organizations").select("config").eq("id", org_id).single().execute()
        org_config_json = row_as_dict(org_result).get("config")
        config = get_org_config(org_config_json)
        branding = config.get("branding")

        return run_report_generation(
            analysis_text=analysis["body"],
            api_key=settings.anthropic_api_key,
            model=model,
            org_id=org_id,
            branding=branding,
        )

    html_content: str = ctx.step.run("call_claude", call_claude)

    def save_report() -> None:
        db = get_supabase_client()
        html_meta = _extract_html_meta(html_content)
        metadata = {
            "status": "complete",
            "model": model,
            "consultant": analysis.get("consultant_name", ""),
            "prospect": analysis.get("prospect_name", ""),
            "overall_score": analysis.get("overall_score", 0),
            "rating": analysis.get("rating", ""),
            **html_meta,
        }
        db.table("reports").update({"body": html_content, "metadata": metadata}).eq(
            "id", report_id
        ).execute()

    ctx.step.run("save_report", save_report)

    return {"report_id": report_id, "status": "complete"}
