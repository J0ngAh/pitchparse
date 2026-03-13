"use client";

import { useState } from "react";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-coach";
import type { ConversationResponse, AnalysisResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { listAnalyses } from "@/lib/api/analyses";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Bot, Search, MoreVertical, Trash2, BarChart3, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNavigate?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onNavigate,
}: {
  conversation: ConversationResponse;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div
      onClick={() => {
        onSelect();
        onNavigate?.();
      }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors",
        isActive ? "border-l-2 border-primary bg-primary/10" : "hover:bg-accent/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{conversation.title}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(conversation.updated_at)}
          </span>
          {conversation.analysis_id && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-400">
              <BarChart3 className="h-2.5 w-2.5" />
              Call
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="h-6 w-6 shrink-0 rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="mx-auto h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ConversationList({ selectedId, onSelect, onNavigate }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: conversations = [] } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const { data: recentAnalyses = [] } = useQuery({
    queryKey: ["analyses-recent"],
    queryFn: () => listAnalyses(),
    staleTime: 30_000,
  });

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = (analysisId?: string) => {
    setNewChatOpen(false);
    createConversation.mutate(analysisId, {
      onSuccess: (conv) => {
        onSelect(conv.id);
        onNavigate?.();
      },
      onError: () => toast.error("Failed to create conversation"),
    });
  };

  const handleDelete = (id: string) => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            onSelect(remaining[0].id);
          }
        }
      },
      onError: () => toast.error("Failed to delete conversation"),
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-semibold">Conversations</h2>
        <Popover open={newChatOpen} onOpenChange={setNewChatOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
          <PopoverContent align="start" className="w-64 p-2">
            <button
              onClick={() => handleCreate()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              General Coaching
            </button>
            {recentAnalyses.length > 0 && (
              <>
                <div className="my-1 border-t border-border" />
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Coach a specific call
                </p>
                {recentAnalyses.slice(0, 5).map((a: AnalysisResponse) => (
                  <button
                    key={a.id}
                    onClick={() => handleCreate(a.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
                    <span className="truncate">
                      {a.consultant_name || "Unknown"} — {a.overall_score ?? "?"}/100
                    </span>
                  </button>
                ))}
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 bg-background pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                {search ? "No matches" : "Start your first coaching session"}
              </p>
              {!search && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => handleCreate()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Chat
                </Button>
              )}
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === selectedId}
                onSelect={() => onSelect(conv.id)}
                onDelete={() => handleDelete(conv.id)}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
