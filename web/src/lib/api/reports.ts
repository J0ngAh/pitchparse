import api from "@/lib/api-client";
import type { ReportResponse, ReportDetail } from "@/types/api";

export async function listReports(): Promise<ReportResponse[]> {
  return api.get("api/reports").json<ReportResponse[]>();
}

export async function getReport(id: string): Promise<ReportDetail> {
  return api.get(`api/reports/${id}`).json<ReportDetail>();
}

export async function generateReport(
  analysisId: string,
  model = "claude-sonnet-4-6",
): Promise<ReportResponse> {
  return api
    .post("api/reports", {
      json: { analysis_id: analysisId, model },
    })
    .json<ReportResponse>();
}
