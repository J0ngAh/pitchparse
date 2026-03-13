import api from "@/lib/api-client";
import type { PromptTemplateResponse } from "@/types/api";

export async function getActivePrompt(slug: string): Promise<PromptTemplateResponse> {
  return api.get(`api/prompts/${slug}`).json<PromptTemplateResponse>();
}

export async function getPromptVersions(slug: string): Promise<PromptTemplateResponse[]> {
  return api.get(`api/prompts/${slug}/versions`).json<PromptTemplateResponse[]>();
}

export async function createPromptVersion(
  slug: string,
  body: string,
): Promise<PromptTemplateResponse> {
  return api.post(`api/prompts/${slug}`, { json: { body } }).json<PromptTemplateResponse>();
}

export async function revertPromptVersion(
  slug: string,
  version: number,
): Promise<PromptTemplateResponse> {
  return api
    .post(`api/prompts/${slug}/revert`, { json: { version } })
    .json<PromptTemplateResponse>();
}
