import api from "@/lib/api-client";
import type { AnalysisResponse, AnalysisDetail } from "@/types/api";

export async function listAnalyses(): Promise<AnalysisResponse[]> {
  return api.get("api/analyses").json<AnalysisResponse[]>();
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  return api.get(`api/analyses/${id}`).json<AnalysisDetail>();
}

export async function runAnalysis(
  transcriptId: string,
  model = "claude-sonnet-4-6",
  focus?: string | null,
  generateReport = false,
): Promise<AnalysisResponse> {
  return api
    .post("api/analyses", {
      json: {
        transcript_id: transcriptId,
        model,
        focus: focus || undefined,
        generate_report: generateReport,
      },
    })
    .json<AnalysisResponse>();
}
