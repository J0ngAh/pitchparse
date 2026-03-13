"""Inngest function for full pipeline orchestration.

Enables one-click "analyze + generate report" by chaining the analysis
and report Inngest functions via events.
"""

from datetime import timedelta

import inngest
import structlog

from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.utils.supabase_helpers import rows_as_dicts


def _build_report_event(report_id: str, analysis_id: str, org_id: str, model: str) -> inngest.Event:
    """Build an Inngest event for report generation."""
    return inngest.Event(
        name="pitchparse/report.requested",
        data={
            "report_id": report_id,
            "analysis_id": analysis_id,
            "org_id": org_id,
            "model": model,
        },
    )


logger = structlog.get_logger()


@inngest_client.create_function(
    fn_id="full-pipeline",
    trigger=inngest.TriggerEvent(event="pitchparse/pipeline.requested"),
    retries=2,
)
def full_pipeline_fn(ctx: inngest.ContextSync) -> dict:
    """Orchestrate analysis → report generation as a single workflow."""
    analysis_id = str(ctx.event.data["analysis_id"])
    org_id = str(ctx.event.data["org_id"])
    report_model = str(ctx.event.data.get("report_model", "claude-sonnet-4-6"))
    created_by = ctx.event.data.get("created_by")

    # Trigger analysis (already created as pending by the router)
    ctx.step.send_event(
        "trigger_analysis",
        events=[
            inngest.Event(
                name="pitchparse/analysis.requested",
                data=ctx.event.data,
            )
        ],
    )

    # Wait for analysis to complete
    analysis_done = ctx.step.wait_for_event(
        "wait_for_analysis",
        event="pitchparse/analysis.completed",
        timeout=timedelta(minutes=10),
        if_exp=f"event.data.analysis_id == '{analysis_id}'",
    )

    if not analysis_done:
        raise Exception(f"Analysis {analysis_id} timed out after 10 minutes")

    # Create pending report and trigger generation
    def create_report() -> dict:
        db = get_supabase_client()
        insert_data: dict = {
            "org_id": org_id,
            "analysis_id": analysis_id,
            "body": "",
            "metadata": {
                "status": "pending",
                "model": report_model,
            },
        }
        if created_by:
            insert_data["created_by"] = created_by
        result = db.table("reports").insert(insert_data).execute()
        return rows_as_dicts(result)[0]

    report: dict = ctx.step.run("create_report", create_report)

    ctx.step.send_event(
        "trigger_report",
        events=[_build_report_event(str(report["id"]), analysis_id, org_id, report_model)],
    )

    return {
        "analysis_id": analysis_id,
        "report_id": str(report["id"]),
        "status": "complete",
    }
