import api from "@/lib/api-client";
import type {
  InvitationRequest,
  InvitationResponse,
  RoleUpdateRequest,
  UserSummary,
} from "@/types/api";

export async function getTeamMembers(): Promise<UserSummary[]> {
  return api.get("api/team/members").json<UserSummary[]>();
}

export async function inviteTeamMember(data: InvitationRequest): Promise<InvitationResponse> {
  return api.post("api/team/invite", { json: data }).json<InvitationResponse>();
}

export async function getTeamInvitations(): Promise<InvitationResponse[]> {
  return api.get("api/team/invitations").json<InvitationResponse[]>();
}

export async function revokeInvitation(id: string): Promise<void> {
  await api.delete(`api/team/invitations/${id}`);
}

export async function updateMemberRole(
  memberId: string,
  data: RoleUpdateRequest,
): Promise<UserSummary> {
  return api.patch(`api/team/members/${memberId}/role`, { json: data }).json<UserSummary>();
}

export async function removeMember(memberId: string): Promise<void> {
  await api.delete(`api/team/members/${memberId}`);
}
