import api from "@/lib/api-client";
import type { OrgResponse } from "@/types/api";

export async function getOrgConfig(): Promise<OrgResponse> {
  return api.get("api/org/config").json<OrgResponse>();
}

export async function updateOrgConfig(config: Record<string, unknown>): Promise<OrgResponse> {
  return api.put("api/org/config", { json: { config } }).json<OrgResponse>();
}
