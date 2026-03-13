"""Inngest function for durable analysis execution.

Replaces the BackgroundTasks-based _run_analysis_task with a step-based
workflow that supports retry, memoization, and observability.
"""

from datetime import datetime, timezone

import inngest
import structlog

from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.models.analysis_models import AnalysisResult
from api.services.analysis_service import render_analysis_markdown, run_analysis
from api.services.config_service import get_org_config
from api.utils.supabase_helpers import row_as_dict


def _build_analysis_update(result: AnalysisResult, body: str) -> dict:
    """Build the DB update dict from an AnalysisResult."""
    return {
        "status": "complete",
        "overall_score": result.overall_score,
        "rating": result.rating,
        "consultant_name": result.consultant_name,
        "prospect_name": result.prospect_name,
        "scorecard": [s.model_dump() for s in result.scorecard],
        "phases": [p.model_dump() for p in result.phases],
        "coaching": [c.model_dump() for c in result.coaching],
        "sentiment": result.sentiment.model_dump(),
        "body": body,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }


logger = structlog.get_logger()


def _on_analysis_failure(ctx: inngest.ContextSync) -> None:
    """Mark analysis as failed in DB after all retries are exhausted."""
    analysis_id = ctx.event.data.get("analysis_id")
    if not analysis_id:
        return
    try:
        db = get_supabase_client()
        db.table("analyses").update(
            {"status": "failed", "error_message": "Analysis failed after all retries"}
        ).eq("id", analysis_id).execute()
    except Exception:
        logger.exception("Failed to mark analysis %s as failed", analysis_id)


@inngest_client.create_function(
    fn_id="run-analysis",
    trigger=inngest.TriggerEvent(event="pitchparse/analysis.requested"),
    retries=3,
    on_failure=_on_analysis_failure,
)
def run_analysis_fn(ctx: inngest.ContextSync) -> dict:
    """Durable analysis workflow: fetch → analyze → parse → save."""
    analysis_id = str(ctx.event.data["analysis_id"])
    org_id = str(ctx.event.data["org_id"])
    transcript_id = str(ctx.event.data["transcript_id"])
    model = str(ctx.event.data.get("model", "")) or None
    focus_raw = ctx.event.data.get("focus")
    focus = str(focus_raw) if focus_raw is not None else None
    org_config_val = ctx.event.data.get("org_config")
    org_config_raw: dict | None = org_config_val if isinstance(org_config_val, dict) else None

    def set_processing_and_fetch_transcript() -> str:
        """Set analysis status to processing and fetch transcript in one step.

        Combined into a single Inngest step to reduce checkpoint overhead —
        both are independent DB calls that don't depend on each other.
        """
        db = get_supabase_client()
        db.table("analyses").update({"status": "processing"}).eq("id", analysis_id).execute()
        result = (
            db.table("transcripts")
            .select("body")
            .eq("id", transcript_id)
            .eq("org_id", org_id)
            .single()
            .execute()
        )
        return str(row_as_dict(result)["body"])

    transcript_body: str = ctx.step.run(
        "set_processing_and_fetch_transcript", set_processing_and_fetch_transcript
    )

    def call_claude() -> dict:
        settings = get_settings()
        config = get_org_config(org_config_raw)
        result: AnalysisResult = run_analysis(
            transcript_text=transcript_body,
            api_key=settings.anthropic_api_key,
            model=model,
            focus=focus,
            config=config,
        )
        return result.model_dump()

    analysis_data: dict = ctx.step.run("call_claude", call_claude)

    def save_results_and_increment_quota() -> None:
        """Save analysis results and increment org quota in one step.

        Combined into a single Inngest step to reduce checkpoint overhead —
        both are independent DB writes that don't depend on each other.
        """
        db = get_supabase_client()
        result = AnalysisResult(**analysis_data)
        body = render_analysis_markdown(result)
        update = _build_analysis_update(result, body)
        db.table("analyses").update(update).eq("id", analysis_id).execute()
        db.rpc("increment_analysis_count", {"org_id_param": org_id}).execute()

    ctx.step.run("save_results_and_increment_quota", save_results_and_increment_quota)

    ctx.step.send_event(
        "notify_complete",
        events=[
            inngest.Event(
                name="pitchparse/analysis.completed",
                data={"analysis_id": analysis_id, "org_id": org_id},
            )
        ],
    )

    return {"analysis_id": analysis_id, "status": "complete"}
