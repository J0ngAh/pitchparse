"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrgConfig, updateOrgConfig } from "@/lib/api/org";

export function useOrgConfig() {
  return useQuery({
    queryKey: ["org-config"],
    queryFn: getOrgConfig,
    staleTime: 300_000,
  });
}

export function useUpdateOrgConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown>) => updateOrgConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-config"] });
    },
  });
}
