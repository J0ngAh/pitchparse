"use client";

import { useQuery } from "@tanstack/react-query";
import { useAnalyses } from "@/hooks/use-analyses";
import { getDashboardStats } from "@/lib/api/dashboard";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/cards/metric-card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/shared/skeleton-card";
import { WaveformBg } from "@/components/effects/waveform-bg";
import dynamic from "next/dynamic";
import { staggerContainer, staggerChild, fadeIn, VIEWPORT } from "@/lib/motion";

const ScoreDistribution = dynamic(
  () =>
    import("@/components/charts/score-distribution").then((m) => ({
      default: m.ScoreDistribution,
    })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
const ConsultantComparison = dynamic(
  () =>
    import("@/components/charts/consultant-comparison").then((m) => ({
      default: m.ConsultantComparison,
    })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
const KpiHeatmap = dynamic(
  () => import("@/components/charts/kpi-heatmap").then((m) => ({ default: m.KpiHeatmap })),
  { ssr: false, loading: () => <SkeletonChart /> },
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Target,
  AlertTriangle,
  TrendingUp,
  Trophy,
  Clock,
  ArrowRight,
  Zap,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import type { AnalysisResponse } from "@/types/api";

const ROLE_HEADERS: Record<string, { title: string; description: string }> = {
  user: { title: "Your Calls", description: "Overview of your analyzed sales calls" },
  manager: { title: "Team Overview", description: "Manager overview of all team calls" },
  admin: { title: "System Overview", description: "Admin overview across all organizations" },
};

const containerVariants = staggerContainer();
const childVariants = staggerChild();

export default function DashboardPage() {
  const role = useAuthStore((s) => s.role);
  const { data: analyses, isLoading } = useAnalyses();
  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });

  const completed = useMemo(
    () => (analyses || []).filter((a) => a.status === "complete" && a.overall_score != null),
    [analyses],
  );

  const highPerformerPct = useMemo(() => {
    if (!dashboardStats?.score_distribution?.length) return 0;
    const total = dashboardStats.score_distribution.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return 0;
    const highCount = dashboardStats.score_distribution
      .filter((d) => {
        const match = d.range.match(/(\d+)/);
        return match && parseInt(match[1]) >= 75;
      })
      .reduce((sum, d) => sum + d.count, 0);
    return Math.round((highCount / total) * 100);
  }, [dashboardStats]);

  const stats = dashboardStats ?? {
    total_calls: 0,
    avg_score: 0,
    below_60: 0,
    score_distribution: [],
  };

  const critical = useMemo(() => completed.filter((a) => a.overall_score! < 40), [completed]);
  const warning = useMemo(
    () => completed.filter((a) => a.overall_score! >= 40 && a.overall_score! < 60),
    [completed],
  );

  const header = ROLE_HEADERS[role || "user"] ?? ROLE_HEADERS.user;

  const leaderboard = useMemo(() => {
    const byConsultant: Record<string, AnalysisResponse[]> = {};
    for (const a of completed) {
      const name = a.consultant_name || "Unknown";
      if (!byConsultant[name]) byConsultant[name] = [];
      byConsultant[name].push(a);
    }
    return Object.entries(byConsultant)
      .map(([name, calls]) => {
        const scores = calls.map((c) => c.overall_score!);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        return {
          name,
          calls: calls.length,
          avg,
          best: Math.max(...scores),
          worst: Math.min(...scores),
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [completed]);

  const recentCalls = useMemo(
    () =>
      [...completed]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [completed],
  );

  if (isLoading || isStatsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={header.title} />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable />
      </div>
    );
  }

  if (!completed.length) {
    return (
      <div className="space-y-6">
        <PageHeader title={header.title} />
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-violet-500/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold">Welcome to PitchParse</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Start by uploading a sales call transcript or generating a synthetic one. We&apos;ll
              analyze it and give you actionable coaching insights.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/analyze">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Search className="mr-2 h-4 w-4" />
                  Analyze a Call
                </Button>
              </Link>
              <Link href="/analyze?tab=synthetic">
                <Button variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Test Data
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero section with waveform */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <WaveformBg height={120} barCount={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Signal Active</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{header.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{header.description}</p>
        </div>
      </div>

      {/* Alert banners */}
      {critical.length > 0 && (
        <motion.div
          {...fadeIn()}
          className="rounded-xl border border-rose-500/30 border-pulse bg-rose-500/8 p-4"
        >
          <p className="text-sm font-medium text-rose-400">
            Critical calls requiring immediate attention:{" "}
            {critical
              .map((a) => `${a.consultant_name || "Unknown"} (${a.overall_score})`)
              .join(", ")}
          </p>
        </motion.div>
      )}
      {warning.length > 0 && (
        <motion.div
          {...fadeIn(0.1)}
          className="rounded-xl border border-amber-500/30 border-pulse bg-amber-500/8 p-4"
        >
          <p className="text-sm font-medium text-amber-400">
            Calls below 60:{" "}
            {warning
              .map((a) => `${a.consultant_name || "Unknown"} (${a.overall_score})`)
              .join(", ")}
          </p>
        </motion.div>
      )}

      {/* Metric cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        {[
          { value: stats.total_calls, label: "Total Calls", icon: Phone, color: "violet" as const },
          { value: stats.avg_score, label: "Avg Score", icon: Target, color: "signal" as const },
          {
            value: stats.below_60,
            label: "Below 60",
            icon: AlertTriangle,
            color: stats.below_60 > 0 ? ("rose" as const) : ("emerald" as const),
          },
          {
            value: highPerformerPct,
            label: "High Performers",
            icon: TrendingUp,
            color: "emerald" as const,
            suffix: "%",
          },
        ].map((card) => (
          <motion.div key={card.label} variants={childVariants}>
            <MetricCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-2" {...fadeIn(0.1)}>
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistribution analyses={completed} />
          </CardContent>
        </Card>
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
              Average Score by Consultant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultantComparison analyses={completed} />
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI Heatmap */}
      <motion.div {...fadeIn(0.15)}>
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-semibold text-muted-foreground">
              KPI Heatmap by Consultant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KpiHeatmap analyses={completed} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <CardTitle className="font-display text-sm font-semibold">
              Consultant Leaderboard
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead className="text-center">Calls</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">Best</TableHead>
                <TableHead className="text-center">Worst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((row, i) => (
                <motion.tr
                  key={row.name}
                  {...fadeIn(0.05 * i)}
                  className="border-b border-border transition-colors hover:bg-accent/50"
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-center font-mono">{row.calls}</TableCell>
                  <TableCell className="text-center">
                    <ScoreBadge score={row.avg} size="sm" />
                  </TableCell>
                  <TableCell className="text-center font-mono text-emerald-400">
                    {row.best}
                  </TableCell>
                  <TableCell className="text-center font-mono text-rose-400">{row.worst}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent calls */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-display text-sm font-semibold">Recent Calls</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentCalls.map((a) => (
            <Link
              key={a.id}
              href={`/calls/${a.id}`}
              className="flex items-center justify-between rounded-xl p-3 transition-all duration-200 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <ScoreBadge score={a.overall_score!} size="sm" />
                <div>
                  <p className="text-sm font-medium">
                    {a.consultant_name || "Unknown"} &rarr; {a.prospect_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.rating} &middot; {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          <div className="pt-2 text-center">
            <Link
              href="/transcripts"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View All &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
