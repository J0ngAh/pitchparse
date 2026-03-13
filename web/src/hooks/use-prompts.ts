"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActivePrompt,
  getPromptVersions,
  createPromptVersion,
  revertPromptVersion,
} from "@/lib/api/prompts";

export function useActivePrompt(slug: string) {
  return useQuery({
    queryKey: ["prompt", slug],
    queryFn: () => getActivePrompt(slug),
    staleTime: 60_000,
  });
}

export function usePromptVersions(slug: string, enabled = false) {
  return useQuery({
    queryKey: ["prompt-versions", slug],
    queryFn: () => getPromptVersions(slug),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreatePromptVersion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => createPromptVersion(slug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt", slug] });
      queryClient.invalidateQueries({ queryKey: ["prompt-versions", slug] });
    },
  });
}

export function useRevertPromptVersion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => revertPromptVersion(slug, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt", slug] });
      queryClient.invalidateQueries({ queryKey: ["prompt-versions", slug] });
    },
  });
}
