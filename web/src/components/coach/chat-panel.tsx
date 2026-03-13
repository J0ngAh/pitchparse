"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversation, useCreateConversation, useSendMessage } from "@/hooks/use-coach";
import type { MessageResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface ChatPanelProps {
  analysisId: string;
}

function MessageBubble({ message }: { message: MessageResponse }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary/20 text-primary" : "bg-violet-500/20 text-violet-400"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-primary/10 text-foreground" : "bg-card border border-border text-foreground"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </motion.div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="max-w-[80%] rounded-2xl border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground">
        <div className="whitespace-pre-wrap">
          {content}
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-violet-400" />
        </div>
      </div>
    </motion.div>
  );
}

export function ChatPanel({ analysisId }: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createConversation = useCreateConversation();
  const { data: conversation } = useConversation(conversationId);
  const { sendMessage, isStreaming, streamingContent } = useSendMessage(conversationId);

  // Auto-create or load existing conversation for this analysis
  useEffect(() => {
    if (conversationId) return;

    // Check if there's an existing conversation for this analysis stored in sessionStorage
    const stored = sessionStorage.getItem(`coach-conv-${analysisId}`);
    if (stored) {
      setConversationId(stored);
      return;
    }

    createConversation.mutate(analysisId, {
      onSuccess: (conv) => {
        setConversationId(conv.id);
        sessionStorage.setItem(`coach-conv-${analysisId}`, conv.id);
      },
      onError: () => {
        toast.error("Failed to start coaching session");
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    await sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const messages = conversation?.messages || [];

  if (createConversation.isPending) {
    return (
      <Card className="flex h-[500px] items-center justify-center border-border bg-card/80">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Starting coaching session...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-[500px] flex-col border-border bg-card/80">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot className="mx-auto mb-3 h-8 w-8 text-violet-400/50" />
              <p className="text-sm font-medium text-muted-foreground">
                Ask me anything about this call
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                I can help with KPI scores, coaching tips, role-play scenarios, and more
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isStreaming && streamingContent && <StreamingBubble content={streamingContent} />}

        {isStreaming && !streamingContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about KPIs, coaching tips, role-play..."
            className="min-h-[40px] max-h-[120px] resize-none border-border bg-background text-sm"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
