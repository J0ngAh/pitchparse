"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranscripts, useTranscript } from "@/hooks/use-transcripts";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonTable } from "@/components/shared/skeleton-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Search, ArrowRight } from "lucide-react";

export default function TranscriptsPage() {
  const { data: transcripts, isLoading } = useTranscripts();
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const { data: detail } = useTranscript(viewId);

  const filtered = (transcripts || []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.filename.toLowerCase().includes(q) || (t.consultant_name || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transcripts" />
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcripts"
        description="Browse all uploaded transcripts"
        action={
          <Link href="/analyze">
            <Button variant="outline" size="sm">
              Upload New <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        }
      />

      {!transcripts?.length ? (
        <EmptyState
          icon={FileText}
          title="No transcripts"
          description="Upload a transcript from the Analyze page to get started."
          action={
            <Link href="/analyze">
              <Button variant="outline">Go to Analyze</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename or consultant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((t) => (
              <Card
                key={t.id}
                className="border-border/50 bg-card/50 transition-colors hover:bg-card/70"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.consultant_name || "Unknown consultant"} &middot; {t.source} &middot;{" "}
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.has_analysis ? (
                      <StatusBadge status="complete" />
                    ) : (
                      <StatusBadge status="pending" />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setViewId(t.id)}>
                      View
                    </Button>
                    {!t.has_analysis && (
                      <Link href={`/analyze?transcript=${t.id}`}>
                        <Button variant="outline" size="sm">
                          Analyze
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Transcript detail dialog */}
      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.filename || "Transcript"}</DialogTitle>
          </DialogHeader>
          {detail?.body ? (
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed">
              {detail.body}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
