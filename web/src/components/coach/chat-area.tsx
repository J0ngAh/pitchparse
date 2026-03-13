"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversation, useSendMessage } from "@/hooks/use-coach";
import { MessageBubble, StreamingBubble, TypingIndicator } from "@/components/coach/chat-message";
import { SuggestedPrompts } from "@/components/coach/suggested-prompts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, Menu, ExternalLink } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";

interface ChatAreaProps {
  conversationId: string | null;
  onMenuClick: () => void;
  showMenuButton: boolean;
}

export function ChatArea({ conversationId, onMenuClick, showMenuButton }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useConversation(conversationId);
  const { sendMessage, isStreaming, streamingContent } = useSendMessage(conversationId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingContent]);

  const handleSend = useCallback(
    async (content?: string) => {
      const text = content || input.trim();
      if (!text || isStreaming) return;

      if (!content) setInput("");
      await sendMessage(text);
    },
    [input, isStreaming, sendMessage],
  );

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

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Bot className="mx-auto mb-4 h-12 w-12 text-violet-400/30" />
          <p className="font-display text-lg font-semibold text-muted-foreground">
            Select or start a conversation
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Choose from the sidebar or create a new coaching session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {showMenuButton && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold">
            {conversation?.title || "Loading..."}
          </h2>
        </div>
        {conversation?.analysis_id && (
          <Link
            href={`/calls/${conversation.analysis_id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            View Call
          </Link>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-12">
              <Bot className="mb-4 h-10 w-10 text-violet-400/40" />
              <p className="mb-1 font-display text-sm font-semibold text-muted-foreground">
                How can I help you today?
              </p>
              <p className="mb-6 text-xs text-muted-foreground/70">
                {conversation?.analysis_id
                  ? "Ask me about this call's performance, scores, or coaching tips"
                  : "Ask about your team's performance, trends, or general sales coaching"}
              </p>
              <SuggestedPrompts
                analysisId={conversation?.analysis_id || null}
                onSelect={(prompt) => handleSend(prompt)}
              />
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {isStreaming && streamingContent && <StreamingBubble content={streamingContent} />}
          {isStreaming && !streamingContent && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about performance, coaching tips, comparisons..."
            className="min-h-[40px] max-h-[120px] resize-none border-border bg-background text-sm"
            rows={1}
            disabled={isStreaming || !conversationId}
          />
          <Button
            onClick={() => handleSend()}
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
    </div>
  );
}
