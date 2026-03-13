"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Users, UserPlus, Mail, Trash2, Shield, Crown, X, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SkeletonTable } from "@/components/shared/skeleton-card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuthStore } from "@/stores/auth-store";
import {
  getTeamMembers,
  getTeamInvitations,
  inviteTeamMember,
  revokeInvitation,
  updateMemberRole,
  removeMember,
} from "@/lib/api/team";
import type { UserRole } from "@/types/api";

// ---------- Invite form schema ----------

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["user", "manager"], {
    message: "Please select a role",
  }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// ---------- Role badge ----------

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    manager: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
    user: "bg-muted text-muted-foreground border border-border",
  };

  const icons: Record<string, React.ReactNode> = {
    admin: <Crown className="mr-1 h-3 w-3" />,
    manager: <Shield className="mr-1 h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role] || styles.user}`}
    >
      {icons[role]}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

// ---------- Page ----------

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { userId, role: currentUserRole } = useAuthStore();

  const canManage = currentUserRole === "admin" || currentUserRole === "manager";

  // --- Queries ---

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["team-invitations"],
    queryFn: getTeamInvitations,
    enabled: canManage,
  });

  // --- Mutations ---

  const inviteMutation = useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: () => {
      toast.success("Invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: () => toast.error("Failed to send invitation"),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: () => toast.error("Failed to revoke invitation"),
  });

  const roleUpdateMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: UserRole }) =>
      updateMemberRole(memberId, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: () => toast.error("Failed to remove member"),
  });

  // --- Invite form ---

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "user" },
  });

  const [inviteRole, setInviteRole] = useState<"user" | "manager">("user");

  const onSubmitInvite = (data: InviteFormData) => {
    inviteMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        setInviteRole("user");
      },
    });
  };

  // --- Loading state ---

  if (membersLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" />
        <SkeletonTable />
        <SkeletonTable />
      </div>
    );
  }

  // --- Role options for a given row ---

  const getRoleOptions = (): UserRole[] => {
    if (currentUserRole === "admin") return ["user", "manager", "admin"];
    if (currentUserRole === "manager") return ["user", "manager"];
    return [];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your organization&apos;s team members and invitations"
      />

      {/* Member List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-sm font-semibold">Members</CardTitle>
              {members && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members || []).map((member, i) => {
                  const isSelf = member.id === userId;
                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="border-b border-border transition-colors hover:bg-accent/50"
                    >
                      <TableCell className="font-medium">
                        {member.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              roleUpdateMutation.mutate({
                                memberId: member.id,
                                role: value as UserRole,
                              })
                            }
                            disabled={roleUpdateMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getRoleOptions().map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                              onClick={() => removeMutation.mutate(member.id)}
                              disabled={removeMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite Form — managers and admins only */}
      {canManage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <Card className="border-border bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-sm font-semibold">Invite Member</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmitInvite)} className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-rose-400">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="w-36 space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => {
                      const role = value as "user" | "manager";
                      setInviteRole(role);
                      form.setValue("role", role);
                    }}
                  >
                    <SelectTrigger id="invite-role" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-xs text-rose-400">{form.formState.errors.role.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pending Invitations — managers and admins only */}
      {canManage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="border-border bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-violet-400" />
                <CardTitle className="font-display text-sm font-semibold">
                  Pending Invitations
                </CardTitle>
                {invitations && invitations.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {invitations.length} pending
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading invitations...</span>
                </div>
              ) : !invitations || invitations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No pending invitations
                </p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((inv, i) => (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
                          <Mail className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RoleBadge role={inv.role} />
                            <span>Invited {new Date(inv.created_at).toLocaleDateString()}</span>
                            <span>&middot;</span>
                            <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                        onClick={() => revokeMutation.mutate(inv.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
