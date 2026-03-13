"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { listReports, getReport, generateReport } from "@/lib/api/reports";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    staleTime: 30_000,
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: () => getReport(id!),
    enabled: !!id,
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ analysisId, model }: { analysisId: string; model?: string }) =>
      generateReport(analysisId, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}
