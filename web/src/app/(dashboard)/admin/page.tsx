"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminStats, getAdminOrgs } from "@/lib/api/admin";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/cards/metric-card";
import { SkeletonCard, SkeletonTable } from "@/components/shared/skeleton-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, BarChart3, FileText } from "lucide-react";
import { motion } from "motion/react";

const planBadgeClasses: Record<string, string> = {
  free: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  starter: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  team: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
  });

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: getAdminOrgs,
  });

  const isLoading = statsLoading || orgsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Admin" description="Cross-organization oversight" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Admin" description="Cross-organization oversight" />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            value: stats?.total_orgs ?? 0,
            label: "Total Orgs",
            icon: Building2,
            color: "signal" as const,
          },
          {
            value: stats?.total_users ?? 0,
            label: "Total Users",
            icon: Users,
            color: "violet" as const,
          },
          {
            value: stats?.total_analyses ?? 0,
            label: "Total Analyses",
            icon: BarChart3,
            color: "emerald" as const,
          },
          {
            value: stats?.total_transcripts ?? 0,
            label: "Total Transcripts",
            icon: FileText,
            color: "rose" as const,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <MetricCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Orgs table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="font-display text-sm font-semibold">Organizations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!orgs?.length ? (
              <EmptyState
                icon={Building2}
                title="No organizations found"
                description="Organizations will appear here once users sign up."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Analyses</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org, i) => (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                      className="border-b border-border transition-colors hover:bg-accent/50"
                    >
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={planBadgeClasses[org.plan] ?? "border-border text-foreground"}
                        >
                          {org.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{org.user_count}</TableCell>
                      <TableCell className="text-center font-mono">{org.analysis_count}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
