"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type StatusPayload = {
  status: string;
  overall_score?: number | null;
  rating?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

/**
 * Subscribe to realtime status changes on a Supabase table row.
 * Replaces polling with instant push notifications.
 */
function useRealtimeStatus(
  table: string,
  id: string | null,
  queryKeyPrefix: string,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<StatusPayload | null>(null);

  useEffect(() => {
    if (!id) return;

    // Set the auth token so RLS policies apply to the realtime subscription
    if (accessToken) {
      supabase.realtime.setAuth(accessToken);
    }

    const channel = supabase
      .channel(`${table}-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as StatusPayload;
          // Some tables (e.g. transcripts) store status in metadata.status instead of a top-level column
          const effectiveStatus = row.status || (row.metadata?.status as string) || "";
          const normalized: StatusPayload = { ...row, status: effectiveStatus };
          setData(normalized);

          if (effectiveStatus === "complete") {
            queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
            onComplete?.();
          } else if (effectiveStatus === "failed") {
            const errorMsg =
              row.error_message || (row.metadata?.error as string) || `${table} operation failed`;
            onFailed?.(errorMsg);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, table, queryKeyPrefix, accessToken, queryClient, onComplete, onFailed]);

  return data;
}

export function useAnalysisRealtime(
  analysisId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  return useRealtimeStatus("analyses", analysisId, "analyses", onComplete, onFailed);
}

export function useReportRealtime(
  reportId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  return useRealtimeStatus("reports", reportId, "reports", onComplete, onFailed);
}

export function useTranscriptRealtime(
  transcriptId: string | null,
  onComplete?: () => void,
  onFailed?: (error: string) => void,
) {
  return useRealtimeStatus("transcripts", transcriptId, "transcripts", onComplete, onFailed);
}
