"""Coach router — interactive coaching chat with SSE streaming."""

import json

import structlog
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.auth import CurrentUser
from api.config import get_settings
from api.database import get_supabase_client
from api.models.schemas import (
    ChatMessageRequest,
    ConversationCreateRequest,
    ConversationDetail,
    ConversationResponse,
)
from api.services.coach_service import (
    CoachDeps,
    _build_analysis_context,
    build_coach_agent,
    get_default_coach_prompt,
    stream_coach_response,
)
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

logger = structlog.get_logger()

router = APIRouter()


class CoachPromptResponse(BaseModel):
    prompt: str
    is_custom: bool


class CoachPromptUpdateRequest(BaseModel):
    prompt: str | None = Field(
        default=None,
        max_length=20000,
        description="Custom coach prompt. Set to null to reset to default.",
    )


@router.get(
    "/prompt",
    response_model=CoachPromptResponse,
    summary="Get the org's coach system prompt",
)
async def get_coach_prompt(user: CurrentUser):
    """Get the current coach prompt for this org. Returns default if none set."""
    db = get_supabase_client()
    result = (
        db.table("organizations").select("coach_prompt").eq("id", user["org_id"]).single().execute()
    )
    custom = row_as_dict(result).get("coach_prompt") if result.data else None
    return CoachPromptResponse(
        prompt=custom or get_default_coach_prompt(),
        is_custom=custom is not None,
    )


@router.put(
    "/prompt",
    response_model=CoachPromptResponse,
    summary="Update the org's coach system prompt",
)
async def update_coach_prompt(req: CoachPromptUpdateRequest, user: CurrentUser):
    """Set a custom coach prompt for this org, or reset to default."""
    db = get_supabase_client()
    db.table("organizations").update({"coach_prompt": req.prompt}).eq(
        "id", user["org_id"]
    ).execute()

    return CoachPromptResponse(
        prompt=req.prompt or get_default_coach_prompt(),
        is_custom=req.prompt is not None,
    )


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a coaching conversation",
)
async def create_conversation(
    req: ConversationCreateRequest,
    user: CurrentUser,
):
    """Create a new coaching conversation, optionally tied to an analysis."""
    db = get_supabase_client()

    title = "General Coaching"
    if req.analysis_id:
        # Verify analysis belongs to this org
        analysis_result = (
            db.table("analyses")
            .select("id, consultant_name, prospect_name")
            .eq("id", req.analysis_id)
            .eq("org_id", user["org_id"])
            .single()
            .execute()
        )
        if not analysis_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found",
            )
        row = row_as_dict(analysis_result)
        consultant = row.get("consultant_name", "Unknown")
        prospect = row.get("prospect_name", "Unknown")
        title = f"Coaching: {consultant} → {prospect}"

    result = (
        db.table("conversations")
        .insert(
            {
                "org_id": user["org_id"],
                "user_id": user["user_id"],
                "analysis_id": req.analysis_id,
                "title": title,
            }
        )
        .execute()
    )
    return ConversationResponse(**rows_as_dicts(result)[0])


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
    summary="List coaching conversations",
)
async def list_conversations(user: CurrentUser):
    """List all conversations for the current user."""
    db = get_supabase_client()
    result = (
        db.table("conversations")
        .select("*")
        .eq("org_id", user["org_id"])
        .eq("user_id", user["user_id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return [ConversationResponse(**row) for row in rows_as_dicts(result)]


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Get conversation with messages",
)
async def get_conversation(conversation_id: str, user: CurrentUser):
    """Get a conversation and its full message history."""
    db = get_supabase_client()

    conv_result = (
        db.table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("org_id", user["org_id"])
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not conv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    msg_result = (
        db.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )

    conv_data = row_as_dict(conv_result)
    conv_data["messages"] = rows_as_dicts(msg_result)
    return ConversationDetail(**conv_data)


@router.post(
    "/conversations/{conversation_id}/messages",
    summary="Send message and stream coach response",
)
async def send_message(
    conversation_id: str,
    req: ChatMessageRequest,
    user: CurrentUser,
):
    """Send a user message and stream the coach's response via SSE."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anthropic API key not configured",
        )

    db = get_supabase_client()

    # Verify conversation ownership
    conv_result = (
        db.table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("org_id", user["org_id"])
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not conv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    conv = row_as_dict(conv_result)

    # Save user message
    db.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "role": "user",
            "content": req.content,
        }
    ).execute()

    # Load conversation history
    msg_result = (
        db.table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    history = rows_as_dicts(msg_result)
    # Exclude the just-inserted user message from history (it's the current prompt)
    history = history[:-1]

    # Load analysis context if scoped
    analysis_context = None
    if conv.get("analysis_id"):
        analysis_result = (
            db.table("analyses")
            .select("*")
            .eq("id", conv["analysis_id"])
            .eq("org_id", user["org_id"])
            .single()
            .execute()
        )
        if analysis_result.data:
            analysis_context = _build_analysis_context(row_as_dict(analysis_result))

    deps = CoachDeps(
        org_id=user["org_id"],
        user_id=user["user_id"],
        user_role=user["role"],
        db=db,
        analysis_id=conv.get("analysis_id"),
        analysis_context=analysis_context,
    )

    # Load org-specific coach prompt if set
    org_result = (
        db.table("organizations").select("coach_prompt").eq("id", user["org_id"]).single().execute()
    )
    custom_prompt = row_as_dict(org_result).get("coach_prompt") if org_result.data else None

    agent = build_coach_agent(settings.anthropic_api_key, custom_prompt=custom_prompt)

    async def event_stream():
        full_response = []
        try:
            async for delta in stream_coach_response(
                user_message=req.content,
                history=history,
                deps=deps,
                agent=agent,
            ):
                full_response.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"

            # Save complete assistant message
            assistant_content = "".join(full_response)
            msg_insert = (
                db.table("messages")
                .insert(
                    {
                        "conversation_id": conversation_id,
                        "role": "assistant",
                        "content": assistant_content,
                    }
                )
                .execute()
            )
            saved_msg = rows_as_dicts(msg_insert)[0]

            # Update conversation timestamp
            db.table("conversations").update({"updated_at": "now()"}).eq(
                "id", conversation_id
            ).execute()

            yield f"data: {json.dumps({'done': True, 'message_id': saved_msg['id']})}\n\n"
        except Exception as e:
            logger.error(
                "coach_stream_error",
                conversation_id=conversation_id,
                error=str(e),
            )
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
async def delete_conversation(conversation_id: str, user: CurrentUser):
    """Delete a conversation and all its messages."""
    db = get_supabase_client()

    # Verify ownership
    conv_result = (
        db.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("org_id", user["org_id"])
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not conv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Messages cascade-deleted via FK
    db.table("conversations").delete().eq("id", conversation_id).execute()
