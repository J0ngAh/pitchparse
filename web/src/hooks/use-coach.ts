"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  streamMessage,
  getCoachPrompt,
  updateCoachPrompt,
} from "@/lib/api/coach";

export function useCoachPrompt() {
  return useQuery({
    queryKey: ["coach-prompt"],
    queryFn: getCoachPrompt,
    staleTime: 60_000,
  });
}

export function useUpdateCoachPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string | null) => updateCoachPrompt(prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-prompt"] });
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (analysisId?: string | null) => createConversation(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage(conversationId: string | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const queryClient = useQueryClient();
  const abortRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || isStreaming) return;

      setIsStreaming(true);
      setStreamingContent("");
      abortRef.current = false;

      await streamMessage(
        conversationId,
        content,
        (delta) => {
          if (!abortRef.current) {
            setStreamingContent((prev) => prev + delta);
          }
        },
        () => {
          setIsStreaming(false);
          setStreamingContent("");
          queryClient.invalidateQueries({
            queryKey: ["conversation", conversationId],
          });
        },
        (error) => {
          setIsStreaming(false);
          setStreamingContent("");
          console.error("Coach stream error:", error);
        },
      );
    },
    [conversationId, isStreaming, queryClient],
  );

  const cancelStream = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  return {
    sendMessage,
    cancelStream,
    isStreaming,
    streamingContent,
  };
}
