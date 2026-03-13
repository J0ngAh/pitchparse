"""Transcripts router — upload, list, transcribe audio, generate synthetic."""

from datetime import datetime, timezone

import inngest
from fastapi import APIRouter, HTTPException, UploadFile

from api.auth import CurrentUser
from api.config import get_settings
from api.database import get_supabase_client
from api.inngest.client import inngest_client
from api.models.schemas import (
    SyntheticGenerateRequest,
    TranscriptDetail,
    TranscriptResponse,
    TranscriptUpload,
)
from api.services.transcriber_service import transcribe_audio
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

router = APIRouter()


@router.get("", response_model=list[TranscriptResponse])
async def list_transcripts(user: CurrentUser):
    """List transcripts. Users see only their own; managers/admins see all org data."""
    db = get_supabase_client()
    query = (
        db.table("transcripts")
        .select("*, analyses(id)")
        .eq("org_id", user["org_id"])
        .order("created_at", desc=True)
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.execute()
    transcripts = []
    for row in rows_as_dicts(result):
        has_analysis = bool(row.pop("analyses", []))
        consultant_name = row.get("metadata", {}).get("consultant")
        transcripts.append(
            TranscriptResponse(
                id=row["id"],
                filename=row["filename"],
                source=row["source"],
                metadata=row["metadata"],
                consultant_name=consultant_name,
                created_at=row["created_at"],
                has_analysis=has_analysis,
            )
        )
    return transcripts


@router.get("/{transcript_id}", response_model=TranscriptDetail)
async def get_transcript(transcript_id: str, user: CurrentUser):
    """Get a single transcript with full body."""
    db = get_supabase_client()
    query = (
        db.table("transcripts")
        .select("*, analyses(id)")
        .eq("id", transcript_id)
        .eq("org_id", user["org_id"])
    )

    if user["role"] == "user":
        query = query.or_(f"created_by.eq.{user['user_id']},created_by.is.null")

    result = query.single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transcript not found")
    row = row_as_dict(result)
    has_analysis = bool(row.pop("analyses", []))
    consultant_name = row.get("metadata", {}).get("consultant")
    return TranscriptDetail(
        id=row["id"],
        filename=row["filename"],
        source=row["source"],
        metadata=row["metadata"],
        consultant_name=consultant_name,
        created_at=row["created_at"],
        has_analysis=has_analysis,
        body=row["body"],
    )


@router.post("", response_model=TranscriptResponse, status_code=201)
async def upload_transcript(req: TranscriptUpload, user: CurrentUser):
    """Upload a transcript (markdown text)."""
    db = get_supabase_client()

    # Ensure consultant exists if provided
    consultant_id = None
    if req.consultant_name:
        consultant_id = _ensure_consultant(db, user["org_id"], req.consultant_name)

    result = (
        db.table("transcripts")
        .insert(
            {
                "org_id": user["org_id"],
                "consultant_id": consultant_id,
                "filename": req.filename,
                "source": req.source,
                "metadata": req.metadata,
                "body": req.body,
                "created_by": user["user_id"],
            }
        )
        .execute()
    )

    row = rows_as_dicts(result)[0]
    return TranscriptResponse(
        id=row["id"],
        filename=row["filename"],
        source=row["source"],
        metadata=row["metadata"],
        consultant_name=req.consultant_name,
        created_at=row["created_at"],
    )


@router.post("/transcribe", response_model=TranscriptResponse, status_code=201)
async def transcribe_upload(file: UploadFile, user: CurrentUser):
    """Upload an audio file, transcribe via Deepgram, save as transcript."""
    settings = get_settings()
    if not settings.deepgram_api_key:
        raise HTTPException(status_code=400, detail="Deepgram API key not configured")

    file_bytes = await file.read()
    filename = file.filename or "audio.m4a"

    markdown, metadata = transcribe_audio(file_bytes, filename, settings.deepgram_api_key)

    db = get_supabase_client()
    result = (
        db.table("transcripts")
        .insert(
            {
                "org_id": user["org_id"],
                "filename": filename.rsplit(".", 1)[0] + ".md",
                "source": "recording",
                "metadata": metadata,
                "body": markdown,
                "created_by": user["user_id"],
            }
        )
        .execute()
    )

    row = rows_as_dicts(result)[0]
    return TranscriptResponse(
        id=row["id"],
        filename=row["filename"],
        source=row["source"],
        metadata=row["metadata"],
        created_at=row["created_at"],
    )


@router.post("/generate-synthetic", response_model=TranscriptResponse, status_code=201)
async def generate_synthetic_endpoint(
    req: SyntheticGenerateRequest,
    user: CurrentUser,
):
    """Start synthetic transcript generation via Inngest. Returns immediately."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    db = get_supabase_client()
    row = await _create_synthetic_and_dispatch(db, user, req)

    return TranscriptResponse(
        id=row["id"],
        filename=row["filename"],
        source=row["source"],
        metadata=row["metadata"],
        consultant_name=req.consultant_name,
        created_at=row["created_at"],
    )


async def _create_synthetic_and_dispatch(db, user: dict, req: SyntheticGenerateRequest) -> dict:
    """Create a placeholder transcript row and dispatch Inngest generation event."""
    consultant_id = None
    if req.consultant_name:
        consultant_id = _ensure_consultant(db, user["org_id"], req.consultant_name)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"synthetic-{req.quality}-{ts}.md"
    metadata = {
        "status": "pending",
        "quality": req.quality,
        "synthetic": True,
    }

    result = (
        db.table("transcripts")
        .insert(
            {
                "org_id": user["org_id"],
                "consultant_id": consultant_id,
                "filename": filename,
                "source": "synthetic",
                "metadata": metadata,
                "body": "",
                "created_by": user["user_id"],
            }
        )
        .execute()
    )
    row = rows_as_dicts(result)[0]
    await _dispatch_synthetic_event(db, user["org_id"], row, req)
    return row


async def _dispatch_synthetic_event(
    db, org_id: str, row: dict, req: SyntheticGenerateRequest
) -> None:
    """Fetch org config and send the synthetic generation event to Inngest."""
    org_result = db.table("organizations").select("config").eq("id", org_id).single().execute()
    org_config = row_as_dict(org_result).get("config") if org_result.data else None

    await inngest_client.send(
        inngest.Event(
            name="pitchparse/transcript.synthetic.requested",
            data={
                "transcript_id": str(row["id"]),
                "org_id": org_id,
                "quality": req.quality,
                "scenario": req.scenario,
                "consultant_name": req.consultant_name,
                "prospect_name": req.prospect_name,
                "model": req.model,
                "org_config": org_config,
            },
        )
    )


def _ensure_consultant(db, org_id: str, name: str) -> str:
    """Get or create a consultant by name within the org. Returns consultant ID."""
    result = db.table("consultants").select("id").eq("org_id", org_id).eq("name", name).execute()
    if result.data:
        return rows_as_dicts(result)[0]["id"]
    insert_result = (
        db.table("consultants")
        .insert(
            {
                "org_id": org_id,
                "name": name,
            }
        )
        .execute()
    )
    return rows_as_dicts(insert_result)[0]["id"]
