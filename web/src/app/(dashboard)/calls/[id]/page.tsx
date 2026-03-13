"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useAnalysis } from "@/hooks/use-analyses";
import { useReports, useGenerateReport } from "@/hooks/use-reports";
import { useReportRealtime } from "@/hooks/use-realtime";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { CoachingCard } from "@/components/cards/coaching-card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonChart } from "@/components/shared/skeleton-card";

const ScoreGauge = dynamic(
  () => import("@/components/charts/score-gauge").then((m) => ({ default: m.ScoreGauge })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
const KpiRadar = dynamic(
  () => import("@/components/charts/kpi-radar").then((m) => ({ default: m.KpiRadar })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
const SentimentTrajectory = dynamic(
  () =>
    import("@/components/charts/sentiment-trajectory").then((m) => ({
      default: m.SentimentTrajectory,
    })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
import { WaveformRail } from "@/components/journey/waveform-rail";
import { PhaseTimeline } from "@/components/journey/phase-timeline";
import { ChatPanel } from "@/components/coach/chat-panel";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MODEL_OPTIONS, getScoreColor } from "@/lib/constants";
import { toast } from "sonner";
import {
  BarChart3,
  Clock,
  Lightbulb,
  FileBarChart,
  ChevronDown,
  Loader2,
  Sparkles,
  MessageSquare,
  MessageCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: analysis, isLoading } = useAnalysis(id);
  const { data: reports } = useReports();
  const generateReport = useGenerateReport();

  const [reportModel, setReportModel] = useState("claude-sonnet-4-6");
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  // Report realtime subscription
  const reportRealtimeData = useReportRealtime(
    pendingReportId,
    useCallback(() => {
      toast.success("Report generated!");
      setPendingReportId(null);
    }, []),
    useCallback((error: string) => {
      toast.error(error);
      setPendingReportId(null);
    }, []),
  );

  const existingReport = useMemo(
    () =>
      reports?.find(
        (r) =>
          r.analysis_id === id && (r.metadata as Record<string, unknown>)?.status === "complete",
      ),
    [reports, id],
  );

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport.mutateAsync({
        analysisId: id,
        model: reportModel,
      });
      setPendingReportId(result.id);
      toast.info("Generating report...");
    } catch {
      toast.error("Failed to start report generation");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Call Detail" />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-6">
        <PageHeader title="Call Detail" />
        <EmptyState
          icon={BarChart3}
          title="Analysis not found"
          description="This analysis may have been deleted."
        />
      </div>
    );
  }

  const scorecard = analysis.scorecard || {};
  const phases = analysis.phases || [];
  const coaching = [...(analysis.coaching || [])].sort((a, b) => a.priority - b.priority);
  const sentiment = analysis.sentiment;

  // Extract executive summary from body
  const execMatch = analysis.body?.match(/## Executive Summary\s*\n([\s\S]*?)(?=\n## |$)/);
  const execSummary = execMatch?.[1]?.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Detail"
        description={`${analysis.consultant_name || "Unknown"} → ${analysis.prospect_name || "Unknown"}`}
      />

      {/* Waveform rail — interactive phase navigation */}
      {phases.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-border bg-card/80 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Call Signal
              </span>
            </div>
            <WaveformRail phases={phases} />
          </Card>
        </motion.div>
      )}

      {/* Hero section — Score gauge + Executive summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="flex items-center justify-center border-border bg-card/80 p-6">
            <ScoreGauge score={analysis.overall_score || 0} />
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-border bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-sm font-semibold">
                  Executive Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {execSummary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{execSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No executive summary available.</p>
              )}
              <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
                <span>Model: {analysis.model_used}</span>
                <span>
                  Analyzed:{" "}
                  {analysis.completed_at ? new Date(analysis.completed_at).toLocaleString() : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabbed sections */}
      <Tabs defaultValue="kpi">
        <TabsList>
          <TabsTrigger value="kpi">
            <BarChart3 className="mr-1.5 h-3 w-3" />
            KPI Scores
          </TabsTrigger>
          <TabsTrigger value="phases">
            <Clock className="mr-1.5 h-3 w-3" />
            Phases
          </TabsTrigger>
          <TabsTrigger value="coaching">
            <Lightbulb className="mr-1.5 h-3 w-3" />
            Coaching
          </TabsTrigger>
          <TabsTrigger value="report">
            <FileBarChart className="mr-1.5 h-3 w-3" />
            Report
          </TabsTrigger>
          <TabsTrigger value="coach">
            <MessageCircle className="mr-1.5 h-3 w-3" />
            Coach
          </TabsTrigger>
        </TabsList>

        {/* KPI tab */}
        <TabsContent value="kpi" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
                  KPI Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KpiRadar scorecard={scorecard} type="kpi" />
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
                  BANT Qualification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KpiRadar scorecard={scorecard} type="bant" />
              </CardContent>
            </Card>
          </div>

          {/* Detailed scorecard */}
          <Card className="border-border bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-semibold">
                Detailed Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(scorecard).map(([kpi, data]) => (
                <Collapsible key={kpi}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <ScoreBadge score={data.score} size="sm" />
                      <span className="text-sm font-medium">{kpi}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {data.score}/5
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div
                      className="mx-3 mb-3 rounded-xl border-l-4 bg-accent/30 p-3 text-sm leading-relaxed"
                      style={{
                        borderColor: getScoreColor(data.score * 20),
                      }}
                    >
                      {data.evidence}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phases tab — with interactive timeline */}
        <TabsContent value="phases" className="space-y-4">
          {phases.length > 0 ? (
            <>
              {/* Interactive Phase Journey Timeline */}
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
                    Phase Journey
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PhaseTimeline phases={phases} />
                </CardContent>
              </Card>

              {/* Phase Score Trajectory chart */}
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
                    Phase Score Trajectory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SentimentTrajectory phases={phases} />
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={Clock}
              title="No phase data"
              description="Phase breakdown was not found in this analysis."
            />
          )}

          {/* Sentiment */}
          {sentiment && (
            <Card className="border-border bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="font-display text-sm font-semibold">
                    Sentiment Analysis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sentiment.trajectory && (
                  <p>
                    <span className="font-medium">Trajectory:</span> {sentiment.trajectory}
                  </p>
                )}
                {sentiment.inflections?.map((inf, i) => (
                  <p key={i} className="text-muted-foreground">
                    <span className="font-mono text-xs text-primary">[{inf.timestamp}]</span>{" "}
                    {inf.label}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Coaching tab */}
        <TabsContent value="coaching" className="space-y-4">
          {coaching.length > 0 ? (
            coaching.map((rec, i) => (
              <motion.div
                key={rec.priority}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-lg border-l-4 ${
                  rec.priority === 1
                    ? "border-l-rose-500"
                    : rec.priority === 2
                      ? "border-l-amber-500"
                      : "border-l-border"
                }`}
              >
                <CoachingCard coaching={rec} />
              </motion.div>
            ))
          ) : (
            <EmptyState
              icon={Lightbulb}
              title="No coaching data"
              description="Coaching recommendations were not found in this analysis."
            />
          )}
        </TabsContent>

        {/* Report tab */}
        <TabsContent value="report" className="space-y-4">
          {pendingReportId ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-4 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-primary">Generating report...</p>
                  <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds</p>
                </div>
                <StatusBadge
                  status={
                    ((reportRealtimeData?.metadata as Record<string, unknown>)?.status as string) ||
                    "pending"
                  }
                  className="ml-auto"
                />
              </CardContent>
            </Card>
          ) : existingReport ? (
            <Card className="border-border bg-card/80">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  A report already exists for this analysis.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    window.open(`/reports?view=${existingReport.id}`, "_self");
                  }}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm font-semibold">
                  Generate Coaching Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Creates a formatted HTML coaching report you can share with the consultant.
                </p>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={reportModel}
                    onValueChange={(v) => setReportModel(v || reportModel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label} ({m.cost})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateReport}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={generateReport.isPending}
                >
                  {generateReport.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileBarChart className="mr-2 h-4 w-4" />
                  )}
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Coach tab */}
        <TabsContent value="coach">
          <ChatPanel analysisId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
