// TypeScript interfaces mirroring api/models/schemas.py

// ---------- Auth ----------

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  org_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user_id: string;
  org_id: string;
  email: string;
  role: string;
}

export type UserRole = "user" | "manager" | "admin";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface InvitationRequest {
  email: string;
  role: "user" | "manager";
}

export interface InvitationResponse {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface RoleUpdateRequest {
  role: UserRole;
}

export interface AdminOrgSummary {
  id: string;
  name: string;
  plan: string;
  analysis_quota: number;
  analysis_count: number;
  user_count: number;
  created_at: string;
}

export interface AdminStats {
  total_orgs: number;
  total_users: number;
  total_analyses: number;
  total_transcripts: number;
}

export interface DashboardStats {
  total_calls: number;
  avg_score: number;
  below_60: number;
  score_distribution: Array<{ range: string; count: number }>;
}

// ---------- Organizations ----------

export interface OrgConfigUpdate {
  config: Record<string, unknown>;
}

export interface OrgResponse {
  id: string;
  name: string;
  config: Record<string, unknown>;
  plan: string;
  analysis_quota: number;
  analysis_count: number;
}

// ---------- Transcripts ----------

export interface TranscriptUpload {
  filename: string;
  body: string;
  source?: string;
  metadata?: Record<string, unknown>;
  consultant_name?: string | null;
}

export interface TranscriptResponse {
  id: string;
  filename: string;
  source: string;
  metadata: Record<string, unknown>;
  consultant_name: string | null;
  created_at: string;
  has_analysis: boolean;
}

export interface TranscriptDetail extends TranscriptResponse {
  body: string;
}

// ---------- Analyses ----------

export interface AnalysisRunRequest {
  transcript_id: string;
  model?: string;
  focus?: string | null;
}

export interface AnalysisResponse {
  id: string;
  transcript_id: string;
  status: string;
  overall_score: number | null;
  rating: string | null;
  consultant_name: string | null;
  prospect_name: string | null;
  model_used: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScorecardEntry {
  score: number;
  evidence: string;
}

export interface PhaseEntry {
  number: number;
  name: string;
  score: number;
  max: number;
  timestamps?: string;
  strengths?: string;
  gaps?: string;
}

export interface CoachingEntry {
  priority: number;
  level?: string;
  title?: string;
  issue?: string;
  impact?: string;
  action?: string;
  example?: string;
  drill?: string;
}

export interface SentimentData {
  trajectory?: string;
  inflections?: Array<{ timestamp: string; label: string }>;
  raw?: string;
}

export interface AnalysisDetail extends AnalysisResponse {
  scorecard: Record<string, ScorecardEntry> | null;
  phases: PhaseEntry[] | null;
  coaching: CoachingEntry[] | null;
  sentiment: SentimentData | null;
  body: string | null;
}

// ---------- Reports ----------

export interface ReportGenerateRequest {
  analysis_id: string;
  model?: string;
}

export interface ReportResponse {
  id: string;
  analysis_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReportDetail extends ReportResponse {
  body: string;
}

// ---------- Billing ----------

export interface CheckoutRequest {
  plan: "starter" | "team";
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface SubscriptionResponse {
  plan: string;
  status: string;
  analysis_quota: number;
  analysis_count: number;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

// ---------- Config ----------

export interface KpiConfig {
  name: string;
  short_name: string;
  weight: number;
  max_score: number;
  description: string;
}

export interface PhaseConfig {
  number: number;
  name: string;
  short_name: string;
  time_range: string;
  goal: string;
  max_score: number;
}

// ---------- Coaching Chat ----------

export interface ConversationResponse {
  id: string;
  analysis_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ConversationDetail extends ConversationResponse {
  messages: MessageResponse[];
}

export interface ChatMessageRequest {
  content: string;
}

// ---------- Config ----------

// ---------- Prompt Templates ----------

export interface PromptTemplateResponse {
  id: string;
  org_id: string | null;
  slug: string;
  version: number;
  body: string;
  created_by: string | null;
  created_at: string;
  is_default: boolean;
}

export interface PromptTemplateCreate {
  body: string;
}

export interface PromptRevertRequest {
  version: number;
}

export interface AppConfig {
  branding: {
    company_name: string;
    tagline: string;
    page_title: string;
    primary_color: string;
    logo_url: string | null;
  };
  scoring: {
    kpis: KpiConfig[];
    thresholds: {
      exceptional: number;
      good: number;
      needs_improvement: number;
      poor: number;
    };
    coaching_count: number;
  };
  call_structure: {
    duration_minutes: number;
    phases: PhaseConfig[];
  };
  coaching: {
    feedback_structure: unknown;
    common_scenarios: unknown;
  };
}
