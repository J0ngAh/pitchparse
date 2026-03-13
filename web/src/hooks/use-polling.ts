"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getAnalysis } from "@/lib/api/analyses";
import { getReport } from "@/lib/api/reports";
import { getTranscript } from "@/lib/api/transcripts";

export function useAnalysisPolling(
  analysisId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["analysis-poll", analysisId],
    queryFn: () => getAnalysis(analysisId!),
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return 10_000;
    },
  });

  useEffect(() => {
    if (query.data?.status === "complete") {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      onComplete?.();
    } else if (query.data?.status === "failed") {
      onFailed?.(query.data.error_message || "Analysis failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.status, queryClient, onComplete, onFailed]);

  return query;
}

export function useReportPolling(
  reportId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["report-poll", reportId],
    queryFn: () => getReport(reportId!),
    enabled: !!reportId,
    refetchInterval: (query) => {
      const status = (query.state.data?.metadata as Record<string, unknown>)?.status as
        | string
        | undefined;
      if (status === "complete" || status === "failed") return false;
      return 10_000;
    },
  });

  useEffect(() => {
    const status = (query.data?.metadata as Record<string, unknown>)?.status as string | undefined;
    if (status === "complete") {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      onComplete?.();
    } else if (status === "failed") {
      const error =
        ((query.data?.metadata as Record<string, unknown>)?.error as string) ||
        "Report generation failed";
      onFailed?.(error);
    }
  }, [query.data?.metadata, queryClient, onComplete, onFailed]);

  return query;
}

export function useTranscriptPolling(
  transcriptId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["transcript-poll", transcriptId],
    queryFn: () => getTranscript(transcriptId!),
    enabled: !!transcriptId,
    refetchInterval: (query) => {
      const status = (query.state.data?.metadata as Record<string, unknown>)?.status as
        | string
        | undefined;
      if (status === "complete" || status === "failed") return false;
      return 10_000;
    },
  });

  useEffect(() => {
    const status = (query.data?.metadata as Record<string, unknown>)?.status as string | undefined;
    if (status === "complete") {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
      onComplete?.();
    } else if (status === "failed") {
      const error =
        ((query.data?.metadata as Record<string, unknown>)?.error as string) ||
        "Synthetic generation failed";
      onFailed?.(error);
    }
  }, [query.data?.metadata, queryClient, onComplete, onFailed]);

  return query;
}
