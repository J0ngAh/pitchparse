import api from "@/lib/api-client";
import type { TranscriptResponse, TranscriptDetail } from "@/types/api";

export async function listTranscripts(): Promise<TranscriptResponse[]> {
  return api.get("api/transcripts").json<TranscriptResponse[]>();
}

export async function getTranscript(id: string): Promise<TranscriptDetail> {
  return api.get(`api/transcripts/${id}`).json<TranscriptDetail>();
}

export async function uploadTranscript(
  filename: string,
  body: string,
  source = "upload",
  metadata: Record<string, unknown> = {},
  consultantName?: string | null,
): Promise<TranscriptResponse> {
  return api
    .post("api/transcripts", {
      json: {
        filename,
        body,
        source,
        metadata,
        consultant_name: consultantName,
      },
    })
    .json<TranscriptResponse>();
}

export async function transcribeAudio(file: File): Promise<TranscriptResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("api/transcripts/transcribe", { body: formData, timeout: 120000 })
    .json<TranscriptResponse>();
}

export async function generateSynthetic(params: {
  quality?: string;
  scenario?: string;
  consultant_name?: string;
  prospect_name?: string;
  model?: string;
}): Promise<TranscriptResponse> {
  return api
    .post("api/transcripts/generate-synthetic", { json: params })
    .json<TranscriptResponse>();
}
