"use client";

import { useQuery } from "@tanstack/react-query";
import { getSubscription } from "@/lib/api/billing";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    staleTime: 300_000,
  });
}
