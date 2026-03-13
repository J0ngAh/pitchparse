"use client";

import { useState } from "react";
import { useReports, useReport } from "@/hooks/use-reports";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonTable } from "@/components/shared/skeleton-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileBarChart, Download, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ReportsPage() {
  const { data: reports, isLoading } = useReports();
  const searchParams = useSearchParams();
  const preselectedView = searchParams.get("view");

  const [viewId, setViewId] = useState<string | null>(preselectedView);
  const { data: detail } = useReport(viewId);

  const handleDownload = (body: string, id: string) => {
    const blob = new Blob([body], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" />
        <SkeletonTable />
      </div>
    );
  }

  const completedReports = (reports || []).filter(
    (r) => (r.metadata as Record<string, unknown>)?.status === "complete",
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Browse generated coaching reports" />

      {!completedReports.length ? (
        <EmptyState
          icon={FileBarChart}
          title="No reports yet"
          description="Generate a coaching report from a Call Detail page."
        />
      ) : (
        <div className="space-y-2">
          {completedReports.map((r) => (
            <Card
              key={r.id}
              className="border-border/50 bg-card/50 transition-colors hover:bg-card/70"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileBarChart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Report for analysis {r.analysis_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status="complete" />
                  <Button variant="ghost" size="sm" onClick={() => setViewId(r.id)}>
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report viewer dialog */}
      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/50 px-6 py-4">
            <DialogTitle>Coaching Report</DialogTitle>
            {detail?.body && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(detail.body, detail.id)}
              >
                <Download className="mr-1 h-3 w-3" />
                Download HTML
              </Button>
            )}
          </DialogHeader>
          {detail?.body ? (
            <iframe
              srcDoc={detail.body}
              sandbox="allow-same-origin"
              className="h-[70vh] w-full"
              title="Coaching Report"
            />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
