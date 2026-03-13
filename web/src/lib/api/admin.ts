import api from "@/lib/api-client";
import type {
  AdminOrgSummary,
  AdminStats,
  AnalysisResponse,
  TranscriptResponse,
  UserSummary,
} from "@/types/api";

export async function getAdminStats(): Promise<AdminStats> {
  return api.get("api/admin/stats").json<AdminStats>();
}

export async function getAdminOrgs(): Promise<AdminOrgSummary[]> {
  return api.get("api/admin/orgs").json<AdminOrgSummary[]>();
}

export async function getOrgUsers(orgId: string): Promise<UserSummary[]> {
  return api.get(`api/admin/orgs/${orgId}/users`).json<UserSummary[]>();
}

export async function getOrgTranscripts(orgId: string): Promise<TranscriptResponse[]> {
  return api.get(`api/admin/orgs/${orgId}/transcripts`).json<TranscriptResponse[]>();
}

export async function getOrgAnalyses(orgId: string): Promise<AnalysisResponse[]> {
  return api.get(`api/admin/orgs/${orgId}/analyses`).json<AnalysisResponse[]>();
}
