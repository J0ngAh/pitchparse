import api from "@/lib/api-client";
import type { OrgResponse } from "@/types/api";

export async function getOrgConfig(): Promise<OrgResponse> {
  return api.get("api/org/config").json<OrgResponse>();
}

export async function updateOrgConfig(config: Record<string, unknown>): Promise<OrgResponse> {
  return api.put("api/org/config", { json: { config } }).json<OrgResponse>();
}

export async function uploadLogo(file: File): Promise<{ logo_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("api/org/logo", { body: formData }).json<{ logo_url: string }>();
}

export async function removeLogo(): Promise<{ logo_url: null }> {
  return api.delete("api/org/logo").json<{ logo_url: null }>();
}
