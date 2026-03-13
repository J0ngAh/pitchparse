import api from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ConversationResponse, ConversationDetail } from "@/types/api";

// ---------- Coach Prompt ----------

export interface CoachPromptResponse {
  prompt: string;
  is_custom: boolean;
}

export async function getCoachPrompt(): Promise<CoachPromptResponse> {
  return api.get("api/coach/prompt").json<CoachPromptResponse>();
}

export async function updateCoachPrompt(prompt: string | null): Promise<CoachPromptResponse> {
  return api.put("api/coach/prompt", { json: { prompt } }).json<CoachPromptResponse>();
}

// ---------- Conversations ----------

export async function createConversation(
  analysisId?: string | null,
): Promise<ConversationResponse> {
  return api
    .post("api/coach/conversations", {
      json: { analysis_id: analysisId || undefined },
    })
    .json<ConversationResponse>();
}

export async function listConversations(): Promise<ConversationResponse[]> {
  return api.get("api/coach/conversations").json<ConversationResponse[]>();
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return api.get(`api/coach/conversations/${id}`).json<ConversationDetail>();
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`api/coach/conversations/${id}`);
}

export async function streamMessage(
  conversationId: string,
  content: string,
  onDelta: (text: string) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void,
): Promise<void> {
  const { accessToken, viewingOrgId } = useAuthStore.getState();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (viewingOrgId) {
    headers["X-Admin-Org-Id"] = viewingOrgId;
  }

  const response = await fetch(`${baseUrl}/api/coach/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    onError(errorData?.detail || `Request failed (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response stream available");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const data = JSON.parse(jsonStr);
        if (data.delta) {
          onDelta(data.delta);
        } else if (data.done) {
          onDone(data.message_id);
        } else if (data.error) {
          onError(data.error);
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}
