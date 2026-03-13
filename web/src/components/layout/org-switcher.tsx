"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgSwitch } from "@/hooks/use-org-switch";
import { getAdminOrgs } from "@/lib/api/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const role = useAuthStore((s) => s.role);
  const orgId = useAuthStore((s) => s.orgId);
  const viewingOrgId = useAuthStore((s) => s.viewingOrgId);
  const { switchOrg } = useOrgSwitch();

  const { data: orgs } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: getAdminOrgs,
    enabled: role === "admin",
    staleTime: 5 * 60 * 1000,
  });

  if (role !== "admin") return null;

  const currentValue = viewingOrgId ?? orgId ?? "";

  if (collapsed) {
    return (
      <div className="flex justify-center p-3 border-b border-sidebar-border">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
    );
  }

  return (
    <div className="border-b border-sidebar-border p-3">
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Viewing Org
      </label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          if (value === orgId) {
            switchOrg(null, null);
          } else {
            const org = orgs?.find((o) => o.id === value);
            switchOrg(value, org?.name ?? null);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs bg-sidebar border-sidebar-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orgs?.map((org) => (
            <SelectItem key={org.id} value={org.id} className="text-xs">
              {org.name}
              {org.id === orgId && " (yours)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
