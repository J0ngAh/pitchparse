"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listTranscripts,
  getTranscript,
  uploadTranscript,
  transcribeAudio,
  generateSynthetic,
} from "@/lib/api/transcripts";

export function useTranscripts() {
  return useQuery({
    queryKey: ["transcripts"],
    queryFn: listTranscripts,
    staleTime: 30_000,
  });
}

export function useTranscript(id: string | null) {
  return useQuery({
    queryKey: ["transcript", id],
    queryFn: () => getTranscript(id!),
    enabled: !!id,
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });
}

export function useUploadTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      filename,
      body,
      source,
      metadata,
      consultantName,
    }: {
      filename: string;
      body: string;
      source?: string;
      metadata?: Record<string, unknown>;
      consultantName?: string | null;
    }) => uploadTranscript(filename, body, source, metadata, consultantName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    },
  });
}

export function useTranscribeAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => transcribeAudio(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    },
  });
}

export function useGenerateSynthetic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      quality?: string;
      scenario?: string;
      consultant_name?: string;
      prospect_name?: string;
      model?: string;
    }) => generateSynthetic(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    },
  });
}
