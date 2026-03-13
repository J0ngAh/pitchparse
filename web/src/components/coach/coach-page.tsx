"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConversations, useCreateConversation } from "@/hooks/use-coach";
import { ConversationList } from "@/components/coach/conversation-list";
import { ChatArea } from "@/components/coach/chat-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export function CoachPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const { data: conversations = [] } = useConversations();
  const createConversation = useCreateConversation();

  // Handle ?analysis=<id> param — find or create a scoped conversation
  const analysisParam = searchParams.get("analysis");
  useEffect(() => {
    if (!analysisParam) return;

    // Check if there's already a conversation for this analysis
    const existing = conversations.find((c) => c.analysis_id === analysisParam);
    if (existing) {
      setSelectedId(existing.id);
      router.replace(`/coach?id=${existing.id}`);
      return;
    }

    // Only create if conversations have loaded and no match found
    if (conversations.length >= 0 && !createConversation.isPending) {
      createConversation.mutate(analysisParam, {
        onSuccess: (conv) => {
          setSelectedId(conv.id);
          router.replace(`/coach?id=${conv.id}`);
        },
        onError: () => toast.error("Failed to create coaching session"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisParam, conversations]);

  // Auto-select first conversation if none selected and on desktop
  useEffect(() => {
    if (!selectedId && conversations.length > 0 && !analysisParam && !isMobile) {
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, analysisParam, isMobile]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    router.replace(`/coach?id=${id}`);
  };

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] md:-m-6">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-[280px] shrink-0 border-r border-border bg-card/30">
          <ConversationList selectedId={selectedId} onSelect={handleSelect} />
        </div>
      )}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
          <SheetContent side="left" className="w-[300px] bg-card p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Conversations</SheetTitle>
            </SheetHeader>
            <ConversationList
              selectedId={selectedId}
              onSelect={handleSelect}
              onNavigate={() => setMobileListOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Chat area */}
      <div className="flex-1">
        <ChatArea
          conversationId={selectedId}
          onMenuClick={() => setMobileListOpen(true)}
          showMenuButton={isMobile}
        />
      </div>
    </div>
  );
}
