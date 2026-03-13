"""Pydantic models for API request/response schemas."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---------- Auth ----------


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str
    org_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    org_id: str
    email: str
    role: str = "user"


# ---------- Organizations ----------


class OrgConfigUpdate(BaseModel):
    config: dict[str, Any]


class OrgResponse(BaseModel):
    id: UUID
    name: str
    config: dict[str, Any]
    plan: str
    analysis_quota: int
    analysis_count: int


# ---------- Transcripts ----------


class TranscriptUpload(BaseModel):
    filename: str
    body: str
    source: str = "upload"
    metadata: dict[str, Any] = Field(default_factory=dict)
    consultant_name: str | None = None


class TranscribeRequest(BaseModel):
    transcript_id: str
    # audio file sent as multipart form data


class TranscriptResponse(BaseModel):
    id: UUID
    filename: str
    source: str
    metadata: dict[str, Any]
    consultant_name: str | None = None
    created_at: datetime
    has_analysis: bool = False

    model_config = ConfigDict(from_attributes=True)


class TranscriptDetail(TranscriptResponse):
    body: str


# ---------- Analyses ----------


class AnalysisRunRequest(BaseModel):
    transcript_id: str
    model: str = "claude-sonnet-4-6"
    focus: str | None = None
    generate_report: bool = False


class AnalysisResponse(BaseModel):
    id: UUID
    transcript_id: UUID
    status: str
    overall_score: int | None = None
    rating: str | None = None
    consultant_name: str | None = None
    prospect_name: str | None = None
    model_used: str | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AnalysisDetail(AnalysisResponse):
    scorecard: list[dict[str, Any]] | None = None
    phases: list[dict[str, Any]] | None = None
    coaching: list[dict[str, Any]] | None = None
    sentiment: dict[str, Any] | None = None
    body: str | None = None


# ---------- Reports ----------


class ReportGenerateRequest(BaseModel):
    analysis_id: str
    model: str = "claude-sonnet-4-6"


class ReportResponse(BaseModel):
    id: UUID
    analysis_id: UUID
    metadata: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportDetail(ReportResponse):
    body: str


# ---------- Synthetic Generation ----------


class SyntheticGenerateRequest(BaseModel):
    quality: str = "random"  # excellent|good|poor|terrible|random
    scenario: str | None = None
    consultant_name: str | None = None
    prospect_name: str | None = None
    model: str = "claude-sonnet-4-6"


# ---------- Billing ----------


class CheckoutRequest(BaseModel):
    plan: Literal["starter", "team"]
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    analysis_quota: int
    analysis_count: int
    current_period_end: datetime | None = None
    trial_ends_at: datetime | None = None


# ---------- Team / Invitations ----------


class InvitationRequest(BaseModel):
    email: EmailStr
    role: Literal["user", "manager"] = "user"


class InvitationResponse(BaseModel):
    id: UUID
    org_id: UUID
    email: str
    role: str
    invited_by: UUID | None = None
    status: str
    created_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSummary(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleUpdateRequest(BaseModel):
    role: Literal["user", "manager", "admin"]


# ---------- Admin ----------


class AdminOrgSummary(BaseModel):
    id: UUID
    name: str
    plan: str
    analysis_quota: int
    analysis_count: int
    user_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminStats(BaseModel):
    total_orgs: int = 0
    total_users: int = 0
    total_analyses: int = 0
    total_transcripts: int = 0


# ---------- Dashboard Stats ----------


class DashboardStats(BaseModel):
    total_calls: int = 0
    avg_score: int = 0
    below_60: int = 0
    score_distribution: list[dict[str, Any]] = Field(default_factory=list)


# ---------- Coaching Chat ----------


class ConversationCreateRequest(BaseModel):
    analysis_id: str | None = None


class ConversationResponse(BaseModel):
    id: UUID
    analysis_id: UUID | None = None
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(ConversationResponse):
    messages: list[MessageResponse] = Field(default_factory=list)


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


# ---------- Prompt Templates ----------


class PromptTemplateResponse(BaseModel):
    id: UUID
    org_id: UUID | None = None
    slug: str
    version: int
    body: str
    created_by: UUID | None = None
    created_at: datetime
    is_default: bool = False

    model_config = ConfigDict(from_attributes=True)


class PromptTemplateCreate(BaseModel):
    body: str = Field(min_length=1, max_length=50000)


class PromptRevertRequest(BaseModel):
    version: int = Field(ge=1)
