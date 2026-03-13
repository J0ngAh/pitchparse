"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCallback } from "react";

export function useOrgSwitch() {
  const queryClient = useQueryClient();
  const setViewingOrg = useAuthStore((s) => s.setViewingOrg);

  const switchOrg = useCallback(
    (orgId: string | null, orgName: string | null) => {
      setViewingOrg(orgId, orgName);
      queryClient.invalidateQueries();
    },
    [queryClient, setViewingOrg],
  );

  return { switchOrg };
}
