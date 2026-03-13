"""Inngest function for durable synthetic transcript generation.

Generates a synthetic sales call transcript via Claude as a background
job with retry and status tracking via transcript metadata.
"""

import re

import inngest
import structlog

from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.services.synthetic_service import generate_synthetic


def _extract_consultant_metadata(
    generated_text: str, consultant_name: str | None, quality: str
) -> dict:
    """Extract consultant name from frontmatter and build transcript metadata."""
    extracted_consultant = consultant_name
    if not extracted_consultant:
        m = re.search(r"^consultant:\s*(.+)$", generated_text, re.MULTILINE)
        if m:
            extracted_consultant = m.group(1).strip()

    metadata: dict = {
        "status": "complete",
        "quality": quality,
        "synthetic": True,
    }
    if extracted_consultant:
        metadata["consultant"] = extracted_consultant
    return metadata


logger = structlog.get_logger()


def _on_synthetic_failure(ctx: inngest.ContextSync) -> None:
    """Mark transcript as failed in DB after all retries are exhausted."""
    transcript_id = ctx.event.data.get("transcript_id")
    if not transcript_id:
        return
    try:
        db = get_supabase_client()
        db.table("transcripts").update(
            {
                "metadata": {
                    "status": "failed",
                    "error": "Synthetic generation failed after all retries",
                    "synthetic": True,
                }
            }
        ).eq("id", transcript_id).execute()
    except Exception:
        logger.exception("Failed to mark transcript %s as failed", transcript_id)


@inngest_client.create_function(
    fn_id="generate-synthetic",
    trigger=inngest.TriggerEvent(event="pitchparse/transcript.synthetic.requested"),
    retries=2,
    on_failure=_on_synthetic_failure,
)
def generate_synthetic_fn(ctx: inngest.ContextSync) -> dict:
    """Durable synthetic generation: call Claude → save transcript."""
    transcript_id = str(ctx.event.data["transcript_id"])
    quality = str(ctx.event.data.get("quality", "random"))
    scenario_raw = ctx.event.data.get("scenario")
    scenario = str(scenario_raw) if scenario_raw is not None else None
    consultant_raw = ctx.event.data.get("consultant_name")
    consultant_name = str(consultant_raw) if consultant_raw is not None else None
    prospect_raw = ctx.event.data.get("prospect_name")
    prospect_name = str(prospect_raw) if prospect_raw is not None else None
    model = str(ctx.event.data.get("model", "claude-sonnet-4-6"))
    org_config_val = ctx.event.data.get("org_config")
    org_config_raw: dict | None = org_config_val if isinstance(org_config_val, dict) else None

    def set_processing() -> None:
        db = get_supabase_client()
        db.table("transcripts").update(
            {
                "metadata": {
                    "status": "processing",
                    "quality": quality,
                    "synthetic": True,
                }
            }
        ).eq("id", transcript_id).execute()

    ctx.step.run("set_processing", set_processing)

    def call_claude() -> str:
        settings = get_settings()
        from api.services.config_service import get_org_config

        config = get_org_config(org_config_raw)
        return generate_synthetic(
            api_key=settings.anthropic_api_key,
            quality=quality,
            scenario=scenario,
            consultant_name=consultant_name,
            prospect_name=prospect_name,
            model=model,
            config=config,
        )

    generated_text: str = ctx.step.run("call_claude", call_claude)

    def save_transcript() -> None:
        db = get_supabase_client()
        metadata = _extract_consultant_metadata(generated_text, consultant_name, quality)
        update_data: dict = {"body": generated_text, "metadata": metadata}
        db.table("transcripts").update(update_data).eq("id", transcript_id).execute()

    ctx.step.run("save_transcript", save_transcript)

    return {"transcript_id": transcript_id, "status": "complete"}
