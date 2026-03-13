"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listAnalyses, getAnalysis, runAnalysis } from "@/lib/api/analyses";

export function useAnalyses() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: listAnalyses,
    staleTime: 30_000,
  });
}

export function useAnalysis(id: string | null) {
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });
}

export function useRunAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transcriptId,
      model,
      focus,
      generateReport,
    }: {
      transcriptId: string;
      model?: string;
      focus?: string | null;
      generateReport?: boolean;
    }) => runAnalysis(transcriptId, model, focus, generateReport),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}
